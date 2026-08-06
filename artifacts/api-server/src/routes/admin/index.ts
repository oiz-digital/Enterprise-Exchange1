import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../../config/env.js";
import { registerAdminAuthHook } from "../../middleware/admin-auth.js";
import { registerAdminAuthRoutes } from "./auth.js";
import { registerAdminDashboardRoutes } from "./dashboard.js";
import { registerAdminUsersRoutes } from "./users.js";
import { registerAdminMarketsRoutes } from "./markets.js";
import { registerAdminAssetsRoutes } from "./assets.js";
import { registerAdminOrdersRoutes } from "./orders.js";
import { registerAdminFundsRoutes } from "./funds.js";
import { registerAdminKycRoutes } from "./kyc.js";
import { registerAdminFeesRoutes } from "./fees.js";
import { registerAdminSettingsRoutes } from "./settings.js";
import { registerAdminAuditRoutes } from "./audit.js";
import { registerAdminRiskRoutes } from "./risk.js";
import { registerAdminAdminsRoutes } from "./admins.js";
import { registerAdminStakingRoutes } from "./staking.js";
import { registerAdminP2pRoutes } from "./p2p.js";
import { registerAdminMiscRoutes } from "./misc.js";
import { registerAdminCountriesRoutes } from "./countries.js";

export async function registerAdminRoutes(
  app: FastifyInstance,
  { sql, env }: { sql: any; env: AppEnv },
): Promise<void> {
  // Register the verifyAdmin decorator (idempotent)
  registerAdminAuthHook(app, env);

  const deps = { sql, env };
  const sqlDeps = { sql };

  await Promise.all([
    registerAdminAuthRoutes(app, deps),
    registerAdminDashboardRoutes(app, sqlDeps),
    registerAdminUsersRoutes(app, sqlDeps),
    registerAdminMarketsRoutes(app, sqlDeps),
    registerAdminAssetsRoutes(app, sqlDeps),
    registerAdminOrdersRoutes(app, sqlDeps),
    registerAdminFundsRoutes(app, sqlDeps),
    registerAdminKycRoutes(app, sqlDeps),
    registerAdminFeesRoutes(app, sqlDeps),
    registerAdminSettingsRoutes(app, sqlDeps),
    registerAdminAuditRoutes(app, sqlDeps),
    registerAdminRiskRoutes(app, sqlDeps),
    registerAdminAdminsRoutes(app, sqlDeps),
    registerAdminStakingRoutes(app, sqlDeps),
    registerAdminP2pRoutes(app, sqlDeps),
    registerAdminMiscRoutes(app, sqlDeps),
    registerAdminCountriesRoutes(app, sqlDeps),
  ]);
}
