import type { FastifyInstance } from "fastify";
import type { DatabaseRuntime } from "../config/database";
import type { RedisRuntime } from "../config/redis";

type HealthDependencies = {
  database: DatabaseRuntime;
  redis: RedisRuntime;
};

const healthResponse = {
  success: true,
  data: {
    status: "ok",
  },
};

export async function registerHealthRoutes(
  app: FastifyInstance,
  dependencies: HealthDependencies,
): Promise<void> {
  for (const path of ["/health", "/healthz", "/api/health", "/api/healthz"]) {
    app.get(path, async (_request, reply) => reply.status(200).send(healthResponse));
  }

  for (const path of ["/ready", "/api/ready"]) {
    app.get(path, async (_request, reply) => {
      const checks = await Promise.allSettled([
        dependencies.database.ping(),
        dependencies.redis.ping(),
      ]);
      const databaseReady = checks[0].status === "fulfilled";
      const redisReady = checks[1].status === "fulfilled";
      const ready = databaseReady && redisReady;

      return reply.status(ready ? 200 : 503).send({
        success: ready,
        data: {
          status: ready ? "ready" : "not_ready",
          checks: {
            postgres: databaseReady ? "ok" : "unavailable",
            redis: redisReady ? "ok" : "unavailable",
          },
        },
      });
    });
  }
}