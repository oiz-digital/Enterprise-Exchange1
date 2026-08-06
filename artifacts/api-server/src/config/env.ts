import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: z.string().url().optional(),

    // JWT — defaults provided for development only
    JWT_ACCESS_SECRET: z
      .string()
      .min(32)
      .default("zebvix-dev-access-secret-minimum-32-characters-long!"),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32)
      .default("zebvix-dev-refresh-secret-minimum-32-characters-long!"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

    // URLs
    ADMIN_APP_URL: z.string().default("http://localhost:3001"),
    API_BASE_URL: z.string().default("http://localhost:8080"),

    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    CORS_ORIGINS: z.string().default(""),
    BULLMQ_PREFIX: z.string().min(1).default("zebvix"),
  })
  .superRefine((values, ctx) => {
    if (values.NODE_ENV === "production" && !values.REDIS_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["REDIS_URL"],
        message: "REDIS_URL is required in production",
      });
    }
    if (
      values.NODE_ENV === "production" &&
      values.JWT_ACCESS_SECRET.startsWith("zebvix-dev-")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET must be set to a real secret in production",
      });
    }
    if (
      values.NODE_ENV === "production" &&
      values.JWT_REFRESH_SECRET.startsWith("zebvix-dev-")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must be set to a real secret in production",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema> & { REDIS_URL: string };

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.parse(source);
  return {
    ...parsed,
    REDIS_URL: parsed.REDIS_URL ?? "redis://127.0.0.1:6379",
  };
}

export function getCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}