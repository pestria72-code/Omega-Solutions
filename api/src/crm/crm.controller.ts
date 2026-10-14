import { Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service.js';
import {
  CreateActivityDto, CreateLeadDto, CreateOpportunityDto, UpdateActivityDto,
  UpdateLeadDto, UpdateOpportunityDto,
} from './dto/crm.dto.js';
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
  list(@Request() req: { user: AuthenticatedUser }, @Query('search') search?: string, @Query('status') status?: string) {
    return this.crm.listLeads(req.user, search, status);
  }

  @Get('leads/:leadId') @RequirePermissions('crm:read')
  get(@Request() req: { user: AuthenticatedUser }, @Param('leadId') leadId: string) {
    return this.crm.getLead(req.user, leadId);
  }

  @Post('leads') @RequirePermissions('crm:write')
  create(@Request() req: { user: AuthenticatedUser }, @Body() dto: CreateLeadDto) {
    return this.crm.createLead(req.user, dto);
  }

  @Patch('leads/:leadId') @RequirePermissions('crm:write')
  update(@Request() req: { user: AuthenticatedUser }, @Param('leadId') leadId: string, @Body() dto: UpdateLeadDto) {
    return this.crm.updateLead(req.user, leadId, dto);
  }

  @Get('opportunities') @RequirePermissions('crm:read')
  listOpportunities(@Request() req: { user: AuthenticatedUser }, @Query('stage') stage?: string, @Query('search') search?: string) {
    return this.crm.listOpportunities(req.user, stage, search);
  }

  @Post('opportunities') @RequirePermissions('crm:write')
  createOpportunity(@Request() req: { user: AuthenticatedUser }, @Body() dto: CreateOpportunityDto) {
    return this.crm.createOpportunity(req.user, dto);
  }

  @Get('opportunities/:id') @RequirePermissions('crm:read')
  getOpportunity(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.crm.getOpportunity(req.user, id);
  }

  @Patch('opportunities/:id') @RequirePermissions('crm:write')
  updateOpportunity(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: UpdateOpportunityDto) {
    return this.crm.updateOpportunity(req.user, id, dto);
  }

  @Get('activities') @RequirePermissions('crm:read')
  listActivities(
    @Request() req: { user: AuthenticatedUser },
    @Query('leadId') leadId?: string,
    @Query('opportunityId') opportunityId?: string,
    @Query('pending') pending?: string,
  ) {
    return this.crm.listActivities(req.user, { leadId, opportunityId, pending: pending === 'true' });
  }

  @Post('activities') @RequirePermissions('crm:write')
  createActivity(@Request() req: { user: AuthenticatedUser }, @Body() dto: CreateActivityDto) {
    return this.crm.createActivity(req.user, dto);
  }

  @Patch('activities/:id') @RequirePermissions('crm:write')
  completeActivity(@Request() req: { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.crm.completeActivity(req.user, id, dto);
  }
}
