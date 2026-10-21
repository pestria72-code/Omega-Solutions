import { Module } from '@nestjs/common';
import { UsersRolesController } from './users-roles.controller.js';
import { UsersRolesService } from './users-roles.service.js';
import { InvitationsService } from './invitations.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RbacModule } from '../rbac/rbac.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

@Module({
  imports: [DatabaseModule, MembershipsModule, AuditModule, RbacModule, AuthModule, SubscriptionsModule],
  controllers: [UsersRolesController],
  providers: [UsersRolesService, InvitationsService],
})
export class UsersRolesModule {}
