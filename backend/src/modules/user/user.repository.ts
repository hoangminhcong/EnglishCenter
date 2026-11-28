import { randomInt } from 'node:crypto';
import { pool, type DbClient } from '../../config/db.js';
import type { AccountStatus, AccountType, RoleCode } from '../../shared/constants/roles.js';
import type { CreateStudentInput, UserIdentityRecord } from './user.schema.js';

type RawIdentityRow = {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  account_type: AccountType;
  status: AccountStatus;
  must_change_password: boolean;
  is_active: boolean;
  display_name: string;
  phone: string;
  avatar_url: string | null;
  role_code: RoleCode | null;
  student_profile_id: string | null;
  student_code: string | null;
  created_at: Date;
  last_login_at: Date | null;
};

const BASE_IDENTITY_SELECT = `
  SELECT
    ua.id,
    ua.username,
    ua.email,
    ua.password_hash,
    ua.account_type,
    ua.status,
    ua.must_change_password,
    ua.is_active,
    COALESCE(sp.full_name, ep.full_name, ua.username) AS display_name,
    COALESCE(sp.phone, ep.phone, '') AS phone,
    sp.avatar_url,
    r.code AS role_code,
    sp.id AS student_profile_id,
    sp.student_code,
    ua.created_at,
    ua.last_login_at
  FROM user_accounts ua
  LEFT JOIN student_profiles sp
    ON sp.user_id = ua.id AND sp.deleted_at IS NULL
  LEFT JOIN employee_profiles ep
    ON ep.user_id = ua.id AND ep.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT r_inner.code
    FROM user_role_assignments ura
    JOIN roles r_inner ON r_inner.id = ura.role_id
    WHERE ura.user_id = ua.id AND ura.is_active = true
    ORDER BY ura.created_at ASC
    LIMIT 1
  ) r ON true
`;

function mapIdentityRow(row: RawIdentityRow): UserIdentityRecord {
  const defaultRole: RoleCode = row.account_type === 'STUDENT' ? 'STUDENT' : 'SALES';
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    accountType: row.account_type,
    status: row.status,
    mustChangePassword: row.must_change_password,
    isActive: row.is_active,
    displayName: row.display_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role_code ?? defaultRole,
    studentProfileId: row.student_profile_id,
    studentCode: row.student_code,
    createdAt: row.created_at.toISOString(),
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
  };
}

export async function findIdentityByIdentifier(
  identifier: string,
  db: DbClient = pool,
): Promise<UserIdentityRecord | null> {
  const res = await db.query<RawIdentityRow>(
    `${BASE_IDENTITY_SELECT}
     WHERE ua.deleted_at IS NULL
       AND (LOWER(ua.username) = LOWER($1) OR LOWER(ua.email) = LOWER($1))
     LIMIT 1`,
    [identifier],
  );
  const row = res.rows[0];
  return row ? mapIdentityRow(row) : null;
}

export async function findIdentityById(
  userId: string,
  db: DbClient = pool,
): Promise<UserIdentityRecord | null> {
  const res = await db.query<RawIdentityRow>(
    `${BASE_IDENTITY_SELECT}
     WHERE ua.id = $1 AND ua.deleted_at IS NULL
     LIMIT 1`,
    [userId],
  );
  const row = res.rows[0];
  return row ? mapIdentityRow(row) : null;
}

export async function existsByUsername(
  username: string,
  db: DbClient = pool,
): Promise<boolean> {
  const res = await db.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM user_accounts WHERE LOWER(username) = LOWER($1)) AS exists',
    [username],
  );
  return Boolean(res.rows[0]?.exists);
}

export async function existsByEmail(
  email: string,
  db: DbClient = pool,
): Promise<boolean> {
  const res = await db.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM user_accounts WHERE LOWER(email) = LOWER($1)) AS exists',
    [email],
  );
  return Boolean(res.rows[0]?.exists);
}

export async function ensureDefaultStudentPrerequisites(
  db: DbClient = pool,
): Promise<{ branchId: string; studentRoleId: string }> {
  let branchRes = await db.query<{ id: string }>(
    `SELECT id FROM branches
     WHERE is_active = true AND deleted_at IS NULL
     ORDER BY (CASE WHEN study_mode = 'ONLINE' THEN 0 ELSE 1 END), display_order ASC
     LIMIT 1`,
  );

  if (!branchRes.rows[0]) {
    branchRes = await db.query<{ id: string }>(
      `INSERT INTO branches (code, name, short_label, address, district, city, phone, study_mode, display_order)
       VALUES ('toeic-online', 'Cơ sở Trực tuyến (TOEIC Online)', 'TOEIC Online', 'Học trực tuyến qua nền tảng số', 'Trực tuyến', 'Toàn quốc', '0900000000', 'ONLINE', 0)
       ON CONFLICT (code) DO UPDATE SET is_active = true
       RETURNING id`,
    );
  }

  let roleRes = await db.query<{ id: string }>(
    `SELECT id FROM roles WHERE code = 'STUDENT' LIMIT 1`,
  );

  if (!roleRes.rows[0]) {
    roleRes = await db.query<{ id: string }>(
      `INSERT INTO roles (code, name, portal_type, description, is_system)
       VALUES ('STUDENT', 'Học viên', 'CLIENT', 'Vai trò mặc định cho học viên trên Client Web', true)
       ON CONFLICT (code) DO UPDATE SET is_active = true
       RETURNING id`,
    );
  }

  const branchId = branchRes.rows[0]?.id;
  const studentRoleId = roleRes.rows[0]?.id;
  if (!branchId || !studentRoleId) {
    throw new Error('Failed to resolve default student branch and role');
  }

  return { branchId, studentRoleId };
}

function generateStudentCode(): string {
  const year = new Date().getUTCFullYear();
  const suffix = String(randomInt(100000, 999999));
  return `HV-${year}-${suffix}`;
}

export async function insertStudentAccountBundle(
  input: CreateStudentInput,
  prereqs: { branchId: string; studentRoleId: string },
  db: DbClient = pool,
): Promise<string> {
  const userRes = await db.query<{ id: string }>(
    `INSERT INTO user_accounts (
       username,
       email,
       password_hash,
       account_type,
       status,
       provisioning_method,
       must_change_password
     )
     VALUES ($1, $2, $3, 'STUDENT', 'ACTIVE', 'SELF_REGISTER', false)
     RETURNING id`,
    [input.username, input.email, input.passwordHash],
  );

  const userId = userRes.rows[0]?.id;
  if (!userId) {
    throw new Error('Failed to insert student user_accounts row');
  }

  const studentCode = generateStudentCode();
  await db.query(
    `INSERT INTO student_profiles (
       user_id,
       student_code,
       full_name,
       phone,
       email,
       branch_id,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, 'WAITING_PLACEMENT')`,
    [userId, studentCode, input.fullName, input.phone, input.email, prereqs.branchId],
  );

  await db.query(
    `INSERT INTO user_role_assignments (user_id, role_id, scope_type)
     VALUES ($1, $2, 'OWN')`,
    [userId, prereqs.studentRoleId],
  );

  return userId;
}

export async function updateLastLoginAt(
  userId: string,
  db: DbClient = pool,
): Promise<string> {
  const res = await db.query<{ last_login_at: Date }>(
    `UPDATE user_accounts
     SET last_login_at = now()
     WHERE id = $1
     RETURNING last_login_at`,
    [userId],
  );
  return (res.rows[0]?.last_login_at ?? new Date()).toISOString();
}
