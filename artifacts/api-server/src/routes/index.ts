import type { FastifyInstance } from "fastify";
import type { DatabaseRuntime } from "../config/database";
import type { RedisRuntime } from "../config/redis";
import type { BinancePriceFeed } from "../services/binance-price-feed";
import type { SimulatedTradingEngine } from "../services/simulated-trading-engine";
import type { AppEnv } from "../config/env";
import { registerHealthRoutes } from "./health";
import { registerPriceWsRoute } from "./ws";
import { registerTradingRoutes } from "./trading";
import { registerAdminRoutes } from "./admin/index";

export async function registerRoutes(
  app: FastifyInstance,
  dependencies: {
    database:      DatabaseRuntime;
    redis:         RedisRuntime;
    priceFeed:     BinancePriceFeed;
    tradingEngine: SimulatedTradingEngine;
    env:           AppEnv;
  },
): Promise<void> {
  const { database, redis, priceFeed, tradingEngine, env } = dependencies;
  await registerHealthRoutes(app, { database, redis });
  await registerPriceWsRoute(app, priceFeed);
  await registerTradingRoutes(app, { database, tradingEngine, priceFeed });
  await registerAdminRoutes(app, { sql: database.client, env });
}
