import { Body, Controller, Get, Patch, Param, Post, Put, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('preferences')
  getPreferences(@Req() req: { user: AuthenticatedUser }) {
    return this.notifications.getPreferences(req.user);
  }

  @Put('preferences')
  savePreferences(@Req() req: { user: AuthenticatedUser }, @Body() body: unknown) {
    return this.notifications.savePreferences(req.user, body);
  }

  @Get()
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.notifications.list(req.user);
  }

  @Patch(':id/read')
  markRead(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(req.user, id);
  }

  @Post('read-all')
  markAllRead(@Req() req: { user: AuthenticatedUser }) {
    return this.notifications.markAllRead(req.user);
  }
}
