import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const DB_DIR = path.join(import.meta.dirname, '..', '..', 'src', 'db');
const MIGRATIONS_DIR = path.join(DB_DIR, 'migrations');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');

test('schema.sql stays synchronized with all numbered SQL migrations and obeys DB rules', async () => {
  const schemaSql = await readFile(SCHEMA_PATH, 'utf8');
  const migrationFiles = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  assert.equal(migrationFiles.length, 5, 'Expected 5 migration files (001..005)');

  for (const file of migrationFiles) {
    const content = (await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')).trim();
    assert.ok(
      schemaSql.includes(content),
      `schema.sql is out of sync with migration ${file}`,
    );
  }

  const tableMatches = [...schemaSql.matchAll(/^CREATE TABLE\s+([a-z0-9_]+)\s*\(/gm)];
  const tableNames = tableMatches.map((m) => m[1]);
  assert.equal(tableNames.length, 64, `Expected 64 domain tables, found ${tableNames.length}`);

  assert.equal(
    /\b(FLOAT|DOUBLE\s+PRECISION|REAL)\b/i.test(schemaSql),
    false,
    'Floating-point types are forbidden by DB conventions',
  );

  for (const tableBlock of schemaSql.split(/^CREATE TABLE\s+/gm).slice(1)) {
    const tableDef = tableBlock.split(/\);\r?\n/)[0] ?? '';
    const tableName = tableDef.split(/\s+/)[0] ?? 'unknown';
    assert.match(
      tableDef,
      /id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/,
      `Table ${tableName} must use UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
    );
    assert.match(
      tableDef,
      /created_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)/,
      `Table ${tableName} must include created_at TIMESTAMPTZ`,
    );
    assert.match(
      tableDef,
      /updated_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)/,
      `Table ${tableName} must include updated_at TIMESTAMPTZ`,
    );
  }
});
