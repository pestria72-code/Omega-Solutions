import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto, CreateLeaveRequestDto, ReviewLeaveRequestDto } from './dto/employee.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('employees')
@RequireModule('hr_workforce')
@UseGuards(JwtAuthGuard,PermissionsGuard, ModuleEntitlementsGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}
  @Get() @RequirePermissions('employees:read')
  list(@Req() req:{user:AuthenticatedUser}) { return this.employees.list(req.user); }
  @Post() @RequirePermissions('employees:write')
  create(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateEmployeeDto) { return this.employees.create(req.user,dto); }
  @Patch(':id/national-id') @RequirePermissions('employees:write')
  updateNationalId(@Req() req:{user:AuthenticatedUser}, @Param('id',ParseUUIDPipe) id:string, @Body() dto:{nationalId?:unknown}) {
    return this.employees.updateNationalId(req.user,id,dto.nationalId);
  }
  @Get('leave-requests') @RequirePermissions('employees:read')
  listLeaveRequests(@Req() req:{user:AuthenticatedUser}) { return this.employees.listLeaveRequests(req.user); }
  @Post('leave-requests') @RequirePermissions('employees:write')
  createLeaveRequest(@Req() req:{user:AuthenticatedUser},@Body() dto:CreateLeaveRequestDto) { return this.employees.createLeaveRequest(req.user,dto); }
  @Patch('leave-requests/:id/review') @RequirePermissions('employees:write')
  reviewLeaveRequest(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string,@Body() dto:ReviewLeaveRequestDto) { return this.employees.reviewLeaveRequest(req.user,id,dto); }
}
