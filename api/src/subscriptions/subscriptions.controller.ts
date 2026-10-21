import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { SubscriptionsService } from './subscriptions.service.js';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptions.getPlans();
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  getCurrent(@Request() req: { user: AuthenticatedUser }) {
    if (!req.user.companyId) {
      throw new UnauthorizedException('Select a company before viewing its subscription.');
    }
    return this.subscriptions.getCurrent(req.user.companyId);
  }

  @Post('change-requests')
  @UseGuards(JwtAuthGuard)
  requestPlanChange(
    @Request() req: { user: AuthenticatedUser },
    @Body() body: { planCode?: string; note?: string },
  ) {
    if (!req.user.companyId) {
      throw new UnauthorizedException('Select a company before requesting a plan.');
    }
    if (!['owner', 'admin'].includes(req.user.role.toLowerCase())) {
      throw new ForbiddenException('Only company owners or administrators can request plan changes.');
    }
    return this.subscriptions.requestPlanChange(
      req.user.companyId,
      req.user.userId,
      body?.planCode ?? '',
      body?.note,
    );
  }
  @Post('module-requests')
  @UseGuards(JwtAuthGuard)
  requestModuleChange(
    @Request() req: { user: AuthenticatedUser },
    @Body() body: { moduleCode?: string; note?: string },
  ) {
    if (!req.user.companyId) throw new UnauthorizedException('Select a company before requesting an add-on module.');
    if (!['owner', 'admin'].includes(req.user.role.toLowerCase())) {
      throw new ForbiddenException('Only company owners or administrators can request add-on modules.');
    }
    return this.subscriptions.requestModuleChange(
      req.user.companyId, req.user.userId, body?.moduleCode ?? '', body?.note,
    );
  }

}
