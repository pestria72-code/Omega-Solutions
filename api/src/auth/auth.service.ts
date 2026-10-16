import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database.service.js';
import { RegisterDto, LoginDto, RefreshDto, NeonExchangeDto } from './dto/auth.dto.js';
import { verifyNeonIdentityToken } from './neon-token-verifier.js';
import type {
  AuthenticatedUser,
  JwtPayload,
  TokenPair,
} from './interfaces/authenticated-user.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; companyId: string | null }> {
    const existing = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    if (existing.rowCount && existing.rowCount > 0) {
      throw new ConflictException('Email already registered');
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const companyName = dto.companyName?.trim() || `${dto.fullName}'s Company`;

    const result = await this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [userId, dto.email.toLowerCase(), passwordHash, dto.fullName, dto.phone ?? null],
      );

      const companyResult = await client.query<{ id: string }>(
        `INSERT INTO companies (name, currency, timezone, is_active)
         VALUES ($1, 'KES', 'Africa/Nairobi', true)
         RETURNING id`,
        [companyName],
      );

      const companyId = companyResult.rows[0].id;

      await client.query(
        `INSERT INTO company_memberships (user_id, company_id, role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [userId, companyId],
      );

      return { companyId };
    });

    return { userId, companyId: result.companyId };
  }

  async exchangeNeonIdentity(dto: NeonExchangeDto): Promise<TokenPair & { user: Omit<AuthenticatedUser, 'permissions'> }> {
    const identity = await verifyNeonIdentityToken(dto.token);
    // Read the verified identity from Neon Auth's own database schema; never trust an email supplied by the browser.
    const neonUserResult = await this.db.query<{
      id: string;
      email: string;
      emailVerified: boolean;
      name: string | null;
    }>(
      'SELECT id, email, "emailVerified" AS "emailVerified", name FROM neon_auth."user" WHERE id = $1 LIMIT 1',
      [identity.sub],
    );
    const neonUser = neonUserResult.rows[0];
    if (!neonUser || neonUser.emailVerified !== true || !neonUser.email) {
      throw new UnauthorizedException('Verify your email address before accessing Omega.');
    }
    const email = neonUser.email.trim().toLowerCase();
    const fullName = dto.fullName?.trim() || neonUser.name?.trim() || email.split('@')[0] || 'Omega User';

    const existing = await this.db.query<{
      id: string;
      email: string;
      full_name: string;
      is_active: boolean;
    }>(
      'SELECT id, email, full_name, is_active FROM users WHERE lower(email) = $1',
      [email],
    );
    let user = existing.rows[0];
    let membership: { companyId: string | null; branchId: string | null; role: string };

    if (user && !user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user) {
      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(randomBytes(48).toString('hex'), BCRYPT_ROUNDS);
      const companyName = dto.companyName?.trim() || `${fullName}'s Company`;
      const created = await this.db.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, email, password_hash, full_name, phone, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [userId, email, passwordHash, fullName, dto.phone ?? null],
        );
        const company = await client.query<{ id: string }>(
          `INSERT INTO companies (name, currency, timezone, is_active)
           VALUES ($1, 'KES', 'Africa/Nairobi', true)
           RETURNING id`,
          [companyName],
        );
        const companyId = company.rows[0].id;
        await client.query(
          `INSERT INTO company_memberships (user_id, company_id, role, is_active)
           VALUES ($1, $2, 'owner', true)`,
          [userId, companyId],
        );
        return { companyId };
      });
      user = { id: userId, email, full_name: fullName, is_active: true };
      membership = { companyId: created.companyId, branchId: null, role: 'owner' };
    } else {
      membership = await this.getUserMembership(user.id);
      if (!membership.companyId) {
        throw new UnauthorizedException('This account has no active company membership. Contact your administrator.');
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: membership.companyId,
      branchId: membership.branchId,
      role: membership.role,
    };
    return {
      accessToken: this.issueToken(payload, false),
      refreshToken: this.issueToken(payload, true),
      user: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        companyId: membership.companyId,
        branchId: membership.branchId,
        role: membership.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<TokenPair & { user: Omit<AuthenticatedUser, 'permissions'> }> {
    const result = await this.db.query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      is_active: boolean;
    }>(
      'SELECT id, email, password_hash, full_name, is_active FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );

    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.getUserMembership(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: membership.companyId,
      branchId: membership.branchId,
      role: membership.role,
    };

    return {
      accessToken: this.issueToken(payload, false),
      refreshToken: this.issueToken(payload, true),
      user: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        companyId: membership.companyId,
        branchId: membership.branchId,
        role: membership.role,
      },
    };
  }

  async refresh(dto: RefreshDto): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const membership = await this.getUserMembership(payload.sub);

      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        companyId: membership.companyId,
        branchId: membership.branchId,
        role: membership.role,
      };

      return {
        accessToken: this.issueToken(newPayload, false),
        refreshToken: this.issueToken(newPayload, true),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserProfile(userId: string): Promise<AuthenticatedUser> {
    const result = await this.db.query<{
      id: string;
      email: string;
      full_name: string;
    }>('SELECT id, email, full_name FROM users WHERE id = $1', [userId]);

    const user = result.rows[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const membership = await this.getUserMembership(user.id);
    const permissions = await this.getUserPermissions(membership.role, user.id);

    return {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      companyId: membership.companyId,
      branchId: membership.branchId,
      role: membership.role,
      permissions,
    };
  }

  private async getUserMembership(
    userId: string,
  ): Promise<{ companyId: string | null; branchId: string | null; role: string }> {
    const result = await this.db.query<{
      company_id: string | null;
      branch_id: string | null;
      role: string;
    }>(
      `SELECT company_id, branch_id, role
       FROM company_memberships
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return { companyId: null, branchId: null, role: 'viewer' };
    }

    const m = result.rows[0];
    return {
      companyId: m.company_id,
      branchId: m.branch_id,
      role: m.role,
    };
  }

  private async getUserPermissions(role: string, _userId: string): Promise<string[]> {
    const result = await this.db.query<{ permission: string }>(
      `SELECT p.permission
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role = $1`,
      [role],
    );

    return result.rows.map((r) => r.permission);
  }

  private issueToken(payload: JwtPayload, isRefresh: boolean): string {
    const secret = isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
    const expiresIn = isRefresh
      ? process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      : process.env.JWT_EXPIRES_IN || '15m';

    return this.jwtService.sign(payload as unknown as object, {
      secret,
      expiresIn: expiresIn as unknown as number,
    });
  }
}
