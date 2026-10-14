import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { DatabaseService } from './database.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const dbConnected = await this.db.checkConnection();

    return {
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
