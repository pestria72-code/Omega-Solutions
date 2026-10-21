import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const here = path.dirname(fileURLToPath(import.meta.url));
const filename = '042_subscription_module_entitlements.sql';
const sql = await readFile(path.resolve(here, '../src/migrations', filename), 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error('DATABASE_URL is required to apply subscription entitlements.');
const client = new Client({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: true } : undefined,
});

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS omega_schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const existing = await client.query(
    'SELECT checksum FROM omega_schema_migrations WHERE filename = $1',
    [filename],
  );
  if (existing.rowCount && existing.rows[0].checksum !== checksum) {
    throw new Error(`Migration ${filename} checksum mismatch. Refusing to change an already-recorded migration.`);
  }

  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [['subscription_plans', 'company_subscriptions', 'subscription_change_requests', 'company_module_overrides']],
  );
  const tableNames = new Set(tables.rows.map((row) => row.table_name));
  if (existing.rowCount && tableNames.size === 4) {
    console.log(`✓ ${filename} already applied and subscription tables are present`);
  } else {
    console.log(`→ Applying ${filename} without rerunning unrelated historical migrations`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO omega_schema_migrations (filename, checksum)
         VALUES ($1, $2)
         ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = NOW()`,
        [filename, checksum],
      );
      await client.query('COMMIT');
      console.log(`✓ ${filename} applied`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  const verification = await client.query(
    `SELECT
       (SELECT count(*)::int FROM subscription_plans WHERE code IN ('starter','business','enterprise')) AS plan_count,
       (SELECT count(*)::int FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])) AS table_count`,
    [['subscription_plans', 'company_subscriptions', 'subscription_change_requests', 'company_module_overrides']],
  );
  if (verification.rows[0].plan_count !== 3 || verification.rows[0].table_count !== 4) {
    throw new Error('Subscription migration verification failed; expected four tables and three plans.');
  }
  console.log('Subscription schema verified: 4 tables, 3 plans. No company subscriptions were assigned.');
} finally {
  await client.end();
}
