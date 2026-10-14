import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = join(root, 'src', 'migrations');
const target = process.env.MIGRATION_TARGET;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required.');
}
if (!['development', 'production'].includes(target ?? '')) {
  throw new Error('Set MIGRATION_TARGET=development or MIGRATION_TARGET=production explicitly.');
}
if (target === 'production' && process.env.ALLOW_PRODUCTION_MIGRATIONS !== 'true') {
  throw new Error('Production migrations are blocked unless ALLOW_PRODUCTION_MIGRATIONS=true is explicitly set.');
}
if (target === 'production' && process.env.CONFIRM_PRODUCTION_DATABASE !== 'neondb') {
  throw new Error('For production, set CONFIRM_PRODUCTION_DATABASE=neondb after verifying the target branch.');
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
  max: 1,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: true } : undefined,
});

try {
  const targetInfo = await pool.query(
    'SELECT current_database() AS database_name, current_schema() AS schema_name',
  );
  const databaseName = targetInfo.rows[0]?.database_name;
  if (databaseName !== 'neondb') {
    throw new Error(`Refusing migration: expected database neondb, got ${databaseName ?? 'unknown'}.`);
  }
  console.log(`Migration target verified: ${target} / ${databaseName}. Connection string is not logged.`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.omega_schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();

  if (files.length === 0) {
    throw new Error(`No numbered SQL migrations found in ${migrationsDir}.`);
  }

  for (const filename of files) {
    const sql = await readFile(join(migrationsDir, filename), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prior = await pool.query(
      'SELECT checksum FROM public.omega_schema_migrations WHERE filename = $1',
      [filename],
    );

    if (prior.rowCount) {
      if (prior.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration ${filename} has changed; create a new migration instead.`);
      }
      console.log(`Already applied: ${filename}`);
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO public.omega_schema_migrations (filename, checksum) VALUES ($1, $2)',
        [filename, checksum],
      );
      await client.query('COMMIT');
      console.log(`Applied: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  console.log('All SQL migrations completed.');
} finally {
  await pool.end();
}
