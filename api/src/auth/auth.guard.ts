import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, verify } from 'node:crypto';
import type { Request } from 'express';

interface Jwk {
  kid?: string;
  kty: string;
  crv?: string;
  x?: string;
  [key: string]: unknown;
}

interface JwtPayload {
  sub?: unknown;
  iss?: unknown;
  exp?: unknown;
  nbf?: unknown;
}

export interface AuthenticatedRequest extends Request {
  authUserId: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private keys: Jwk[] = [];
  private keysExpireAt = 0;
  private refreshInFlight?: Promise<Jwk[]>;

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token) {
      throw new UnauthorizedException('A valid Bearer token is required.');
    }

    try {
      const issuer = this.config.get<string>('NEON_AUTH_BASE_URL');
      if (!issuer) {
        throw new Error('NEON_AUTH_BASE_URL is missing from the environment.');
      }

      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Malformed JWT');
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString()) as {
        alg?: string;
        kid?: string;
      };
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as JwtPayload;
      if (header.alg !== 'EdDSA' || !header.kid) throw new Error('Unsupported JWT algorithm');

      const keys = await this.getKeys();
      const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'OKP' && key.crv === 'Ed25519');
      if (!jwk) throw new Error('Signing key not found');

      const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
      const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`);
      const signature = Buffer.from(parts[2], 'base64url');
      if (!verify(null, signingInput, publicKey, signature)) {
        throw new Error('Invalid JWT signature');
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.iss !== issuer) throw new Error('Invalid JWT issuer');
      if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('Expired JWT');
      if (typeof payload.nbf === 'number' && payload.nbf > now) throw new Error('JWT not active');
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('Missing subject');

      request.authUserId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }
  }

  private async getKeys(): Promise<Jwk[]> {
    if (Date.now() < this.keysExpireAt && this.keys.length > 0) return this.keys;
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      const url = this.config.get<string>('NEON_AUTH_JWKS_URL');
      if (!url) throw new Error('NEON_AUTH_JWKS_URL is missing from the environment.');
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Unable to retrieve authentication signing keys');
      const body = (await response.json()) as { keys?: Jwk[] };
      if (!Array.isArray(body.keys)) throw new Error('Invalid JWKS response');
      this.keys = body.keys;
      this.keysExpireAt = Date.now() + 5 * 60 * 1000;
      return this.keys;
    })();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = undefined;
    }
  }
}
