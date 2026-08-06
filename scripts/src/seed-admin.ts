import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const databaseUrl = process.env.DATABASE_URL;
const email = (process.env.ADMIN_SEED_EMAIL ?? "admin@zebvix.com").trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!password || password.length < 12) {
  throw new Error("ADMIN_SEED_PASSWORD is required and must be at least 12 characters");
}

if (!email.includes("@")) {
  throw new Error("ADMIN_SEED_EMAIL must be a valid email address");
}

const sql = postgres(databaseUrl, { max: 1 });
const passwordHash = await hash(password, {
  algorithm: 2,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

const permissionCodes = [
  "admin.read",
  "admin.write",
  "users.read",
  "users.write",
  "kyc.read",
  "kyc.write",
  "assets.read",
  "assets.write",
  "networks.read",
  "networks.write",
  "markets.read",
  "markets.write",
  "wallets.read",
  "wallets.write",
  "deposits.read",
  "deposits.write",
  "withdrawals.read",
  "withdrawals.write",
  "orders.read",
  "orders.write",
  "trades.read",
  "trades.write",
  "staking.read",
  "staking.write",
  "p2p.read",
  "p2p.write",
  "referrals.read",
  "referrals.write",
  "fees.read",
  "fees.write",
  "risk.read",
  "risk.write",
  "notifications.read",
  "notifications.write",
  "reports.read",
  "reports.write",
  "audit.read",
  "settings.read",
  "settings.write",
];

try {
  await sql.begin(async (tx) => {
    const [admin] = await tx`
      INSERT INTO admin_users (email, password_hash, status, mfa_enabled)
      VALUES (${email}, ${passwordHash}, 'ACTIVE', false)
      ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          status = 'ACTIVE',
          deleted_at = NULL,
          updated_at = now()
      RETURNING id, email
    `;

    const [role] = await tx`
      INSERT INTO roles (code, display_name, description, is_system)
      VALUES ('SUPER_ADMIN', 'Super admin', 'Full exchange administration access', true)
      ON CONFLICT (code) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          description = EXCLUDED.description
      RETURNING id, code
    `;

    await tx`
      INSERT INTO admin_roles (admin_id, role_id, assigned_by)
      VALUES (${admin.id}, ${role.id}, ${admin.id})
      ON CONFLICT (admin_id, role_id) DO NOTHING
    `;

    for (const code of permissionCodes) {
      const [permission] = await tx`
        INSERT INTO permissions (code, description)
        VALUES (${code}, ${`Super admin permission: ${code}`})
        ON CONFLICT (code) DO UPDATE
        SET description = EXCLUDED.description
        RETURNING id
      `;

      await tx`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (${role.id}, ${permission.id})
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `;
    }

    console.log(`Seeded admin ${admin.email} with role ${role.code}`);
  });
} finally {
  await sql.end({ timeout: 5 });
}