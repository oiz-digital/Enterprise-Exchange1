import { eq, or, and, isNull, gt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  users,
  userProfiles,
  userSecurity,
  userSessions,
  type User,
  type UserSession,
} from "@workspace/db";

export class AuthRepository {
  constructor(private readonly db: PostgresJsDatabase) {}

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  }

  async findUserByMobile(mobile: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.mobile, mobile))
      .limit(1);
    return result[0] ?? null;
  }

  async findUserByEmailOrMobile(identifier: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.mobile, identifier)))
      .limit(1);
    return result[0] ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async createUser(data: {
    email?: string;
    mobile?: string;
    passwordHash: string;
  }): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({
        email: data.email,
        mobile: data.mobile,
        passwordHash: data.passwordHash,
        status: "ACTIVE",
      })
      .returning();
    return result[0]!;
  }

  async createUserProfile(userId: string): Promise<void> {
    await this.db.insert(userProfiles).values({ userId });
  }

  async createUserSecurity(userId: string): Promise<void> {
    await this.db.insert(userSecurity).values({ userId });
  }

  async createSession(data: {
    userId: string;
    refreshTokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<UserSession> {
    const result = await this.db
      .insert(userSessions)
      .values({
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        lastUsedAt: new Date(),
      })
      .returning();
    return result[0]!;
  }

  async findSessionByHash(hash: string): Promise<UserSession | null> {
    const result = await this.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.refreshTokenHash, hash),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.id, sessionId));
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }
}
