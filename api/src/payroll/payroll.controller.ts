import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';
import { RequireModule } from '../subscriptions/require-module.decorator.js';
import { ModuleEntitlementsGuard } from '../subscriptions/module-entitlements.guard.js';

@Controller('payroll')
@RequireModule('hr_workforce')
@UseGuards(JwtAuthGuard,PermissionsGuard, ModuleEntitlementsGuard)
export class PayrollController {
 constructor(private readonly payroll:PayrollService){}
 @Get('runs') @RequirePermissions('payroll:read')
 listRuns(@Req() req:{user:AuthenticatedUser}){return this.payroll.listRuns(req.user);}
 @Get('runs/:id') @RequirePermissions('payroll:read')
 getRun(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.payroll.getRun(req.user,id);}
 @Get('runs/:id/reports/:reportType') @RequirePermissions('payroll:read')
 exportRunReport(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string,@Param('reportType') reportType:string){return this.payroll.exportRunReport(req.user,id,reportType);}
 @Post('employees/:employeeId/settings') @RequirePermissions('payroll:write')
 setEmployeePaySettings(@Req() req:{user:AuthenticatedUser},@Param('employeeId',ParseUUIDPipe) employeeId:string,@Body() dto:Record<string,unknown>){return this.payroll.setEmployeePaySettings(req.user,employeeId,dto);}
 @Get('employees/:employeeId/settings') @RequirePermissions('payroll:read')
 getEmployeePaySettings(@Req() req:{user:AuthenticatedUser},@Param('employeeId',ParseUUIDPipe) employeeId:string){return this.payroll.getEmployeePaySettings(req.user,employeeId);}
 @Post('runs') @RequirePermissions('payroll:write')
 createRun(@Req() req:{user:AuthenticatedUser},@Body() dto:{periodStart:string;periodEnd:string}){return this.payroll.createRun(req.user,dto);}
 @Post('runs/:id/post') @RequirePermissions('payroll:approve')
 postRun(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.payroll.postRun(req.user,id);}
 @Patch('runs/:id/approve') @RequirePermissions('payroll:approve')
 approveRun(@Req() req:{user:AuthenticatedUser},@Param('id',ParseUUIDPipe) id:string){return this.payroll.approveRun(req.user,id);}
}
