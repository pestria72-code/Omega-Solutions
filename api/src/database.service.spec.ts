import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { client, pool } = vi.hoisted(() => {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  };
  return { client, pool };
});

vi.mock('pg', () => ({
  Pool: vi.fn(function () {
    return pool;
  }),
}));

import { DatabaseService } from './database.service.js';

describe('DatabaseService transaction boundary', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://unit-test:unit-test@localhost:5432/unit_test');
    vi.clearAllMocks();
    pool.connect.mockResolvedValue(client);
    client.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('commits successful callbacks and always releases the client', async () => {
    const db = new DatabaseService();
    const callback = vi.fn().mockResolvedValue({ saved: true });

    await expect(db.transaction(callback)).resolves.toEqual({ saved: true });

    expect(pool.connect).toHaveBeenCalledOnce();
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
    expect(callback).toHaveBeenCalledWith(client);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back callback failures, rethrows the original error, and releases the client', async () => {
    const db = new DatabaseService();
    const failure = new Error('simulated write failure');
    const callback = vi.fn().mockRejectedValue(failure);

    await expect(db.transaction(callback)).rejects.toBe(failure);

    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back commit failures and releases the client', async () => {
    const db = new DatabaseService();
    const failure = new Error('simulated commit failure');
    client.query.mockImplementation(async (sql: string) => {
      if (sql === 'COMMIT') throw failure;
      return { rows: [], rowCount: 0 };
    });

    await expect(db.transaction(async () => 'result')).rejects.toBe(failure);

    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('does not try to roll back if acquiring a client fails', async () => {
    const db = new DatabaseService();
    const failure = new Error('pool unavailable');
    pool.connect.mockRejectedValue(failure);

    await expect(db.transaction(async () => 'result')).rejects.toBe(failure);

    expect(client.query).not.toHaveBeenCalled();
    expect(client.release).not.toHaveBeenCalled();
  });
});
