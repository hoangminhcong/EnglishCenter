import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool, requireDatabaseUrl } from '../config/db.js';

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS _migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function runMigrations(): Promise<string[]> {
  requireDatabaseUrl();
  await ensureMigrationsTable();

  const entries = await readdir(MIGRATIONS_DIR);
  const sqlFiles = entries.filter((name) => name.endsWith('.sql')).sort();

  const appliedRes = await pool.query<{ filename: string }>(
    'SELECT filename FROM _migrations ORDER BY filename ASC',
  );
  const appliedSet = new Set(appliedRes.rows.map((row) => row.filename));

  const newlyApplied: string[] = [];

  for (const filename of sqlFiles) {
    if (appliedSet.has(filename)) {
      continue;
    }

    const fullPath = path.join(MIGRATIONS_DIR, filename);
    const sql = await readFile(fullPath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      newlyApplied.push(filename);
      console.log(`[db:migrate] Applied ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}

if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
  try {
    const applied = await runMigrations();
    if (applied.length === 0) {
      console.log('[db:migrate] All migrations are already up to date.');
    } else {
      console.log(`[db:migrate] Done. Applied ${applied.length} migration(s).`);
    }
  } catch (error) {
    console.error('[db:migrate] Failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
