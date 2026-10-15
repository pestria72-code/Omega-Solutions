import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { WorkforceService } from './workforce.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkforceController {
  constructor(private readonly workforce: WorkforceService) {}

  @Get('client-sites')
  @RequirePermissions('assignments:read')
  listSites(@Req() req: { user: AuthenticatedUser }) { return this.workforce.sites(req.user); }

  @Post('client-sites')
  @RequirePermissions('assignments:write')
  createSite(@Req() req: { user: AuthenticatedUser }, @Body() dto: Record<string, unknown>) { return this.workforce.createSite(req.user, dto); }

  @Get('employee-assignments')
  @RequirePermissions('assignments:read')
  listAssignments(@Req() req: { user: AuthenticatedUser }) { return this.workforce.assignments(req.user); }

  @Post('employee-assignments')
  @RequirePermissions('assignments:write')
  createAssignment(@Req() req: { user: AuthenticatedUser }, @Body() dto: Record<string, unknown>) { return this.workforce.createAssignment(req.user, dto); }

  @Post('employee-assignments/:id/transfer')
  @RequirePermissions('assignments:write')
  transfer(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) { return this.workforce.transfer(req.user, id, dto); }

  @Post('attendance/monthly-imports/preview')
  @RequirePermissions('attendance:write')
  previewMonthlyImport(@Req() req: { user: AuthenticatedUser }, @Body() dto: Record<string, unknown>) { return this.workforce.previewMonthlyAttendance(req.user, dto); }

  @Post('attendance/monthly-imports')
  @RequirePermissions('attendance:write')
  createMonthlyImport(@Req() req: { user: AuthenticatedUser }, @Body() dto: Record<string, unknown>) { return this.workforce.createMonthlyAttendanceImport(req.user, dto); }

  @Get('attendance/monthly-imports')
  @RequirePermissions('attendance:read')
  listMonthlyImports(@Req() req: { user: AuthenticatedUser }, @Query('period') period?: string) { return this.workforce.monthlyAttendanceImports(req.user, period); }

  @Post('attendance/monthly-imports/:id/approve')
  @RequirePermissions('attendance:write')
  approveMonthlyImport(@Req() req: { user: AuthenticatedUser }, @Param('id', ParseUUIDPipe) id: string) { return this.workforce.approveMonthlyAttendanceImport(req.user, id); }

  @Get('attendance')
  @RequirePermissions('attendance:read')
  listAttendance(@Req() req: { user: AuthenticatedUser }, @Query('from') from?: string, @Query('to') to?: string, @Query('employeeId') employeeId?: string) { return this.workforce.attendance(req.user, from, to, employeeId); }

  @Post('attendance/punch')
  @RequirePermissions('attendance:write')
  punch(@Req() req: { user: AuthenticatedUser }, @Body() dto: Record<string, unknown>) { return this.workforce.punch(req.user, dto); }
}
