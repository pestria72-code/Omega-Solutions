import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
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
  async onModuleInit() {
    await this.pool.query('SELECT 1');
    console.log('Neon PostgreSQL connection successful.');
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
}
