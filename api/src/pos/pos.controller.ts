import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';
import type { Response } from 'express';
import { PosService } from './pos.service.js';
import { PosCheckoutDto } from './dto/pos-checkout.dto.js';

@Controller('pos')
@RequireModule('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard, ModuleEntitlementsGuard)
export class PosController {
  constructor(private readonly pos: PosService) {}

  @Get('registers')
  @RequirePermissions('sales:read')
  listRegisters(@Req() req: { user: AuthenticatedUser }) { return this.pos.listRegisters(req.user); }

  @Post('registers')
  @RequirePermissions('sales:write')
  createRegister(@Req() req: { user: AuthenticatedUser }, @Body() body: { code: string; name: string; branchId?: string | null }) {
    return this.pos.createRegister(req.user, body);
  }

  @Get('salesperson-assignment/me')
  @RequirePermissions('sales:read')
  async mySalespersonAssignment(@Req() req: { user: AuthenticatedUser }, @Res() response: Response) {
    // Nest sends an empty body for null handler results. The salesperson dashboard expects JSON null when no assignment exists.
    const assignment = await this.pos.mySalespersonAssignment(req.user);
    return response.status(200).json(assignment);
  }
  @Get('salesperson-assignments')
  @RequirePermissions('sales:stock-assign')
  listSalespersonAssignments(@Req() req: { user: AuthenticatedUser }) { return this.pos.listSalespersonAssignments(req.user); }
  @Post('salesperson-assignments')
  @RequirePermissions('sales:stock-assign')
  assignSalespersonWarehouse(@Req() req: { user: AuthenticatedUser }, @Body() body: { userId: string; warehouseId: string }) { return this.pos.assignSalespersonWarehouse(req.user, body); }
  @Get('products')
  @RequirePermissions('products:read')
  searchProducts(@Req() req: { user: AuthenticatedUser }, @Query('search') search?: string, @Query('warehouseId') warehouseId?: string) {
    return this.pos.searchProducts(req.user, search, warehouseId);
  }

  @Get('sales')
  @RequirePermissions('sales:read')
  listSales(@Req() req: { user: AuthenticatedUser }, @Query('limit') limit?: string) {
    return this.pos.listSales(req.user, limit);
  }

  @Post('checkout')
  @RequirePermissions('sales:write')
  checkout(@Req() req: { user: AuthenticatedUser }, @Body() dto: PosCheckoutDto) {
    return this.pos.checkout(req.user, dto);
  }

  @Get('shifts/current')
  @RequirePermissions('sales:read')
  async currentShift(@Req() req: { user: AuthenticatedUser }, @Res() response: Response) {
    // Nest treats a null handler result as an empty HTTP body. POS expects JSON null
    // when no shift is open, so serialize it explicitly instead of returning EOF.
    const shift = await this.pos.currentShift(req.user);
    return response.status(200).json(shift);
  }

  @Post('shifts/open')
  @RequirePermissions('sales:write')
  openShift(@Req() req: { user: AuthenticatedUser }, @Body() body: { registerId: string; openingFloat: number }) {
    return this.pos.openShift(req.user, body);
  }

  @Post('shifts/:shiftId/close')
  @RequirePermissions('sales:write')
  closeShift(@Req() req: { user: AuthenticatedUser }, @Param('shiftId', ParseUUIDPipe) shiftId: string, @Body() body: { countedCash: number; notes?: string }) {
    return this.pos.closeShift(req.user, shiftId, body);
  }
}
