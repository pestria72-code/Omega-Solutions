import { SetMetadata } from '@nestjs/common';
export const REQUIRED_MODULE_KEY = 'omega:required-module';
export const RequireModule = (moduleCode: string) => SetMetadata(REQUIRED_MODULE_KEY, moduleCode);
