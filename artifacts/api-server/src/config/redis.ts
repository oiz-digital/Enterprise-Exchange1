import { createClient, type RedisClientType } from "redis";
import type { Logger } from "pino";
import type { AppEnv } from "./env";

export type RedisRuntime = {
  client: RedisClientType;
  ping: () => Promise<void>;
  close: () => Promise<void>;
};

export async function createRedis(
  env: AppEnv,
  logger: Logger,
): Promise<RedisRuntime> {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: false,
    },
  });
  client.on("error", (error: Error) => {
    logger.error({ err: error }, "Redis client error");
  });
  try {
    await client.connect();
  } catch (error) {
    logger.warn({ err: error }, "Redis unavailable; readiness will remain degraded");
  }

  return {
    client,
    async ping() {
      if (!client.isOpen) {
        throw new Error("Redis is unavailable");
      }
      await client.ping();
    },
    async close() {
      if (client.isOpen) {
        await client.quit();
      }
    },
  };
}