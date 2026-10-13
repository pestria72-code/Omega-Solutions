import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
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

  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
