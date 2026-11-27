import { pool, type DbClient } from '../../config/db.js';

export type InsertSessionParams = {
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
};

export type ActiveSessionRow = {
  sessionId: string;
  userId: string;
  expiresAt: Date;
};

export async function insertSession(
  params: InsertSessionParams,
  db: DbClient = pool,
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `INSERT INTO auth_sessions (user_id, token_hash, token_type, ip_address, user_agent, expires_at)
     VALUES ($1, $2, 'SESSION', $3, $4, $5)
     RETURNING id`,
    [
      params.userId,
      params.tokenHash,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      params.expiresAt,
    ],
  );
  const id = res.rows[0]?.id;
  if (!id) {
    throw new Error('Failed to create auth session');
  }
  return id;
}

export async function findValidSessionByTokenHash(
  tokenHash: string,
  db: DbClient = pool,
): Promise<ActiveSessionRow | null> {
  const res = await db.query<{ id: string; user_id: string; expires_at: Date }>(
    `SELECT id, user_id, expires_at
     FROM auth_sessions
     WHERE token_hash = $1
       AND token_type = 'SESSION'
       AND revoked_at IS NULL
       AND expires_at > now()
     LIMIT 1`,
    [tokenHash],
  );
  const row = res.rows[0];
  if (!row) {
    return null;
  }
  return {
    sessionId: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
  };
}

export async function revokeSessionByTokenHash(
  tokenHash: string,
  db: DbClient = pool,
): Promise<void> {
  await db.query(
    `UPDATE auth_sessions
     SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash],
  );
}
