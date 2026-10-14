import { Module } from '@nestjs/common';
import { PermissionsGuard } from './guards/permissions.guard.js';

@Module({
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class RbacModule {}
