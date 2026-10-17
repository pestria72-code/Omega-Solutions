import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApprovalsService } from './approvals.service.js';
import { ApprovalDecisionDto } from '../requisitions/dto/requisition.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}
  @Get() @RequirePermissions('approvals:read') inbox(@Req() req:{user:AuthenticatedUser}) { return this.service.inbox(req.user); }
  @Post('purchase-orders/:id/submit') @RequirePermissions('purchases:write') submitPurchaseOrder(@Req() req:{user:AuthenticatedUser}, @Param('id',ParseUUIDPipe) id:string) { return this.service.submitPurchaseOrder(req.user,id); }
  @Post(':id/approve') @RequirePermissions('approvals:approve') approve(@Req() req:{user:AuthenticatedUser}, @Param('id',ParseUUIDPipe) id:string, @Body() dto:ApprovalDecisionDto) { return this.service.decide(req.user,id,'approved',dto.note); }
  @Post(':id/reject') @RequirePermissions('approvals:approve') reject(@Req() req:{user:AuthenticatedUser}, @Param('id',ParseUUIDPipe) id:string, @Body() dto:ApprovalDecisionDto) { return this.service.decide(req.user,id,'rejected',dto.note); }
}
