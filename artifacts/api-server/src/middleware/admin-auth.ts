import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../utils/jwt.js";
import type { AppEnv } from "../config/env.js";

declare module "fastify" {
  interface FastifyRequest {
    adminId: string;
    adminRole: string;
  }
}

export function registerAdminAuthHook(app: FastifyInstance, env: AppEnv): void {
  app.decorate("verifyAdmin", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing authorization header" });
    }
    const token = header.slice(7);
    try {
      const payload = await verifyAccessToken(token, env);
      if (payload.type !== "admin") {
        return reply.code(403).send({ error: "Not an admin token" });
      }
      request.adminId = payload.sub as string;
      request.adminRole = (payload.role as string) ?? "";
    } catch {
      return reply.code(401).send({ error: "Invalid or expired token" });
    }
  });
}
