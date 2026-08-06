/**
 * seed-exchange.ts
 *
 * Full exchange bootstrap seed — idempotent (safe to re-run).
 *
 * Seeds:
 *   1. Default Super Admin  (admin@zebvix.com / Admin@Zebvix2024)
 *   2. Blockchain Networks  (ETH, BSC, TRX, SOL, BTC, Polygon, Arbitrum, …)
 *   3. Asset-Networks       (multi-network per coin — USDT on 7 chains, etc.)
 *   4. Fee Rules            (global default + per-market overrides)
 *   5. System Settings      (deposit/withdrawal toggles, limits, exchange config)
 *   6. Feature Flags
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:exchange
 *
 * Env:
 *   DATABASE_URL          — Postgres connection string (required)
 *   ADMIN_SEED_EMAIL      — defaults to admin@zebvix.com
 *   ADMIN_SEED_PASSWORD   — defaults to Admin@Zebvix2024 (CHANGE IN PROD)
 */

import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const ADMIN_EMAIL    = (process.env.ADMIN_SEED_EMAIL    ?? "admin@zebvix.com").trim().toLowerCase();
const ADMIN_PASSWORD =  process.env.ADMIN_SEED_PASSWORD ?? "Admin@Zebvix2024";

const sql = postgres(DATABASE_URL, { max: 3 });

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEFAULT SUPER ADMIN
// ─────────────────────────────────────────────────────────────────────────────

console.log("👤 Seeding default admin...");

const passwordHash = await hash(ADMIN_PASSWORD, {
  algorithm: 2,       // Argon2id
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
});

const permissionCodes = [
  "admin.read",        "admin.write",
  "users.read",        "users.write",
  "kyc.read",          "kyc.write",
  "assets.read",       "assets.write",
  "networks.read",     "networks.write",
  "markets.read",      "markets.write",
  "wallets.read",      "wallets.write",
  "deposits.read",     "deposits.write",
  "withdrawals.read",  "withdrawals.write",
  "orders.read",       "orders.write",
  "trades.read",       "trades.write",
  "staking.read",      "staking.write",
  "p2p.read",          "p2p.write",
  "referrals.read",    "referrals.write",
  "fees.read",         "fees.write",
  "risk.read",         "risk.write",
  "notifications.read","notifications.write",
  "reports.read",      "reports.write",
  "audit.read",
  "settings.read",     "settings.write",
];

