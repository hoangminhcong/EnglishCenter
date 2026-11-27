import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import test, { after, before } from 'node:test';
import { app } from '../../src/app.js';
import { pool } from '../../src/config/db.js';
import { sessionCookieName } from '../../src/config/env.js';
import { runMigrations } from '../../src/db/migrate.js';
import { hashPassword } from '../../src/shared/utils/crypto.js';

let server: Server;
let baseUrl = '';
let dbReachable = false;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
      }
      resolve();
    });
  });

  if (process.env.DATABASE_URL) {
    try {
      await pool.query('SELECT 1');
      await runMigrations();
      dbReachable = true;
    } catch {
      dbReachable = false;
    }
  }
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end().catch(() => {});
});

test('POST /api/v1/auth/login and /register reject invalid payloads with 422 VALIDATION_ERROR', async () => {
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '   ', password: '' }),
  });

  assert.equal(loginRes.status, 422);
  const loginJson = (await loginRes.json()) as {
    success: boolean;
    error: { code: string; details: Array<{ field: string; message: string }> };
  };
  assert.equal(loginJson.success, false);
  assert.equal(loginJson.error.code, 'VALIDATION_ERROR');
  assert.ok(loginJson.error.details.length >= 1);

  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'A',
      username: 'ab',
      email: 'not-an-email',
      phone: '123',
      password: 'weak',
    }),
  });

  assert.equal(regRes.status, 422);
  const regJson = (await regRes.json()) as {
    success: boolean;
    error: { code: string; details: Array<{ field: string; message: string }> };
  };
  assert.equal(regJson.success, false);
  assert.equal(regJson.error.code, 'VALIDATION_ERROR');
  assert.ok(regJson.error.details.length >= 4);
});

test('GET /api/v1/auth/me returns 401 UNAUTHORIZED when missing session token', async () => {
  const res = await fetch(`${baseUrl}/auth/me`);
  assert.equal(res.status, 401);
  const json = (await res.json()) as { success: boolean; error: { code: string } };
  assert.equal(json.success, false);
  assert.equal(json.error.code, 'UNAUTHORIZED');
});

test('Student Auth E2E flow: register -> duplicate conflict -> login -> me -> portal redirect -> lock -> logout', async (t) => {
  if (!dbReachable) {
    t.skip('PostgreSQL test database is not reachable in isolated network environment');
    return;
  }

  const suffix = randomUUID().slice(0, 8);
  const username = `hv.test.${suffix}`;
  const email = `hv.test.${suffix}@englishcenter.edu.vn`;
  const password = 'TestStudent123';
  const staffUsername = `stf.test.${suffix}`;
  const staffEmail = `stf.test.${suffix}@englishcenter.edu.vn`;
  let createdUserId: string | null = null;
  let createdStaffId: string | null = null;

  try {
    // 1. Register new student
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Học Viên Kiểm Thử',
        username,
        email,
        phone: '0987654321',
        password,
        confirmPassword: password,
      }),
    });

    assert.equal(regRes.status, 201);
    const regBody = (await regRes.json()) as {
      success: boolean;
      data: {
        success: boolean;
        user: {
          id: string;
          username: string;
          accountType: string;
          portal: string;
          role: string;
        };
      };
    };
    assert.equal(regBody.success, true);
    assert.equal(regBody.data.user.username, username);
    assert.equal(regBody.data.user.accountType, 'STUDENT');
    assert.equal(regBody.data.user.portal, 'CLIENT');
    assert.equal(regBody.data.user.role, 'student');
    createdUserId = regBody.data.user.id;

    // 2. Duplicate username returns 409 CONFLICT
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Trùng Tài Khoản',
        username,
        email: `other.${suffix}@englishcenter.edu.vn`,
        phone: '0911222333',
        password,
      }),
    });
    assert.equal(dupRes.status, 409);

    // 3. Wrong password returns 401 UNAUTHORIZED
    const wrongLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, password: 'WrongPassword999' }),
    });
    assert.equal(wrongLoginRes.status, 401);

    // 4. Valid login (using email case-insensitively) issues HttpOnly cookie + session DTO
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email.toUpperCase(), password, rememberMe: true }),
    });
    assert.equal(loginRes.status, 200);

    const setCookie = loginRes.headers.get('set-cookie') ?? '';
    assert.match(setCookie, new RegExp(`${sessionCookieName}=`));
    assert.match(setCookie, /HttpOnly/i);
    const cookiePair = setCookie.split(';')[0] ?? '';

    const loginBody = (await loginRes.json()) as {
      success: boolean;
      data: {
        outcome: string;
        accessToken: string;
        session: {
          accountType: string;
          portal: string;
          role: string;
          defaultLandingRoute: string;
          user: { id: string; username: string; displayName: string; phone: string };
        };
      };
    };
    assert.equal(loginBody.data.outcome, 'AUTHENTICATED');
    assert.equal(loginBody.data.session.accountType, 'STUDENT');
    assert.equal(loginBody.data.session.portal, 'CLIENT');
    assert.equal(loginBody.data.session.defaultLandingRoute, '/student/dashboard');
    assert.equal(loginBody.data.session.user.displayName, 'Học Viên Kiểm Thử');

    // 5. GET /auth/me works with HttpOnly cookie and with Bearer token
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(meRes.status, 200);
    const meBody = (await meRes.json()) as {
      success: boolean;
      data: { user: { id: string; username: string }; accountType: string };
    };
    assert.equal(meBody.data.user.id, createdUserId);
    assert.equal(meBody.data.accountType, 'STUDENT');

    const bearerMeRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${loginBody.data.accessToken}` },
    });
    assert.equal(bearerMeRes.status, 200);

    // 6. Staff account logging in on Student portal receives PORTAL_REDIRECT_REQUIRED
    const staffHash = await hashPassword(password);
    const staffInsert = await pool.query<{ id: string }>(
      `INSERT INTO user_accounts (username, email, password_hash, account_type, status, provisioning_method)
       VALUES ($1, $2, $3, 'STAFF', 'ACTIVE', 'TEMPORARY_PASSWORD')
       RETURNING id`,
      [staffUsername, staffEmail, staffHash],
    );
    createdStaffId = staffInsert.rows[0]?.id ?? null;

    const staffLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: staffUsername, password }),
    });
    assert.equal(staffLoginRes.status, 200);
    const staffLoginBody = (await staffLoginRes.json()) as {
      data: { outcome: string; accountType: string; targetPortal: string };
    };
    assert.equal(staffLoginBody.data.outcome, 'PORTAL_REDIRECT_REQUIRED');
    assert.equal(staffLoginBody.data.targetPortal, 'STAFF');

    // 7. Logout revokes session in DB -> /auth/me returns 401
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogoutMe = await fetch(`${baseUrl}/auth/me`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(afterLogoutMe.status, 401);

    // 8. Locked student cannot login (403 FORBIDDEN)
    await pool.query("UPDATE user_accounts SET status = 'LOCKED' WHERE id = $1", [createdUserId]);
    const lockedRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, password }),
    });
    assert.equal(lockedRes.status, 403);
  } finally {
    if (createdUserId) {
      await pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [createdUserId]);
      await pool.query('DELETE FROM user_role_assignments WHERE user_id = $1', [createdUserId]);
      await pool.query('DELETE FROM student_profiles WHERE user_id = $1', [createdUserId]);
      await pool.query('DELETE FROM user_accounts WHERE id = $1', [createdUserId]);
    }
    if (createdStaffId) {
      await pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [createdStaffId]);
      await pool.query('DELETE FROM user_accounts WHERE id = $1', [createdStaffId]);
    }
  }
});
