import { Global, Module } from '@nestjs/common';
import { ModuleEntitlementsGuard } from './module-entitlements.guard.js';

@Global()
@Module({ providers: [ModuleEntitlementsGuard], exports: [ModuleEntitlementsGuard] })
export class EntitlementsModule {}
