import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

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
    });
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async onModuleInit() {
    await this.pool.query('SELECT 1');
    console.log('Neon PostgreSQL connection successful.');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
