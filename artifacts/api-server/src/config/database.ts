import postgres, { type Sql } from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Logger } from "pino";
import type { AppEnv } from "./env";

export type DatabaseRuntime = {
  client: Sql;
  db: PostgresJsDatabase;
  ping: () => Promise<void>;
  close: () => Promise<void>;
};

export function createDatabase(env: AppEnv, logger: Logger): DatabaseRuntime {
  const client = postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "test" ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 5,
    onnotice: () => undefined,
    debug: env.LOG_LEVEL === "debug"
      ? (connection, query, parameters) => {
          logger.debug({ connection, query, parameters }, "Database query");
        }
      : undefined,
  });

  const db = drizzle(client);

  return {
    client,
    db,
    async ping() {
      await client`SELECT 1`;
    },
    async close() {
      await client.end({ timeout: 5 });
    },
  };
}