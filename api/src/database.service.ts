import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

export type QueryParams = (string | number | boolean | Date | null)[];

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is missing from the environment.');
    }

    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10000,
      max: 10,
      ssl: connectionString.includes('neon.tech')
        ? { rejectUnauthorized: true }
        : undefined,
    });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT 1');
      const connectionUrl = new URL(process.env.DATABASE_URL!);
      console.log('Database connection target:', {
        host: connectionUrl.hostname,
        database: decodeURIComponent(connectionUrl.pathname.slice(1)),
      });
      console.log('Neon PostgreSQL connection successful.');
    } catch (err) {
      console.error('Database connection failed:', err);
      throw err;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: QueryParams,
  ): Promise<QueryResult<T>> {
    const result = await this.pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a callback within a transaction. Commits on success,
   * rolls back on error, and always releases the client.
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let releaseError: Error | undefined;
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Preserve the operation's original error and discard a connection whose
        // transaction state may be uncertain instead of returning it to the pool.
        releaseError =
          rollbackErr instanceof Error
            ? rollbackErr
            : new Error('Transaction rollback failed.');
      }
      throw err;
    } finally {
      client.release(releaseError);
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
