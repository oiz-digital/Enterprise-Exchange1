import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { AppEnv } from "../../config/env";
import { hashPassword, verifyPassword, hashToken } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../../errors/app-error";
import { AuthRepository } from "./auth.repository";
import type { RegisterInput, LoginInput } from "./auth.schema";

function parseRefreshExpiry(expiresIn: string): Date {
  const now = Date.now();
  const match = expiresIn.match(/^(\d+)([smhdw])$/);
  if (!match) return new Date(now + 30 * 24 * 60 * 60 * 1000);
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return new Date(now + value * (multipliers[unit] ?? 86400000));
}

export class AuthService {
  private repo: AuthRepository;

  constructor(private readonly db: PostgresJsDatabase) {
    this.repo = new AuthRepository(db);
  }

  async register(
    input: RegisterInput,
    env: AppEnv,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!input.email && !input.mobile) {
      throw new ValidationError("Either email or mobile is required");
    }

    // Check for existing user
    if (input.email) {
      const existing = await this.repo.findUserByEmail(input.email);
      if (existing) throw new ConflictError("Email already registered");
    }
    if (input.mobile) {
      const existing = await this.repo.findUserByMobile(input.mobile);
      if (existing) throw new ConflictError("Mobile already registered");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.createUser({
      email: input.email,
      mobile: input.mobile,
      passwordHash,
    });

    await Promise.all([
      this.repo.createUserProfile(user.id),
      this.repo.createUserSecurity(user.id),
    ]);

    // Create tokens
    const accessToken = await signAccessToken(
      { sub: user.id, role: "USER" },
      env,
    );
    const refreshToken = await signRefreshToken(
      { sub: user.id, tokenId: user.id },
      env,
    );
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const session = await this.repo.createSession({
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        status: user.status,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        sessionId: session.id,
      },
    };
  }

  async login(
    input: LoginInput,
    env: AppEnv,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.repo.findUserByEmailOrMobile(input.identifier);
    if (!user || !user.passwordHash) {
      throw new AuthenticationError("Invalid credentials");
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new AuthenticationError("Invalid credentials");
    }

    if (user.status === "SUSPENDED" || user.status === "CLOSED") {
      throw new AuthenticationError(`Account is ${user.status.toLowerCase()}`);
    }

    await this.repo.updateLastLogin(user.id);

    const accessToken = await signAccessToken(
      { sub: user.id, role: "USER" },
      env,
    );
    const refreshToken = await signRefreshToken(
      { sub: user.id, tokenId: user.id },
      env,
    );
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const session = await this.repo.createSession({
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        status: user.status,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900,
        sessionId: session.id,
      },
    };
  }

  async refresh(refreshToken: string, env: AppEnv) {
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken, env);
    } catch {
      throw new AuthenticationError("Invalid refresh token");
    }

    const tokenHash = hashToken(refreshToken);
    const session = await this.repo.findSessionByHash(tokenHash);
    if (!session) {
      throw new AuthenticationError("Session not found or expired");
    }

    // Rotate: revoke old, create new
    await this.repo.revokeSession(session.id);

    const accessToken = await signAccessToken(
      { sub: session.userId, role: "USER" },
      env,
    );
    const newRefreshToken = await signRefreshToken(
      { sub: session.userId, tokenId: session.id },
      env,
    );
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const expiresAt = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const newSession = await this.repo.createSession({
      userId: session.userId,
      refreshTokenHash: newRefreshTokenHash,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
      expiresAt,
    });

    return {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
        sessionId: newSession.id,
      },
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId);
  }
}
