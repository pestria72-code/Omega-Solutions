import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service.js';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/quotation.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('quotations')
@RequireModule('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Get()
  @RequirePermissions('sales:read')
  list(@Req() req: { user: AuthenticatedUser }, @Query('search') search?: string, @Query('status') status?: string) {
    return this.quotations.list(req.user, search, status);
  }

  @Get(':id')
  @RequirePermissions('sales:read')
  getById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.quotations.getById(req.user, id);
  }

  @Post()
  @RequirePermissions('sales:write')
  create(@Req() req: { user: AuthenticatedUser }, @Body() dto: CreateQuotationDto) {
    return this.quotations.create(req.user, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('sales:write')
  updateStatus(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: UpdateQuotationStatusDto) {
    return this.quotations.updateStatus(req.user, id, dto.status);
  }
}
