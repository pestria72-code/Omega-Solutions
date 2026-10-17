import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersRolesService } from './users-roles.service.js';
import { UpdateMembershipRoleDto } from './dto/update-membership-role.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../rbac/guards/permissions.guard.js';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.js';

@Controller('users-roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersRolesController {
  constructor(private readonly service: UsersRolesService) {}

  @Get()
  @RequirePermissions('users:read')
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.service.list(req.user);
  }

  @Get('roles')
  @RequirePermissions('users:read')
  roles(@Req() req: { user: AuthenticatedUser }) {
    return this.service.roleCatalog(req.user);
  }

  @Patch(':membershipId/role')
  @RequirePermissions('users:write')
  updateRole(
    @Req() req: { user: AuthenticatedUser },
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateMembershipRoleDto,
  ) {
    return this.service.updateRole(req.user, membershipId, dto);
  }
}
