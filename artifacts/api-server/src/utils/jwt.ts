import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { AppEnv } from "../config/env";

function getAccessSecret(env: AppEnv): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function getRefreshSecret(env: AppEnv): Uint8Array {
  return new TextEncoder().encode(env.JWT_REFRESH_SECRET);
}

function parseExpiresIn(value: string): string {
  return value;
}

export async function signAccessToken(
  payload: { sub: string; role?: string; type?: string },
  env: AppEnv,
): Promise<string> {
  const secret = getAccessSecret(env);
  const jwt = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(parseExpiresIn(env.JWT_ACCESS_EXPIRES_IN));

  return jwt.sign(secret);
}

export async function signRefreshToken(
  payload: { sub: string; tokenId: string; type?: string },
  env: AppEnv,
): Promise<string> {
  const secret = getRefreshSecret(env);
  const jwt = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

  return jwt.sign(secret);
}

export async function verifyAccessToken(token: string, env: AppEnv): Promise<JWTPayload> {
  const secret = getAccessSecret(env);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function verifyRefreshToken(token: string, env: AppEnv): Promise<JWTPayload> {
  const secret = getRefreshSecret(env);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  return payload;
}

export { type JWTPayload };
