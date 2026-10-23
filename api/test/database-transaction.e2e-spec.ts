import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseService } from '../src/database.service.js';

describe('DatabaseService PostgreSQL transaction integration', () => {
  let db: DatabaseService;

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgres://postgres:postgres@localhost:5432/omega_transaction_test';
    db = new DatabaseService();
    await db.query(
      'CREATE TABLE IF NOT EXISTS transaction_rollback_probe (id integer PRIMARY KEY, value text NOT NULL)',
    );
    await db.query('TRUNCATE TABLE transaction_rollback_probe');
  });

  afterAll(async () => {
    if (db) {
      try {
        await db.query('DROP TABLE IF EXISTS transaction_rollback_probe');
      } finally {
        await db.onModuleDestroy();
      }
    }
  });

  it('persists no partial write when a transaction callback fails', async () => {
    const failure = new Error('intentional rollback probe');

    await expect(
      db.transaction(async (client) => {
        await client.query(
          'INSERT INTO transaction_rollback_probe (id, value) VALUES ($1, $2)',
          [1, 'must roll back'],
        );
        throw failure;
      }),
    ).rejects.toBe(failure);

    const result = await db.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM transaction_rollback_probe',
    );
    expect(result.rows[0]?.count).toBe('0');
  });

  it('commits successful writes', async () => {
    await db.transaction(async (client) => {
      await client.query(
        'INSERT INTO transaction_rollback_probe (id, value) VALUES ($1, $2)',
        [2, 'committed'],
      );
    });

    const result = await db.query<{ value: string }>(
      'SELECT value FROM transaction_rollback_probe WHERE id = $1',
      [2],
    );
    expect(result.rows).toEqual([{ value: 'committed' }]);
  });
});
