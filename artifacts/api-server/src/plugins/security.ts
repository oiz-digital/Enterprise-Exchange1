import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";
import { getCorsOrigins, type AppEnv } from "../config/env";

export async function registerSecurity(
  app: FastifyInstance,
  env: AppEnv,
  logger: Logger,
): Promise<void> {
  const origins = getCorsOrigins(env.CORS_ORIGINS);

  await app.register(helmet);
  await app.register(cors, {
    origin: origins.length === 0 ? false : origins,
    credentials: true,
  });
  await app.register(rateLimit, {
    global: true,
    max: env.NODE_ENV === "test" ? 10_000 : 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests",
      },
    }),
  });

  logger.info(
    { corsOrigins: origins.length === 0 ? "disabled" : origins },
    "Security plugins registered",
  );
}