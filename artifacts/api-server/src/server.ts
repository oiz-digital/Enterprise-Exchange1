import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppEnv } from "./config/env";
import { createDatabase, type DatabaseRuntime } from "./config/database";
import { createLogger } from "./config/logger";
import { createRedis, type RedisRuntime } from "./config/redis";
import { registerErrorHandler } from "./middleware/error-handler";
import { registerSecurity } from "./plugins/security";
import { registerRoutes } from "./routes";
import { BinancePriceFeed } from "./services/binance-price-feed";
import { SimulatedTradingEngine } from "./services/simulated-trading-engine";

export type AppRuntime = {
  app:           FastifyInstance;
  database:      DatabaseRuntime;
  redis:         RedisRuntime;
  priceFeed:     BinancePriceFeed;
  tradingEngine: SimulatedTradingEngine;
};

const runtimeDir = dirname(fileURLToPath(import.meta.url));

export async function buildApp(env: AppEnv): Promise<AppRuntime> {
  const logger        = createLogger(env);
  const database      = createDatabase(env, logger);
  const redis         = await createRedis(env, logger);
  const priceFeed     = new BinancePriceFeed(database, logger);
  const tradingEngine = new SimulatedTradingEngine(database, priceFeed, logger);

  const app = Fastify({
    loggerInstance: logger,
    bodyLimit: 1_048_576,
    requestIdHeader: "x-request-id",
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? randomUUID(),
  });

  registerErrorHandler(app);
  await registerSecurity(app, env, logger);

  // WebSocket support — must be registered before any WS routes
  await app.register(import("@fastify/websocket"));

  await app.register(import("@fastify/swagger"), {
    openapi: {
      info: {
        title: "Zebvix Exchange API",
        version: "1.0.0",
        description: "Zebvix Exchange — simulated trading engine + live price feed.",
      },
      servers: [{ url: "/api/v1" }],
    },
  });
  await app.register(import("@fastify/swagger-ui"), {
    routePrefix: "/api/docs",
    baseDir: join(runtimeDir, "static"),
    logo: {
      type: "image/svg+xml",
      content: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32"><text x="4" y="22" fill="#8b5cf6" font-family="sans-serif" font-size="18" font-weight="700">ZEBVIX</text></svg>',
      ),
    },
  });

  await registerRoutes(app, { database, redis, priceFeed, tradingEngine, env });

  app.addHook("onClose", async () => {
    tradingEngine.stop();
    priceFeed.stop();
    await Promise.allSettled([database.close(), redis.close()]);
  });

  return { app, database, redis, priceFeed, tradingEngine };
}

export async function startServer(env: AppEnv): Promise<FastifyInstance> {
  const runtime = await buildApp(env);

  const shutdown = async (signal: string) => {
    runtime.app.log.info({ signal }, "Graceful shutdown started");
    await runtime.app.close();
    runtime.app.log.info("Graceful shutdown complete");
  };

  process.once("SIGINT",  () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await runtime.app.listen({ port: env.PORT, host: "0.0.0.0" });
  runtime.app.log.info({ port: env.PORT }, "Zebvix API listening");

  // Start live price feed first, then engine (engine reads prices from feed)
  await runtime.priceFeed.start();
  runtime.tradingEngine.start();

  return runtime.app;
}
