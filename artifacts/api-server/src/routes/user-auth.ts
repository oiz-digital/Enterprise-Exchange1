/**
 * User Auth Routes
 *
 * Mobile-only auth with OTP + PIN flow:
 *
 * Register:
 *   1. POST /api/v1/auth/otp/send   { mobile, purpose: "register" }
 *   2. POST /api/v1/auth/otp/verify { mobile, otp, purpose: "register" } → otpToken
 *   3. POST /api/v1/auth/register   { otpToken, countryCode? }
 *
 * Web Login (OTP):
 *   1. POST /api/v1/auth/otp/send   { mobile, purpose: "login" }
 *   2. POST /api/v1/auth/otp/verify { mobile, otp, purpose: "login" } → otpToken
 *   3. POST /api/v1/auth/login/otp  { otpToken } → tokens
 *
 * Mobile Login – first time (no PIN):
 *   1-2. Same OTP send/verify with purpose: "login" → otpToken
 *   3. POST /api/v1/auth/login/otp  { otpToken } → { requiresPinSetup: true, setupToken }
 *   4. POST /api/v1/auth/pin/set    { setupToken, pin } → tokens
 *
 * Mobile Login – subsequent (PIN set):
 *   POST /api/v1/auth/login/pin { mobile, pin } → tokens
 *
 * PIN Management:
 *   POST /api/v1/auth/pin/set    { setupToken, pin }         — first-time / reset via OTP
 *   POST /api/v1/auth/pin/change { Authorization, currentPin, newPin }
 */

import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AppEnv } from "../config/env.js";
import { hashPassword, verifyPassword } from "../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { hashToken } from "../utils/hash.js";

// ─── Constants ───────────────────────────────────────────────────────────────
const OTP_EXPIRY_SECONDS = 300;      // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_COOLDOWN_MINUTES = 1; // 1 min between sends
const OTP_MAX_PER_HOUR = 5;          // max 5 OTPs per mobile per hour
const PIN_LENGTH = 6;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateOtp(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return String(num);
}

function parseRefreshExpiry(expiresIn: string): Date {
  const now = Date.now();
  const match = expiresIn.match(/^(\d+)([smhdw])$/);
  if (!match) return new Date(now + 30 * 24 * 60 * 60 * 1000);
  const v = parseInt(match[1]!, 10);
  const multipliers: Record<string, number> = {
    s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000,
  };
  return new Date(now + v * (multipliers[match[2]!] ?? 86_400_000));
}

