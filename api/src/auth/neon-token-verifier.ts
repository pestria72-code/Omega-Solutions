import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let remoteJwksUrl: string | undefined;

export async function verifyNeonIdentityToken(token: string): Promise<{ sub: string }> {
  const baseUrl = process.env.NEON_AUTH_BASE_URL?.replace(/\/$/, '');
  const jwksUrl = process.env.NEON_AUTH_JWKS_URL || (baseUrl ? `${baseUrl}/.well-known/jwks.json` : undefined);
  if (!baseUrl || !jwksUrl) {
    throw new ServiceUnavailableException('Neon email authentication is not configured on the API.');
  }
  if (!token || token.length > 8192) {
    throw new UnauthorizedException('Invalid Neon identity token.');
  }

  try {
    if (!remoteJwks || remoteJwksUrl !== jwksUrl) {
      remoteJwks = createRemoteJWKSet(new URL(jwksUrl), { timeoutDuration: 5000 });
      remoteJwksUrl = jwksUrl;
    }
    // Managed Neon Auth JWTs use the origin as their issuer; the Auth endpoint
    // itself can include a path such as /neondb/auth.
    const issuer = new URL(baseUrl).origin;
    const { payload } = await jwtVerify(token, remoteJwks, {
      issuer,
      algorithms: ['EdDSA'],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new Error('Token subject missing');
    }
    return { sub: payload.sub };
  } catch {
    throw new UnauthorizedException('Unable to verify Neon identity token.');
  }
}
