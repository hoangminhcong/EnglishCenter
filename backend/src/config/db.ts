import pg from '../../node_modules/@types/pg/index.js';
import type { Pool as PgPool, PoolClient as PgPoolClient, PoolConfig } from '../../node_modules/@types/pg/index.js';
import { databaseUrl } from './env.js';

export type DbPool = PgPool;
export type DbClient = PgPool | PgPoolClient;

function isLocalDatabaseUrl(connectionString: string): boolean {
  if (!connectionString) {
    return true;
  }
  try {
    const parsed = new URL(connectionString);
    return (
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === 'localhost' ||
      parsed.hostname === '::1'
    );
  } catch {
    return false;
  }
}

function createPoolConfig(connectionString: string): PoolConfig {
  const useSsl = !isLocalDatabaseUrl(connectionString);
  return {
    connectionString: connectionString || undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

export const pool: PgPool = new pg.Pool(createPoolConfig(databaseUrl));

export function requireDatabaseUrl(): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured in environment');
  }
  return databaseUrl;
}