async function signOtpToken(
  payload: { mobile: string; purpose: string },
  env: AppEnv,
): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  return new SignJWT({ ...payload, type: "otp" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

async function verifyOtpToken(
  token: string,
  env: AppEnv,
): Promise<{ mobile: string; purpose: string }> {
  const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (payload["type"] !== "otp") throw new Error("Not an OTP token");
  return {
    mobile: payload["mobile"] as string,
    purpose: payload["purpose"] as string,
  };
}

// ─── Route Registration ───────────────────────────────────────────────────────
export async function registerUserAuthRoutes(
  app: FastifyInstance,
  { sql, env }: { sql: any; env: AppEnv },
): Promise<void> {
  const isDev = env.NODE_ENV !== "production";

  // ──────────────────────────────────────────────────────
  // GET /api/v1/countries — public list for signup dropdown
  // ──────────────────────────────────────────────────────
  app.get("/api/v1/countries", async (_req, reply) => {
    const rows = await sql`
      SELECT id, name, code, dial_code, flag_emoji
      FROM countries
      WHERE is_active = true AND is_registration_allowed = true
      ORDER BY name ASC
    `;
    return reply.send({ data: rows });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/otp/send
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/otp/send", {
    schema: {
      body: {
        type: "object",
        required: ["mobile", "purpose"],
        properties: {
          mobile:  { type: "string", minLength: 7, maxLength: 20 },
          purpose: { type: "string", enum: ["register", "login", "pin_set", "pin_change"] },
        },
      },
    },
  }, async (req, reply) => {
    const { mobile, purpose } = req.body as { mobile: string; purpose: string };
    const normalizedMobile = mobile.trim();

    // If register: ensure mobile not already taken
    if (purpose === "register") {
      const [existing] = await sql`
        SELECT id FROM users WHERE mobile = ${normalizedMobile} AND deleted_at IS NULL LIMIT 1
      `;
      if (existing) {
        return reply.code(409).send({ error: "Mobile number already registered" });
      }
    }

    // If login/pin: ensure mobile exists
    if (purpose === "login" || purpose === "pin_set" || purpose === "pin_change") {
      const [existing] = await sql`
        SELECT id FROM users WHERE mobile = ${normalizedMobile} AND deleted_at IS NULL LIMIT 1
      `;
      if (!existing) {
        return reply.code(404).send({ error: "Mobile number not registered" });
      }
    }

    // Rate limit: max 5 OTPs per mobile per hour
    const [rateCheck] = await sql`
      SELECT COUNT(*) AS cnt FROM otp_verifications
      WHERE mobile = ${normalizedMobile}
        AND purpose = ${purpose}
        AND created_at > now() - INTERVAL '1 hour'
    `;
    if (parseInt(rateCheck.cnt, 10) >= OTP_MAX_PER_HOUR) {
      return reply.code(429).send({
        error: "Too many OTP requests. Please wait before requesting again.",
      });
    }

    // Cooldown: block resend within 1 minute
    const cooldownCutoff = new Date(Date.now() - OTP_SEND_COOLDOWN_MINUTES * 60_000);
    const [recentCheck] = await sql`
      SELECT id FROM otp_verifications
      WHERE mobile = ${normalizedMobile}
        AND purpose = ${purpose}
        AND verified_at IS NULL
        AND created_at > ${cooldownCutoff}
      ORDER BY created_at DESC LIMIT 1
    `;
    if (recentCheck) {
      return reply.code(429).send({
        error: `Please wait ${OTP_SEND_COOLDOWN_MINUTES} minute(s) before requesting a new OTP.`,
      });
    }

    // Generate OTP
    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    await sql`
      INSERT INTO otp_verifications (mobile, purpose, code_hash, expires_at)
      VALUES (${normalizedMobile}, ${purpose}, ${codeHash}, ${expiresAt})
    `;

    // In production: send SMS here via your SMS provider
    // For now, log and return in dev
    if (isDev) {
      app.log.info({ mobile: normalizedMobile, otp, purpose }, "DEV OTP generated");
    }

    return reply.code(200).send({
      message: "OTP sent to your mobile number",
      expiresIn: OTP_EXPIRY_SECONDS,
      ...(isDev && { otp }), // Remove in production!
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/otp/verify
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/otp/verify", {
    schema: {
      body: {
        type: "object",
        required: ["mobile", "otp", "purpose"],
        properties: {
          mobile:  { type: "string" },
          otp:     { type: "string", minLength: 6, maxLength: 6 },
          purpose: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { mobile, otp, purpose } = req.body as {
      mobile: string; otp: string; purpose: string;
    };
    const normalizedMobile = mobile.trim();

    // Find latest pending OTP
    const [record] = await sql`
      SELECT * FROM otp_verifications
      WHERE mobile   = ${normalizedMobile}
        AND purpose  = ${purpose}
        AND verified_at IS NULL
        AND expires_at  > now()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (!record) {
      return reply.code(400).send({
        error: "OTP expired or not found. Please request a new one.",
      });
    }

    // Attempts check
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return reply.code(429).send({
        error: "Too many failed attempts. Please request a new OTP.",
      });
    }

    const inputHash = hashOtp(otp);
    if (inputHash !== record.code_hash) {
      // Increment attempts
      await sql`
        UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ${record.id}
      `;
      const remaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
      return reply.code(400).send({
        error: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
      });
    }

    // Mark verified
    await sql`
      UPDATE otp_verifications SET verified_at = now() WHERE id = ${record.id}
    `;

    // Sign OTP token (10 min) to use in next step
    const otpToken = await signOtpToken({ mobile: normalizedMobile, purpose }, env);

    return reply.send({ otpToken, message: "OTP verified successfully" });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/register
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/register", {
    schema: {
      body: {
        type: "object",
        required: ["otpToken"],
        properties: {
          otpToken:    { type: "string" },
          countryCode: { type: "string", maxLength: 2 },
          displayName: { type: "string", maxLength: 100 },
        },
      },
    },
  }, async (req, reply) => {
    const { otpToken, countryCode, displayName } = req.body as {
      otpToken: string; countryCode?: string; displayName?: string;
    };

    let tokenData: { mobile: string; purpose: string };
    try {
      tokenData = await verifyOtpToken(otpToken, env);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired OTP token" });
    }

    if (tokenData.purpose !== "register") {
      return reply.code(400).send({ error: "Invalid token purpose" });
    }

    // Double-check mobile not taken
    const [existing] = await sql`
      SELECT id FROM users WHERE mobile = ${tokenData.mobile} LIMIT 1
    `;
    if (existing) {
      return reply.code(409).send({ error: "Mobile already registered" });
    }

    // Validate country if provided
    if (countryCode) {
      const [country] = await sql`
        SELECT id FROM countries
        WHERE code = ${countryCode.toUpperCase()}
          AND is_active = true
          AND is_registration_allowed = true
        LIMIT 1
      `;
      if (!country) {
        return reply.code(400).send({ error: "Registration not available in this country" });
      }
    }

    // Create user (mobile only, mobile already verified)
    const [user] = await sql`
      INSERT INTO users (mobile, status, mobile_verified_at)
      VALUES (${tokenData.mobile}, 'ACTIVE', now())
      RETURNING id, mobile, status, created_at
    `;

    await sql`
      INSERT INTO user_profiles (user_id, country, display_name)
      VALUES (${user.id}, ${countryCode?.toUpperCase() ?? null}, ${displayName ?? null})
    `;

    await sql`
      INSERT INTO user_security (user_id) VALUES (${user.id})
    `;

    // Create session tokens
    const accessToken  = await signAccessToken({ sub: user.id, role: "USER" }, env);
    const refreshToken = await signRefreshToken({ sub: user.id, tokenId: user.id }, env);
    const expiresAt    = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const [session] = await sql`
      INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
      VALUES (
        ${user.id}, ${hashToken(refreshToken)},
        ${req.ip}, ${req.headers["user-agent"] ?? null}, ${expiresAt}, now()
      )
      RETURNING id
    `;

    return reply.code(201).send({
      data: {
        user:           { id: user.id, mobile: user.mobile, status: user.status },
        tokens:         { accessToken, refreshToken, expiresIn: 900, sessionId: session.id },
        requiresPinSetup: true, // mobile app should prompt PIN setup
      },
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/login/otp  — web & mobile first-time
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/login/otp", {
    schema: {
      body: {
        type: "object",
        required: ["otpToken"],
        properties: {
          otpToken: { type: "string" },
          platform: { type: "string", enum: ["web", "mobile", "ios", "android"] },
        },
      },
    },
  }, async (req, reply) => {
    const { otpToken, platform } = req.body as { otpToken: string; platform?: string };

    let tokenData: { mobile: string; purpose: string };
    try {
      tokenData = await verifyOtpToken(otpToken, env);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired OTP token" });
    }

    if (tokenData.purpose !== "login") {
      return reply.code(400).send({ error: "Invalid token purpose" });
    }

    const [user] = await sql`
      SELECT u.id, u.mobile, u.status,
             us.pin_hash, us.pin_locked_until, us.failed_pin_attempts
      FROM users u
      JOIN user_security us ON us.user_id = u.id
      WHERE u.mobile = ${tokenData.mobile} AND u.deleted_at IS NULL
      LIMIT 1
    `;

    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    if (user.status === "SUSPENDED" || user.status === "CLOSED") {
      return reply.code(403).send({ error: `Account is ${user.status.toLowerCase()}` });
    }

    // If mobile platform and no PIN set yet → return setupToken for PIN setup
    const isMobile = platform && platform !== "web";
    if (isMobile && !user.pin_hash) {
      const setupToken = await signOtpToken({ mobile: tokenData.mobile, purpose: "pin_set" }, env);
      return reply.send({
        data: {
          requiresPinSetup: true,
          setupToken,
          message: "Please set a PIN for future mobile logins",
        },
      });
    }

    // Issue tokens
    await sql`
      UPDATE users SET last_login_at = now() WHERE id = ${user.id}
    `;

    const accessToken  = await signAccessToken({ sub: user.id, role: "USER" }, env);
    const refreshToken = await signRefreshToken({ sub: user.id, tokenId: user.id }, env);
    const expiresAt    = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const [session] = await sql`
      INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
      VALUES (
        ${user.id}, ${hashToken(refreshToken)},
        ${req.ip}, ${req.headers["user-agent"] ?? null}, ${expiresAt}, now()
      )
      RETURNING id
    `;

    return reply.send({
      data: {
        user:   { id: user.id, mobile: user.mobile, status: user.status },
        tokens: { accessToken, refreshToken, expiresIn: 900, sessionId: session.id },
      },
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/login/pin  — mobile subsequent logins
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/login/pin", {
    schema: {
      body: {
        type: "object",
        required: ["mobile", "pin"],
        properties: {
          mobile: { type: "string", minLength: 7, maxLength: 20 },
          pin:    { type: "string", minLength: 4, maxLength: 8 },
        },
      },
    },
  }, async (req, reply) => {
    const { mobile, pin } = req.body as { mobile: string; pin: string };

    const [user] = await sql`
      SELECT u.id, u.mobile, u.status,
             us.id AS security_id,
             us.pin_hash, us.pin_locked_until,
             us.failed_pin_attempts
      FROM users u
      JOIN user_security us ON us.user_id = u.id
      WHERE u.mobile = ${mobile.trim()} AND u.deleted_at IS NULL
      LIMIT 1
    `;

    if (!user) {
      return reply.code(401).send({ error: "Invalid mobile or PIN" });
    }

    if (user.status === "SUSPENDED" || user.status === "CLOSED") {
      return reply.code(403).send({ error: `Account is ${user.status.toLowerCase()}` });
    }

    if (!user.pin_hash) {
      return reply.code(400).send({ error: "PIN not set. Please login with OTP first." });
    }

    // PIN lockout check
    if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
      const unlockAt = new Date(user.pin_locked_until).toISOString();
      return reply.code(429).send({
        error: `Too many failed PIN attempts. Account locked until ${unlockAt}.`,
      });
    }

    // Verify PIN (stored as argon2 hash)
    const valid = await verifyPassword(user.pin_hash, pin);
    if (!valid) {
      const newAttempts = (user.failed_pin_attempts ?? 0) + 1;
      const locked = newAttempts >= PIN_MAX_ATTEMPTS;

      await sql`
        UPDATE user_security
        SET failed_pin_attempts = ${newAttempts},
            pin_locked_until = ${locked ? new Date(Date.now() + PIN_LOCK_MINUTES * 60_000) : null}
        WHERE id = ${user.security_id}
      `;

      const remaining = PIN_MAX_ATTEMPTS - newAttempts;
      if (locked) {
        return reply.code(429).send({
          error: `Too many incorrect PINs. Account locked for ${PIN_LOCK_MINUTES} minutes.`,
        });
      }
      return reply.code(401).send({
        error: `Incorrect PIN. ${remaining} attempt(s) remaining.`,
      });
    }

    // Reset failed attempts
    await sql`
      UPDATE user_security
      SET failed_pin_attempts = 0, pin_locked_until = NULL
      WHERE id = ${user.security_id}
    `;
    await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;

    const accessToken  = await signAccessToken({ sub: user.id, role: "USER" }, env);
    const refreshToken = await signRefreshToken({ sub: user.id, tokenId: user.id }, env);
    const expiresAt    = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const [session] = await sql`
      INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
      VALUES (
        ${user.id}, ${hashToken(refreshToken)},
        ${req.ip}, ${req.headers["user-agent"] ?? null}, ${expiresAt}, now()
      )
      RETURNING id
    `;

    return reply.send({
      data: {
        user:   { id: user.id, mobile: user.mobile, status: user.status },
        tokens: { accessToken, refreshToken, expiresIn: 900, sessionId: session.id },
      },
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/pin/set — set PIN (first time / OTP reset)
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/pin/set", {
    schema: {
      body: {
        type: "object",
        required: ["setupToken", "pin"],
        properties: {
          setupToken: { type: "string" },
          pin:        { type: "string", minLength: 4, maxLength: 8, pattern: "^[0-9]+$" },
        },
      },
    },
  }, async (req, reply) => {
    const { setupToken, pin } = req.body as { setupToken: string; pin: string };

    let tokenData: { mobile: string; purpose: string };
    try {
      tokenData = await verifyOtpToken(setupToken, env);
    } catch {
      return reply.code(401).send({ error: "Invalid or expired setup token" });
    }

    if (tokenData.purpose !== "pin_set" && tokenData.purpose !== "login") {
      return reply.code(400).send({ error: "Invalid token purpose for PIN setup" });
    }

    const [user] = await sql`
      SELECT u.id, us.id AS security_id
      FROM users u
      JOIN user_security us ON us.user_id = u.id
      WHERE u.mobile = ${tokenData.mobile} AND u.deleted_at IS NULL
      LIMIT 1
    `;

    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const pinHash = await hashPassword(pin);

    await sql`
      UPDATE user_security
      SET pin_hash = ${pinHash},
          pin_set_at = now(),
          failed_pin_attempts = 0,
          pin_locked_until = NULL
      WHERE id = ${user.security_id}
    `;

    // Issue session tokens so user is logged in after PIN setup
    await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`;

    const accessToken  = await signAccessToken({ sub: user.id, role: "USER" }, env);
    const refreshToken = await signRefreshToken({ sub: user.id, tokenId: user.id }, env);
    const expiresAt    = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const [session] = await sql`
      INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
      VALUES (
        ${user.id}, ${hashToken(refreshToken)},
        ${req.ip}, ${req.headers["user-agent"] ?? null}, ${expiresAt}, now()
      )
      RETURNING id
    `;

    return reply.send({
      data: {
        message: "PIN set successfully",
        tokens:  { accessToken, refreshToken, expiresIn: 900, sessionId: session.id },
      },
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/pin/change — change PIN (requires auth token)
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/pin/change", {
    schema: {
      body: {
        type: "object",
        required: ["newPin"],
        properties: {
          currentPin: { type: "string", minLength: 4, maxLength: 8 },
          otpToken:   { type: "string" },
          newPin:     { type: "string", minLength: 4, maxLength: 8, pattern: "^[0-9]+$" },
        },
      },
    },
  }, async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    const { currentPin, otpToken, newPin } = req.body as {
      currentPin?: string; otpToken?: string; newPin: string;
    };

    // Verify user from access token
    let userId: string;
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
      const { payload } = await jwtVerify(authHeader.slice(7), secret);
      userId = payload.sub as string;
    } catch {
      return reply.code(401).send({ error: "Invalid access token" });
    }

    const [user] = await sql`
      SELECT u.id, us.id AS security_id, us.pin_hash
      FROM users u
      JOIN user_security us ON us.user_id = u.id
      WHERE u.id = ${userId} AND u.deleted_at IS NULL
      LIMIT 1
    `;

    if (!user) return reply.code(404).send({ error: "User not found" });

    // Verify identity via current PIN or OTP token
    if (otpToken) {
      try {
        const tokenData = await verifyOtpToken(otpToken, env);
        if (tokenData.purpose !== "pin_change") {
          return reply.code(400).send({ error: "Invalid OTP token purpose" });
        }
      } catch {
        return reply.code(401).send({ error: "Invalid or expired OTP token" });
      }
    } else if (currentPin) {
      if (!user.pin_hash) {
        return reply.code(400).send({ error: "No PIN set yet. Use /pin/set instead." });
      }
      const valid = await verifyPassword(user.pin_hash, currentPin);
      if (!valid) {
        return reply.code(401).send({ error: "Current PIN is incorrect" });
      }
    } else {
      return reply.code(400).send({ error: "Provide currentPin or otpToken to authorize PIN change" });
    }

    const pinHash = await hashPassword(newPin);
    await sql`
      UPDATE user_security
      SET pin_hash = ${pinHash}, pin_set_at = now(),
          failed_pin_attempts = 0, pin_locked_until = NULL
      WHERE id = ${user.security_id}
    `;

    return reply.send({ data: { message: "PIN changed successfully" } });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/refresh
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/refresh", {
    schema: {
      body: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string };

    let payload: any;
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
      const result = await jwtVerify(refreshToken, secret);
      payload = result.payload;
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }

    const tokenHash = hashToken(refreshToken);
    const [session] = await sql`
      SELECT * FROM user_sessions
      WHERE refresh_token_hash = ${tokenHash}
        AND revoked_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `;

    if (!session) {
      return reply.code(401).send({ error: "Session not found or expired" });
    }

    // Revoke old session
    await sql`UPDATE user_sessions SET revoked_at = now() WHERE id = ${session.id}`;

    const newAccessToken  = await signAccessToken({ sub: session.user_id, role: "USER" }, env);
    const newRefreshToken = await signRefreshToken({ sub: session.user_id, tokenId: session.id }, env);
    const expiresAt       = parseRefreshExpiry(env.JWT_REFRESH_EXPIRES_IN);

    const [newSession] = await sql`
      INSERT INTO user_sessions (user_id, refresh_token_hash, ip_address, user_agent, expires_at, last_used_at)
      VALUES (
        ${session.user_id}, ${hashToken(newRefreshToken)},
        ${req.ip}, ${req.headers["user-agent"] ?? null}, ${expiresAt}, now()
      )
      RETURNING id
    `;

    return reply.send({
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900,
          sessionId: newSession.id,
        },
      },
    });
  });

  // ──────────────────────────────────────────────────────
  // POST /api/v1/auth/logout
  // ──────────────────────────────────────────────────────
  app.post("/api/v1/auth/logout", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await sql`
        UPDATE user_sessions SET revoked_at = now()
        WHERE refresh_token_hash = ${tokenHash} AND revoked_at IS NULL
      `;
    }

    return reply.send({ data: { message: "Logged out successfully" } });
  });
}
