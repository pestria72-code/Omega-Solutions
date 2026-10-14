import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool | null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    // Allow non-database routes to start even in Vercel Preview deployments
    // where DATABASE_URL may not be configured. /health reports the issue.
    this.pool = connectionString
      ? new Pool({
          connectionString,
          connectionTimeoutMillis: 10000,
        })
      : null;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.pool) {
      throw new ServiceUnavailableException(
        'DATABASE_URL is not configured for this environment.',
      );
    }

    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
