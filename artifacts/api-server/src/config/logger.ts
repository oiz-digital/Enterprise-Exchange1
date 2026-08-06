import pino, { type Logger } from "pino";
import type { AppEnv } from "./env";

export function createLogger(env: AppEnv): Logger {
  return pino({
    level: env.LOG_LEVEL,
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "password",
      "otp",
      "accessToken",
      "refreshToken",
      "privateKey",
      "seedPhrase",
      "kycDocument",
    ],
    ...(env.NODE_ENV !== "production" && env.NODE_ENV !== "test"
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : {}),
  });
}