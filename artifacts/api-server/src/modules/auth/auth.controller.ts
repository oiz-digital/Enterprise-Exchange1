import type { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "./auth.service";
import { RegisterSchema, LoginSchema, RefreshSchema } from "./auth.schema";
import { success } from "../../utils/response";
import type { DatabaseRuntime } from "../../config/database";
import type { AppEnv } from "../../config/env";

export class AuthController {
  private service: AuthService;

  constructor(
    private readonly database: DatabaseRuntime,
    private readonly env: AppEnv,
  ) {
    this.service = new AuthService(database.db);
  }

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = RegisterSchema.parse(request.body);
    const result = await this.service.register(
      body,
      this.env,
      request.ip,
      request.headers["user-agent"],
    );
    reply.status(201).send(success(result));
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = LoginSchema.parse(request.body);
    const result = await this.service.login(
      body,
      this.env,
      request.ip,
      request.headers["user-agent"],
    );
    reply.send(success(result));
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = RefreshSchema.parse(request.body);
    const result = await this.service.refresh(body.refreshToken, this.env);
    reply.send(success(result));
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user!;
    // Get session ID from token context - use the header to find it
    // For simplicity we just revoke all if no session context
    await this.service.logoutAll(user.userId);
    reply.send(success({ message: "Logged out successfully" }));
  }

  async logoutAll(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user!;
    await this.service.logoutAll(user.userId);
    reply.send(success({ message: "All sessions terminated" }));
  }
}
