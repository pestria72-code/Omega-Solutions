import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service.js';
import { CreateLeadDto, UpdateLeadDto } from './dto/crm.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('crm')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CrmController {
  constructor(private readonly crm: CrmService) {}
  @Get('pipeline') @RequirePermissions('crm:read')
  pipeline(@Request() req: { user: AuthenticatedUser }) { return this.crm.pipelineSummary(req.user); }
  @Get('leads') @RequirePermissions('crm:read')
  list(@Request() req: { user: AuthenticatedUser }, @Query('search') search?: string, @Query('status') status?: string) { return this.crm.listLeads(req.user, search, status); }
  @Get('leads/:leadId') @RequirePermissions('crm:read')
  get(@Request() req: { user: AuthenticatedUser }, @Param('leadId') leadId: string) { return this.crm.getLead(req.user, leadId); }
  @Post('leads') @RequirePermissions('crm:write')
  create(@Request() req: { user: AuthenticatedUser }, @Body() dto: CreateLeadDto) { return this.crm.createLead(req.user, dto); }
  @Patch('leads/:leadId') @RequirePermissions('crm:write')
  update(@Request() req: { user: AuthenticatedUser }, @Param('leadId') leadId: string, @Body() dto: UpdateLeadDto) { return this.crm.updateLead(req.user, leadId, dto); }
}
