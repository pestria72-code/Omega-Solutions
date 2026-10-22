import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ContractsService } from './contracts.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('contracts')
@RequireModule('procurement')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
export class ContractsController {
  constructor(private readonly service: ContractsService) {}
  @Get() @RequirePermissions('purchases:read') list(@Req() req: { user: AuthenticatedUser }) { return this.service.list(req.user); }
  @Get(':id') @RequirePermissions('purchases:read') get(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string) { return this.service.get(req.user, id); }
  @Post() @RequirePermissions('purchases:write') create(@Req() req: { user: AuthenticatedUser }, @Body() body: Record<string, unknown>) { return this.service.create(req.user, body); }
  @Patch(':id') @RequirePermissions('purchases:write') update(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) { return this.service.update(req.user, id, body); }
  @Post(':id/activate') @RequirePermissions('purchases:write') activate(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string) { return this.service.changeStatus(req.user, id, 'active'); }
  @Post(':id/suspend') @RequirePermissions('purchases:write') suspend(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string) { return this.service.changeStatus(req.user, id, 'suspended'); }
  @Post(':id/requisitions') @RequirePermissions('purchases:write') createRequisition(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string) { return this.service.createRequisition(req.user, id); }
  @Post(':id/obligations') @RequirePermissions('purchases:write') addObligation(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) { return this.service.addObligation(req.user, id, body); }
  @Patch(':id/obligations/:obligationId') @RequirePermissions('purchases:write') updateObligation(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string, @Param('obligationId', ParseUUIDPipe) obligationId: string, @Body() body: Record<string, unknown>) { return this.service.updateObligation(req.user, id, obligationId, body); }
}
