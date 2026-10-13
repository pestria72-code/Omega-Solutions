import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  authUserId: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: ConfigService) {
    const jwksUrl = this.config.get<string>('NEON_AUTH_JWKS_URL');
    if (!jwksUrl) {
      throw new Error('NEON_AUTH_JWKS_URL is missing from the environment.');
    }
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token) {
      throw new UnauthorizedException('A valid Bearer token is required.');
    }

    const issuer = this.config.get<string>('NEON_AUTH_BASE_URL');
    if (!issuer) {
      throw new Error('NEON_AUTH_BASE_URL is missing from the environment.');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedException('The access token has no user subject.');
      }
      request.authUserId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }
  }
}