const adminId = await sql.begin(async (tx) => {
  const [admin] = await tx`
    INSERT INTO admin_users (email, password_hash, status, mfa_enabled)
    VALUES (${ADMIN_EMAIL}, ${passwordHash}, 'ACTIVE', false)
    ON CONFLICT (email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          status        = 'ACTIVE',
          deleted_at    = NULL,
          updated_at    = now()
    RETURNING id, email
  `;

  const [role] = await tx`
    INSERT INTO roles (code, display_name, description, is_system)
    VALUES ('SUPER_ADMIN', 'Super Admin', 'Full exchange administration access', true)
    ON CONFLICT (code) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          description  = EXCLUDED.description
    RETURNING id, code
  `;

  await tx`
    INSERT INTO admin_roles (admin_id, role_id, assigned_by)
    VALUES (${admin.id}, ${role.id}, ${admin.id})
    ON CONFLICT (admin_id, role_id) DO NOTHING
  `;

  for (const code of permissionCodes) {
    const [perm] = await tx`
      INSERT INTO permissions (code, description)
      VALUES (${code}, ${`Permission: ${code}`})
      ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    `;
    await tx`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (${role.id}, ${perm.id})
      ON CONFLICT (role_id, permission_id) DO NOTHING
    `;
  }

  console.log(`  ✅ Admin: ${admin.email}  (role: ${role.code})`);
  return admin.id as string;
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BLOCKCHAIN NETWORKS
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n🌐 Seeding blockchain networks...");

/**
 * code          — unique key used in asset_networks
 * name          — human-readable
 * chainId       — EVM chain ID or native identifier
 * explorerUrl   — block explorer base URL
 * nativeSymbol  — native coin symbol (to link nativeAssetId after assets exist)
 */
const NETWORKS = [
  { code: "ETH",      name: "Ethereum Mainnet",       chainId: "1",          explorerUrl: "https://etherscan.io",           nativeSymbol: "ETH"  },
  { code: "BSC",      name: "BNB Smart Chain",         chainId: "56",         explorerUrl: "https://bscscan.com",            nativeSymbol: "BNB"  },
  { code: "TRX",      name: "TRON Network",            chainId: "tron",       explorerUrl: "https://tronscan.org",           nativeSymbol: "TRX"  },
  { code: "SOL",      name: "Solana",                  chainId: "solana",     explorerUrl: "https://solscan.io",             nativeSymbol: "SOL"  },
  { code: "BTC",      name: "Bitcoin Network",         chainId: "bitcoin",    explorerUrl: "https://mempool.space",          nativeSymbol: "BTC"  },
  { code: "POLYGON",  name: "Polygon (Matic)",         chainId: "137",        explorerUrl: "https://polygonscan.com",        nativeSymbol: "MATIC"},
  { code: "ARB",      name: "Arbitrum One",            chainId: "42161",      explorerUrl: "https://arbiscan.io",            nativeSymbol: "ETH"  },
  { code: "OP",       name: "Optimism",                chainId: "10",         explorerUrl: "https://optimistic.etherscan.io",nativeSymbol: "ETH"  },
  { code: "AVAX",     name: "Avalanche C-Chain",       chainId: "43114",      explorerUrl: "https://snowtrace.io",           nativeSymbol: "AVAX" },
  { code: "LTC",      name: "Litecoin Network",        chainId: "litecoin",   explorerUrl: "https://blockchair.com/litecoin",nativeSymbol: "LTC"  },
  { code: "DOGE",     name: "Dogecoin Network",        chainId: "dogecoin",   explorerUrl: "https://blockchair.com/dogecoin",nativeSymbol: "DOGE" },
  { code: "XRP",      name: "XRP Ledger",              chainId: "xrpl",       explorerUrl: "https://xrpscan.com",            nativeSymbol: "XRP"  },
  { code: "ADA",      name: "Cardano",                 chainId: "cardano",    explorerUrl: "https://cardanoscan.io",         nativeSymbol: "ADA"  },
  { code: "DOT",      name: "Polkadot",                chainId: "polkadot",   explorerUrl: "https://polkadot.subscan.io",    nativeSymbol: "DOT"  },
  { code: "ATOM",     name: "Cosmos Hub",              chainId: "cosmoshub-4",explorerUrl: "https://www.mintscan.io/cosmos", nativeSymbol: "ATOM" },
  { code: "XLM",      name: "Stellar",                 chainId: "stellar",    explorerUrl: "https://stellar.expert",         nativeSymbol: "XLM"  },
  { code: "NEAR",     name: "NEAR Protocol",           chainId: "near",       explorerUrl: "https://nearblocks.io",          nativeSymbol: "NEAR" },
  { code: "FTM",      name: "Fantom Opera",            chainId: "250",        explorerUrl: "https://ftmscan.com",            nativeSymbol: "FTM"  },
  { code: "HBAR",     name: "Hedera",                  chainId: "hedera",     explorerUrl: "https://hashscan.io",            nativeSymbol: "HBAR" },
  { code: "TON",      name: "TON Blockchain",          chainId: "ton",        explorerUrl: "https://tonscan.org",            nativeSymbol: "TON"  },
] as const;

// Upsert networks, resolve native asset IDs where possible
const networkIdMap = new Map<string, string>(); // code → uuid

for (const net of NETWORKS) {
  // Try to find the native asset
  const [nativeAsset] = await sql`
    SELECT id FROM assets WHERE symbol = ${net.nativeSymbol} LIMIT 1
  `;

  const [row] = await sql`
    INSERT INTO networks (code, name, chain_id, explorer_url, native_asset_id, status)
    VALUES (
      ${net.code},
      ${net.name},
      ${net.chainId},
      ${net.explorerUrl},
      ${nativeAsset?.id ?? null},
      'ACTIVE'
    )
    ON CONFLICT (code) DO UPDATE
      SET name             = EXCLUDED.name,
          chain_id         = EXCLUDED.chain_id,
          explorer_url     = EXCLUDED.explorer_url,
          native_asset_id  = EXCLUDED.native_asset_id,
          updated_at       = now()
    RETURNING id
  `;

  networkIdMap.set(net.code, row.id);
  console.log(`  ✅ ${net.code.padEnd(8)} ${net.name}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ASSET-NETWORK MAPPINGS  (multi-network per coin)
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n🔗 Seeding asset-network mappings...");

/**
 * symbol         — matches assets.symbol
 * network        — matches NETWORKS[].code
 * contract       — on-chain contract/address (null for native coins)
 * minDeposit     — minimum deposit amount
 * minWithdrawal  — minimum withdrawal amount
 * withdrawalFee  — flat fee in the asset itself
 * confirmations  — blocks needed before credit
 * depositEnabled
 * withdrawalEnabled
 */
const ASSET_NETWORKS: Array<{
  symbol: string;
  network: string;
  contract: string | null;
  minDeposit: string;
  minWithdrawal: string;
  withdrawalFee: string;
  confirmations: number;
  depositEnabled?: boolean;
  withdrawalEnabled?: boolean;
}> = [
  // ── BTC ────────────────────────────────────────────────────────────────────
  { symbol:"BTC",  network:"BTC",     contract:null,                                           minDeposit:"0.0001",   minWithdrawal:"0.001",   withdrawalFee:"0.0005",   confirmations:3  },
  { symbol:"BTC",  network:"BSC",     contract:"0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", minDeposit:"0.0001",   minWithdrawal:"0.0005",  withdrawalFee:"0.0001",   confirmations:15 },

  // ── ETH ────────────────────────────────────────────────────────────────────
  { symbol:"ETH",  network:"ETH",     contract:null,                                           minDeposit:"0.01",     minWithdrawal:"0.02",    withdrawalFee:"0.005",    confirmations:12 },
  { symbol:"ETH",  network:"BSC",     contract:"0x2170Ed0880ac9A755fd29B2688956BD959F933F", minDeposit:"0.01",     minWithdrawal:"0.01",    withdrawalFee:"0.001",    confirmations:15 },
  { symbol:"ETH",  network:"ARB",     contract:null,                                           minDeposit:"0.001",    minWithdrawal:"0.005",   withdrawalFee:"0.001",    confirmations:1  },
  { symbol:"ETH",  network:"OP",      contract:null,                                           minDeposit:"0.001",    minWithdrawal:"0.005",   withdrawalFee:"0.001",    confirmations:1  },
  { symbol:"ETH",  network:"POLYGON", contract:"0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", minDeposit:"0.001",    minWithdrawal:"0.005",   withdrawalFee:"0.001",    confirmations:200},

  // ── BNB ────────────────────────────────────────────────────────────────────
  { symbol:"BNB",  network:"BSC",     contract:null,                                           minDeposit:"0.01",     minWithdrawal:"0.02",    withdrawalFee:"0.005",    confirmations:15 },
  { symbol:"BNB",  network:"ETH",     contract:"0xB8c77482e45F1F44dE1745F52C74426C631bDD52", minDeposit:"0.01",     minWithdrawal:"0.02",    withdrawalFee:"0.005",    confirmations:12 },

  // ── USDT ───────────────────────────────────────────────────────────────────
  { symbol:"USDT", network:"ETH",     contract:"0xdAC17F958D2ee523a2206206994597C13D831ec7", minDeposit:"10",       minWithdrawal:"20",      withdrawalFee:"15",       confirmations:12 },
  { symbol:"USDT", network:"BSC",     contract:"0x55d398326f99059fF775485246999027B3197955", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:15 },
  { symbol:"USDT", network:"TRX",     contract:"TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",        minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:20 },
  { symbol:"USDT", network:"SOL",     contract:"Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",minDeposit:"1",       minWithdrawal:"5",       withdrawalFee:"1",        confirmations:1  },
  { symbol:"USDT", network:"POLYGON", contract:"0xc2132D05D31c914a87C6611C10748AEb04B58e8F", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:200},
  { symbol:"USDT", network:"ARB",     contract:"0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:1  },
  { symbol:"USDT", network:"AVAX",    contract:"0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"2",        confirmations:1  },

  // ── USDC ───────────────────────────────────────────────────────────────────
  { symbol:"USDC", network:"ETH",     contract:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", minDeposit:"10",       minWithdrawal:"20",      withdrawalFee:"10",       confirmations:12 },
  { symbol:"USDC", network:"BSC",     contract:"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:15 },
  { symbol:"USDC", network:"SOL",     contract:"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",minDeposit:"1",       minWithdrawal:"5",       withdrawalFee:"1",        confirmations:1  },
  { symbol:"USDC", network:"POLYGON", contract:"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:200},
  { symbol:"USDC", network:"ARB",     contract:"0xaf88d065e77c8cC2239327C5EDb3A432268e5831", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:1  },
  { symbol:"USDC", network:"OP",      contract:"0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:1  },
  { symbol:"USDC", network:"AVAX",    contract:"0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"2",        confirmations:1  },

  // ── SOL ────────────────────────────────────────────────────────────────────
  { symbol:"SOL",  network:"SOL",     contract:null,                                           minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.01",     confirmations:1  },
  { symbol:"SOL",  network:"BSC",     contract:"0x570A5D26f7765Ecb712C0924E4De545B89fD43dF", minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.02",     confirmations:15 },

  // ── XRP ────────────────────────────────────────────────────────────────────
  { symbol:"XRP",  network:"XRP",     contract:null,                                           minDeposit:"5",        minWithdrawal:"10",      withdrawalFee:"0.25",     confirmations:6  },
  { symbol:"XRP",  network:"BSC",     contract:"0x1D2F0da169ceB9bC033094E4c7B3D3E6Cd3e7a9", minDeposit:"5",        minWithdrawal:"10",      withdrawalFee:"0.5",      confirmations:15 },

  // ── ADA ────────────────────────────────────────────────────────────────────
  { symbol:"ADA",  network:"ADA",     contract:null,                                           minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:15 },
  { symbol:"ADA",  network:"BSC",     contract:"0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"0.5",      confirmations:15 },

  // ── DOGE ───────────────────────────────────────────────────────────────────
  { symbol:"DOGE", network:"DOGE",    contract:null,                                           minDeposit:"50",       minWithdrawal:"100",     withdrawalFee:"5",        confirmations:6  },
  { symbol:"DOGE", network:"BSC",     contract:"0xbA2aE424d960c26247Dd6c32edC70B295c744C43", minDeposit:"50",       minWithdrawal:"100",     withdrawalFee:"2",        confirmations:15 },

  // ── LTC ────────────────────────────────────────────────────────────────────
  { symbol:"LTC",  network:"LTC",     contract:null,                                           minDeposit:"0.01",     minWithdrawal:"0.05",    withdrawalFee:"0.001",    confirmations:6  },
  { symbol:"LTC",  network:"BSC",     contract:"0x4338665CBB7B2485A8855A139b75D5e34AB0DB94", minDeposit:"0.01",     minWithdrawal:"0.05",    withdrawalFee:"0.005",    confirmations:15 },

  // ── TRX ────────────────────────────────────────────────────────────────────
  { symbol:"TRX",  network:"TRX",     contract:null,                                           minDeposit:"10",       minWithdrawal:"20",      withdrawalFee:"1",        confirmations:20 },
  { symbol:"TRX",  network:"BSC",     contract:"0xCE7de646e7208a4Ef112cb6ed5038FA6cC6b12e3", minDeposit:"10",       minWithdrawal:"20",      withdrawalFee:"1",        confirmations:15 },

  // ── DOT ────────────────────────────────────────────────────────────────────
  { symbol:"DOT",  network:"DOT",     contract:null,                                           minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.1",      confirmations:1  },
  { symbol:"DOT",  network:"BSC",     contract:"0x7083609fCE4d1d8Dc0C979AAb8cf988a5B4F6cD", minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.05",     confirmations:15 },

  // ── LINK ───────────────────────────────────────────────────────────────────
  { symbol:"LINK", network:"ETH",     contract:"0x514910771AF9Ca656af840dff83E8264EcF986CA", minDeposit:"1",        minWithdrawal:"2",       withdrawalFee:"0.5",      confirmations:12 },
  { symbol:"LINK", network:"BSC",     contract:"0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD", minDeposit:"0.5",     minWithdrawal:"1",       withdrawalFee:"0.2",      confirmations:15 },
  { symbol:"LINK", network:"ARB",     contract:"0xf97f4df75117a78c1A5a0DBb814Af92458539FB2", minDeposit:"0.5",     minWithdrawal:"1",       withdrawalFee:"0.2",      confirmations:1  },

  // ── AVAX ───────────────────────────────────────────────────────────────────
  { symbol:"AVAX", network:"AVAX",    contract:null,                                           minDeposit:"0.1",      minWithdrawal:"0.2",     withdrawalFee:"0.01",     confirmations:1  },
  { symbol:"AVAX", network:"BSC",     contract:"0x1CE0c2827e2eF14D5C4f29a091d735A204794041", minDeposit:"0.1",      minWithdrawal:"0.2",     withdrawalFee:"0.02",     confirmations:15 },

  // ── MATIC ──────────────────────────────────────────────────────────────────
  { symbol:"MATIC",network:"ETH",     contract:"0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", minDeposit:"5",        minWithdrawal:"10",      withdrawalFee:"3",        confirmations:12 },
  { symbol:"MATIC",network:"BSC",     contract:"0xCC42724C6683B7E57334c4E856f4c9965ED682bD", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:15 },
  { symbol:"MATIC",network:"POLYGON", contract:null,                                           minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"0.1",      confirmations:200},

  // ── UNI ────────────────────────────────────────────────────────────────────
  { symbol:"UNI",  network:"ETH",     contract:"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", minDeposit:"0.5",      minWithdrawal:"1",       withdrawalFee:"0.5",      confirmations:12 },
  { symbol:"UNI",  network:"BSC",     contract:"0xBf5140A22578168FD562DCcF235E5D43A02ce9B1", minDeposit:"0.5",      minWithdrawal:"1",       withdrawalFee:"0.2",      confirmations:15 },
  { symbol:"UNI",  network:"POLYGON", contract:"0xb33EaAd8d922B1083446DC23f610c2567fB5180f", minDeposit:"0.5",      minWithdrawal:"1",       withdrawalFee:"0.2",      confirmations:200},

  // ── AAVE ───────────────────────────────────────────────────────────────────
  { symbol:"AAVE", network:"ETH",     contract:"0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", minDeposit:"0.05",     minWithdrawal:"0.1",     withdrawalFee:"0.02",     confirmations:12 },
  { symbol:"AAVE", network:"BSC",     contract:"0xfb6115445Bff7b52FeB98650C87f44907E58f802", minDeposit:"0.05",     minWithdrawal:"0.1",     withdrawalFee:"0.01",     confirmations:15 },

  // ── FET ────────────────────────────────────────────────────────────────────
  { symbol:"FET",  network:"ETH",     contract:"0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85", minDeposit:"10",       minWithdrawal:"20",      withdrawalFee:"5",        confirmations:12 },
  { symbol:"FET",  network:"BSC",     contract:"0x031b41e504677879370e9DBcF937283A8691Fa7f", minDeposit:"5",        minWithdrawal:"10",      withdrawalFee:"2",        confirmations:15 },

  // ── NEAR ───────────────────────────────────────────────────────────────────
  { symbol:"NEAR", network:"NEAR",    contract:null,                                           minDeposit:"1",        minWithdrawal:"2",       withdrawalFee:"0.1",      confirmations:1  },
  { symbol:"NEAR", network:"BSC",     contract:"0x1Fa4a73a3F0133f0025378af00236f3aBDEE5D63", minDeposit:"1",        minWithdrawal:"2",       withdrawalFee:"0.2",      confirmations:15 },

  // ── XLM ────────────────────────────────────────────────────────────────────
  { symbol:"XLM",  network:"XLM",     contract:null,                                           minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"0.02",     confirmations:1  },

  // ── ATOM ───────────────────────────────────────────────────────────────────
  { symbol:"ATOM", network:"ATOM",    contract:null,                                           minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.01",     confirmations:1  },
  { symbol:"ATOM", network:"BSC",     contract:"0x0Eb3a705fc54725037CC9e008bDede697f62F335", minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.05",     confirmations:15 },

  // ── HBAR ───────────────────────────────────────────────────────────────────
  { symbol:"HBAR", network:"HBAR",    contract:null,                                           minDeposit:"10",       minWithdrawal:"20",      withdrawalFee:"1",        confirmations:1  },

  // ── ARB ────────────────────────────────────────────────────────────────────
  { symbol:"ARB",  network:"ARB",     contract:null,                                           minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:1  },
  { symbol:"ARB",  network:"ETH",     contract:"0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"2",        confirmations:12 },

  // ── OP ─────────────────────────────────────────────────────────────────────
  { symbol:"OP",   network:"OP",      contract:null,                                           minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"0.5",      confirmations:1  },
  { symbol:"OP",   network:"ETH",     contract:"0x4200000000000000000000000000000000000042", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:12 },

  // ── LDO ────────────────────────────────────────────────────────────────────
  { symbol:"LDO",  network:"ETH",     contract:"0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"2",        confirmations:12 },
  { symbol:"LDO",  network:"BSC",     contract:"0x986854779804FEF44E62b5AbB4b5A6C9cA4a6a1", minDeposit:"1",        minWithdrawal:"5",       withdrawalFee:"1",        confirmations:15 },

  // ── SHIB ───────────────────────────────────────────────────────────────────
  { symbol:"SHIB", network:"ETH",     contract:"0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", minDeposit:"100000",   minWithdrawal:"500000",  withdrawalFee:"100000",   confirmations:12 },
  { symbol:"SHIB", network:"BSC",     contract:"0x2859e4544C4bB03966803b044A93563Bd2D0DD4", minDeposit:"100000",   minWithdrawal:"500000",  withdrawalFee:"50000",    confirmations:15 },

  // ── FIL ────────────────────────────────────────────────────────────────────
  { symbol:"FIL",  network:"FTM",     contract:null,                                           minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.05",     confirmations:1  },
  { symbol:"FIL",  network:"BSC",     contract:"0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153", minDeposit:"0.1",      minWithdrawal:"0.5",     withdrawalFee:"0.02",     confirmations:15 },

  // ── TON ────────────────────────────────────────────────────────────────────
  { symbol:"TON",  network:"TON",     contract:null,                                           minDeposit:"1",        minWithdrawal:"2",       withdrawalFee:"0.05",     confirmations:1  },
];

// Resolve asset IDs from DB
const assetRows = await sql`SELECT id, symbol FROM assets`;
const assetIdMap = new Map<string, string>(assetRows.map((r) => [r.symbol as string, r.id as string]));

let anCount = 0;
for (const an of ASSET_NETWORKS) {
  const assetId   = assetIdMap.get(an.symbol);
  const networkId = networkIdMap.get(an.network);

  if (!assetId) {
    console.warn(`  ⚠️  Asset ${an.symbol} not found — run seed:coins first`);
    continue;
  }
  if (!networkId) {
    console.warn(`  ⚠️  Network ${an.network} not found`);
    continue;
  }

  await sql`
    INSERT INTO asset_networks (
      asset_id, network_id, contract_address,
      deposit_enabled, withdrawal_enabled,
      minimum_deposit, minimum_withdrawal, withdrawal_fee,
      required_confirmations
    )
    VALUES (
      ${assetId}, ${networkId}, ${an.contract ?? null},
      ${an.depositEnabled ?? true},
      ${an.withdrawalEnabled ?? true},
      ${an.minDeposit},
      ${an.minWithdrawal},
      ${an.withdrawalFee},
      ${an.confirmations}
    )
    ON CONFLICT (asset_id, network_id) DO UPDATE
      SET contract_address        = EXCLUDED.contract_address,
          deposit_enabled         = EXCLUDED.deposit_enabled,
          withdrawal_enabled      = EXCLUDED.withdrawal_enabled,
          minimum_deposit         = EXCLUDED.minimum_deposit,
          minimum_withdrawal      = EXCLUDED.minimum_withdrawal,
          withdrawal_fee          = EXCLUDED.withdrawal_fee,
          required_confirmations  = EXCLUDED.required_confirmations,
          updated_at              = now()
  `;
  anCount++;
}
console.log(`  ✅ ${anCount} asset-network mappings upserted`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. FEE RULES  (trading + withdrawal)
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n💸 Seeding fee rules...");

// Global default — no marketId / no assetId → applies to everything
await sql`
  INSERT INTO fee_rules (name, market_id, asset_id, maker_rate, taker_rate, withdrawal_rate, is_active)
  VALUES ('Global Default', null, null, '0.001', '0.001', '0.001', true)
  ON CONFLICT DO NOTHING
`;
console.log("  ✅ Global default fee rule  (maker: 0.10%  taker: 0.10%  withdrawal: 0.10%)");

// Per-market overrides for major pairs
type FeeRow = { name: string; symbol: string; maker: string; taker: string };
const MARKET_FEES: FeeRow[] = [
  { name: "BTC/USDT VIP",   symbol: "BTCUSDT",   maker: "0.0008", taker: "0.0008" },
  { name: "ETH/USDT VIP",   symbol: "ETHUSDT",   maker: "0.0008", taker: "0.0008" },
  { name: "BNB/USDT VIP",   symbol: "BNBUSDT",   maker: "0.0008", taker: "0.0008" },
  { name: "SOL/USDT VIP",   symbol: "SOLUSDT",   maker: "0.0009", taker: "0.0009" },
  { name: "XRP/USDT VIP",   symbol: "XRPUSDT",   maker: "0.0009", taker: "0.0009" },
  { name: "ADA/USDT VIP",   symbol: "ADAUSDT",   maker: "0.001",  taker: "0.001"  },
  { name: "DOGE/USDT VIP",  symbol: "DOGEUSDT",  maker: "0.001",  taker: "0.001"  },
  { name: "AVAX/USDT VIP",  symbol: "AVAXUSDT",  maker: "0.001",  taker: "0.001"  },
];

for (const mf of MARKET_FEES) {
  const [market] = await sql`SELECT id FROM markets WHERE symbol = ${mf.symbol} LIMIT 1`;
  if (!market) { console.warn(`  ⚠️  Market ${mf.symbol} not found`); continue; }

  await sql`
    INSERT INTO fee_rules (name, market_id, asset_id, maker_rate, taker_rate, withdrawal_rate, is_active)
    VALUES (${mf.name}, ${market.id}, null, ${mf.maker}, ${mf.taker}, '0.001', true)
    ON CONFLICT DO NOTHING
  `;
  console.log(`  ✅ ${mf.symbol.padEnd(12)} maker:${(parseFloat(mf.maker)*100).toFixed(2)}%  taker:${(parseFloat(mf.taker)*100).toFixed(2)}%`);
}

// Per-asset withdrawal fee rules for key assets
type AssetFeeRow = { name: string; symbol: string; withdrawal: string };
const ASSET_FEES: AssetFeeRow[] = [
  { name: "BTC Withdrawal Fee",  symbol: "BTC",  withdrawal: "0.0005"  },
  { name: "ETH Withdrawal Fee",  symbol: "ETH",  withdrawal: "0.005"   },
  { name: "USDT Withdrawal Fee", symbol: "USDT", withdrawal: "0.0005"  },
  { name: "USDC Withdrawal Fee", symbol: "USDC", withdrawal: "0.0005"  },
  { name: "BNB Withdrawal Fee",  symbol: "BNB",  withdrawal: "0.001"   },
  { name: "SOL Withdrawal Fee",  symbol: "SOL",  withdrawal: "0.001"   },
  { name: "XRP Withdrawal Fee",  symbol: "XRP",  withdrawal: "0.001"   },
];

for (const af of ASSET_FEES) {
  const [asset] = await sql`SELECT id FROM assets WHERE symbol = ${af.symbol} LIMIT 1`;
  if (!asset) continue;

  await sql`
    INSERT INTO fee_rules (name, market_id, asset_id, maker_rate, taker_rate, withdrawal_rate, is_active)
    VALUES (${af.name}, null, ${asset.id}, '0', '0', ${af.withdrawal}, true)
    ON CONFLICT DO NOTHING
  `;
  console.log(`  ✅ ${af.symbol.padEnd(8)} withdrawal fee: ${af.withdrawal}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SYSTEM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n⚙️  Seeding system settings...");

const SETTINGS: Array<{ key: string; value: unknown; description: string; isSecret?: boolean }> = [
  // Exchange identity
  { key: "exchange.name",             value: "Zebvix",                  description: "Exchange display name"              },
  { key: "exchange.tagline",          value: "Trade the future",        description: "Exchange tagline"                   },
  { key: "exchange.supportEmail",     value: "support@zebvix.com",      description: "Customer support email"             },
  { key: "exchange.maintenanceMode",  value: false,                     description: "Global maintenance mode switch"     },

  // Deposits
  { key: "deposit.enabled",           value: true,                      description: "Global deposits enabled/disabled"   },
  { key: "deposit.minConfirmations",  value: { BTC:3, ETH:12, TRX:20, SOL:1, BSC:15 }, description: "Default confirmations per network" },
  { key: "deposit.autoCredit",        value: true,                      description: "Auto-credit after confirmations"    },
  { key: "deposit.reviewThreshold",   value: { BTC:"0.5", ETH:"5", USDT:"50000" }, description: "Amounts requiring manual review"   },

  // Withdrawals
  { key: "withdrawal.enabled",        value: true,                      description: "Global withdrawals enabled/disabled"},
  { key: "withdrawal.autoApprove",    value: false,                     description: "Auto-approve small withdrawals"     },
  { key: "withdrawal.autoApproveMax", value: { BTC:"0.05", ETH:"0.5", USDT:"1000" }, description: "Auto-approve below this amount" },
  { key: "withdrawal.dailyLimitKyc0", value: { BTC:"0", ETH:"0", USDT:"0" },         description: "Daily limit for unverified users (0 = blocked)" },
  { key: "withdrawal.dailyLimitKyc1", value: { BTC:"0.5", ETH:"5", USDT:"5000" },    description: "Daily limit for KYC level 1"    },
  { key: "withdrawal.dailyLimitKyc2", value: { BTC:"5",   ETH:"50", USDT:"50000" },  description: "Daily limit for KYC level 2"    },
  { key: "withdrawal.cooldownMinutes",value: 30,                        description: "Cooldown between withdrawals (min)" },
  { key: "withdrawal.requireMfa",     value: true,                      description: "Require MFA for all withdrawals"    },

  // Trading
  { key: "trading.enabled",           value: true,                      description: "Global trading enabled/disabled"    },
  { key: "trading.defaultMakerFee",   value: "0.001",                   description: "Default maker fee rate (0.1%)"      },
  { key: "trading.defaultTakerFee",   value: "0.001",                   description: "Default taker fee rate (0.1%)"      },
  { key: "trading.maxOpenOrders",     value: 200,                       description: "Max open orders per user"           },

  // KYC
  { key: "kyc.required",              value: true,                      description: "KYC required for trading"           },
  { key: "kyc.provider",              value: "manual",                  description: "KYC provider: manual | sumsub | onfido" },
  { key: "kyc.level1RequiresSelfie",  value: true,                      description: "Level 1 KYC requires selfie"        },

  // Security
  { key: "security.mfaEnforced",      value: false,                     description: "Force MFA for all users"            },
  { key: "security.sessionTimeoutMin",value: 60,                        description: "Session timeout in minutes"         },
  { key: "security.ipWhitelistEnabled",value: false,                    description: "Enable IP whitelist for admin panel" },
  { key: "security.maxFailedLogins",  value: 5,                         description: "Max failed logins before lockout"   },
  { key: "security.lockoutMinutes",   value: 30,                        description: "Lockout duration in minutes"        },

  // Referrals
  { key: "referral.enabled",          value: true,                      description: "Referral program enabled"           },
  { key: "referral.commissionRate",   value: "0.20",                    description: "Referral commission (20% of fees)"  },
  { key: "referral.minPayoutUSDT",    value: "10",                      description: "Minimum referral payout in USDT"   },

  // Staking
  { key: "staking.enabled",           value: false,                     description: "Staking feature enabled"            },

  // P2P
  { key: "p2p.enabled",               value: false,                     description: "P2P trading feature enabled"        },
  { key: "p2p.escrowFeeRate",         value: "0.005",                   description: "P2P escrow fee rate (0.5%)"         },
];

for (const setting of SETTINGS) {
  await sql`
    INSERT INTO system_settings (key, value, description, is_secret)
    VALUES (${setting.key}, ${JSON.stringify(setting.value)}::jsonb, ${setting.description}, ${setting.isSecret ?? false})
    ON CONFLICT (key) DO UPDATE
      SET value       = EXCLUDED.value,
          description = EXCLUDED.description,
          updated_by  = ${adminId},
          updated_at  = now()
  `;
}
console.log(`  ✅ ${SETTINGS.length} system settings upserted`);

// ─────────────────────────────────────────────────────────────────────────────
// 6. FEATURE FLAGS
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n🚩 Seeding feature flags...");

const FLAGS = [
  { key: "feature.spotTrading",       enabled: true,  description: "Spot trading market"                    },
  { key: "feature.p2pTrading",        enabled: false, description: "Peer-to-peer trading"                   },
  { key: "feature.staking",           enabled: false, description: "Staking/earn products"                  },
  { key: "feature.launchpad",         enabled: false, description: "Token launchpad / IEO"                  },
  { key: "feature.copy_trading",      enabled: false, description: "Copy trading"                           },
  { key: "feature.futures",           enabled: false, description: "Futures / perpetual contracts"          },
  { key: "feature.otc",               enabled: false, description: "OTC trading desk"                       },
  { key: "feature.nft",               enabled: false, description: "NFT marketplace"                        },
  { key: "feature.referral_program",  enabled: true,  description: "Referral / affiliate program"           },
  { key: "feature.api_keys",          enabled: true,  description: "User API key management"                },
  { key: "feature.advanced_charts",   enabled: true,  description: "TradingView advanced charts"            },
  { key: "feature.price_alerts",      enabled: true,  description: "Push/email price alerts"                },
  { key: "feature.portfolio_tracker", enabled: true,  description: "Portfolio P&L tracker"                  },
  { key: "feature.kyc_level2",        enabled: true,  description: "KYC level 2 (enhanced due diligence)"   },
  { key: "feature.fiat_onramp",       enabled: false, description: "Fiat on-ramp (credit/debit card)"       },
  { key: "feature.admin_2fa_enforce", enabled: false, description: "Force 2FA for all admin logins"         },
];

for (const flag of FLAGS) {
  await sql`
    INSERT INTO feature_flags (key, enabled, description)
    VALUES (${flag.key}, ${flag.enabled}, ${flag.description})
    ON CONFLICT (key) DO UPDATE
      SET enabled     = EXCLUDED.enabled,
          description = EXCLUDED.description,
          updated_by  = ${adminId},
          updated_at  = now()
  `;
}
console.log(`  ✅ ${FLAGS.length} feature flags upserted`);

// ─────────────────────────────────────────────────────────────────────────────
// Done
// ─────────────────────────────────────────────────────────────────────────────

await sql.end({ timeout: 5 });

console.log(`
╔═══════════════════════════════════════════════════════════╗
║              ✅  ZEBVIX EXCHANGE SEED COMPLETE             ║
╠═══════════════════════════════════════════════════════════╣
║  Admin email    :  ${ADMIN_EMAIL.padEnd(36)} ║
║  Admin password :  ${ADMIN_PASSWORD.padEnd(36)} ║
║  Networks       :  ${String(networkIdMap.size).padEnd(36)} ║
║  Asset-Networks :  ${String(anCount).padEnd(36)} ║
║  System Settings:  ${String(SETTINGS.length).padEnd(36)} ║
║  Feature Flags  :  ${String(FLAGS.length).padEnd(36)} ║
╚═══════════════════════════════════════════════════════════╝
⚠️  Change the admin password immediately in production!
`);
