import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { AuthenticationError, AuthorizationError } from "../errors/app-error";
import { verifyAccessToken } from "../utils/jwt";
import type { AppEnv } from "../config/env";
import type { DatabaseRuntime } from "../config/database";
import { eq, and } from "drizzle-orm";
import {
  adminRoles,
  rolePermissions,
  permissions,
} from "@workspace/db";

declare module "fastify" {
  interface FastifyRequest {
    user?: { userId: string; role?: string };
    admin?: { adminId: string; role: string };
  }
}

export function createAuthenticateMiddleware(env: AppEnv) {
  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Authentication required");
    }
    const token = authHeader.slice(7);
    try {
      const payload = await verifyAccessToken(token, env);
      if (!payload.sub) {
        throw new AuthenticationError("Invalid token");
      }
      const type = payload["type"] as string | undefined;
      if (type === "admin") {
        throw new AuthenticationError("Invalid token for user endpoint");
      }
      request.user = {
        userId: payload.sub,
        role: payload["role"] as string | undefined,
      };
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError("Invalid or expired token");
    }
  };
}

export function createAdminAuthenticateMiddleware(env: AppEnv) {
  return async function authenticateAdmin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Admin authentication required");
    }
    const token = authHeader.slice(7);
    try {
      const payload = await verifyAccessToken(token, env);
      if (!payload.sub) {
        throw new AuthenticationError("Invalid token");
      }
      const type = payload["type"] as string | undefined;
      if (type !== "admin") {
        throw new AuthenticationError("Invalid admin token");
      }
      request.admin = {
        adminId: payload.sub,
        role: (payload["role"] as string) ?? "",
      };
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError("Invalid or expired admin token");
    }
  };
}

export function createRequirePermission(database: DatabaseRuntime) {
  return function requirePermission(permission: string) {
    return async function (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void> {
      if (!request.admin) {
        throw new AuthenticationError("Admin authentication required");
      }
      const { adminId } = request.admin;

      // Check if admin has the required permission through their roles
      const result = await database.db
        .select({ permCode: permissions.code })
        .from(adminRoles)
        .innerJoin(rolePermissions, eq(adminRoles.roleId, rolePermissions.roleId))
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(
          and(
            eq(adminRoles.adminId, adminId),
            eq(permissions.code, permission),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        throw new AuthorizationError(`Missing permission: ${permission}`);
      }
    };
  };
}
