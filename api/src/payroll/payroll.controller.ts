import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('payroll')
@UseGuards(JwtAuthGuard,PermissionsGuard)
export class PayrollController {
 constructor(private readonly payroll:PayrollService){}
 @Get('runs') @RequirePermissions('payroll:read')
 listRuns(@Req() req:{user:AuthenticatedUser}){return this.payroll.listRuns(req.user);}
 @Get('runs/:id') @RequirePermissions('payroll:read')
 getRun(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.payroll.getRun(req.user,id);}
 @Post('employees/:employeeId/settings') @RequirePermissions('payroll:write')
 setEmployeePaySettings(@Req() req:{user:AuthenticatedUser},@Param('employeeId',ParseUUIDPipe) employeeId:string,@Body() dto:Record<string,unknown>){return this.payroll.setEmployeePaySettings(req.user,employeeId,dto);}
 @Get('employees/:employeeId/settings') @RequirePermissions('payroll:read')
 getEmployeePaySettings(@Req() req:{user:AuthenticatedUser},@Param('employeeId',ParseUUIDPipe) employeeId:string){return this.payroll.getEmployeePaySettings(req.user,employeeId);}
 @Post('runs') @RequirePermissions('payroll:write')
 createRun(@Req() req:{user:AuthenticatedUser},@Body() dto:{periodStart:string;periodEnd:string}){return this.payroll.createRun(req.user,dto);}
 @Patch('runs/:id/approve') @RequirePermissions('payroll:approve')
 approveRun(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.payroll.approveRun(req.user,id);}
}
