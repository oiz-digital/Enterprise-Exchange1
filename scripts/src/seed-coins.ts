/**
 * seed-coins.ts
 *
 * Seeds the top 100 coins from Binance USDT markets into the database.
 * Fetches live prices, 24h volume, and change % from Binance public API.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run seed:coins
 *
 * Env:
 *   DATABASE_URL  — Postgres connection string (required)
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const sql = postgres(DATABASE_URL, { max: 3 });

// ─── Binance public API ────────────────────────────────────────────────────

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;          // base asset volume
  quoteVolume: string;     // USDT volume  ← sort key
  count: number;           // number of trades
}

interface BinanceExchangeSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

async function fetchBinanceTickers(): Promise<BinanceTicker[]> {
  const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
  if (!res.ok) throw new Error(`Binance ticker API failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<BinanceTicker[]>;
}

async function fetchBinanceExchangeInfo(): Promise<BinanceExchangeSymbol[]> {
  const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
  if (!res.ok) throw new Error(`Binance exchangeInfo API failed: ${res.status} ${res.statusText}`);
  const data: { symbols: BinanceExchangeSymbol[] } = await res.json();
  return data.symbols;
}

// ─── Coin metadata (name + type) ──────────────────────────────────────────

const COIN_META: Record<string, { name: string; type: "CRYPTO" | "STABLECOIN" }> = {
  BTC:   { name: "Bitcoin",          type: "CRYPTO" },
  ETH:   { name: "Ethereum",         type: "CRYPTO" },
  BNB:   { name: "BNB",              type: "CRYPTO" },
  SOL:   { name: "Solana",           type: "CRYPTO" },
  XRP:   { name: "Ripple",           type: "CRYPTO" },
  ADA:   { name: "Cardano",          type: "CRYPTO" },
  DOGE:  { name: "Dogecoin",         type: "CRYPTO" },
  AVAX:  { name: "Avalanche",        type: "CRYPTO" },
  TRX:   { name: "TRON",             type: "CRYPTO" },
  DOT:   { name: "Polkadot",         type: "CRYPTO" },
  LINK:  { name: "Chainlink",        type: "CRYPTO" },
  MATIC: { name: "Polygon",          type: "CRYPTO" },
  TON:   { name: "Toncoin",          type: "CRYPTO" },
  SHIB:  { name: "Shiba Inu",        type: "CRYPTO" },
  LTC:   { name: "Litecoin",         type: "CRYPTO" },
  BCH:   { name: "Bitcoin Cash",     type: "CRYPTO" },
  UNI:   { name: "Uniswap",          type: "CRYPTO" },
  ATOM:  { name: "Cosmos",           type: "CRYPTO" },
  ETC:   { name: "Ethereum Classic", type: "CRYPTO" },
  XLM:   { name: "Stellar",          type: "CRYPTO" },
  NEAR:  { name: "NEAR Protocol",    type: "CRYPTO" },
  APT:   { name: "Aptos",            type: "CRYPTO" },
  OP:    { name: "Optimism",         type: "CRYPTO" },
  ARB:   { name: "Arbitrum",         type: "CRYPTO" },
  FIL:   { name: "Filecoin",         type: "CRYPTO" },
  ICP:   { name: "Internet Computer",type: "CRYPTO" },
  HBAR:  { name: "Hedera",           type: "CRYPTO" },
  VET:   { name: "VeChain",          type: "CRYPTO" },
  ALGO:  { name: "Algorand",         type: "CRYPTO" },
  GRT:   { name: "The Graph",        type: "CRYPTO" },
  SAND:  { name: "The Sandbox",      type: "CRYPTO" },
  MANA:  { name: "Decentraland",     type: "CRYPTO" },
  AXS:   { name: "Axie Infinity",    type: "CRYPTO" },
  THETA: { name: "Theta Network",    type: "CRYPTO" },
  XMR:   { name: "Monero",           type: "CRYPTO" },
  AAVE:  { name: "Aave",             type: "CRYPTO" },
  EGLD:  { name: "MultiversX",       type: "CRYPTO" },
  EOS:   { name: "EOS",              type: "CRYPTO" },
  FLOW:  { name: "Flow",             type: "CRYPTO" },
  XTZ:   { name: "Tezos",            type: "CRYPTO" },
  CHZ:   { name: "Chiliz",           type: "CRYPTO" },
  CAKE:  { name: "PancakeSwap",      type: "CRYPTO" },
  DYDX:  { name: "dYdX",             type: "CRYPTO" },
  KSM:   { name: "Kusama",           type: "CRYPTO" },
  ZEC:   { name: "Zcash",            type: "CRYPTO" },
  DASH:  { name: "Dash",             type: "CRYPTO" },
  COMP:  { name: "Compound",         type: "CRYPTO" },
  MKR:   { name: "Maker",            type: "CRYPTO" },
  SNX:   { name: "Synthetix",        type: "CRYPTO" },
  CRV:   { name: "Curve DAO",        type: "CRYPTO" },
  LDO:   { name: "Lido DAO",         type: "CRYPTO" },
  FTM:   { name: "Fantom",           type: "CRYPTO" },
  ONE:   { name: "Harmony",          type: "CRYPTO" },
  ROSE:  { name: "Oasis Network",    type: "CRYPTO" },
  ZIL:   { name: "Zilliqa",          type: "CRYPTO" },
  CELO:  { name: "Celo",             type: "CRYPTO" },
  ENJ:   { name: "Enjin Coin",       type: "CRYPTO" },
  BAT:   { name: "Basic Attention",  type: "CRYPTO" },
  WAVES: { name: "Waves",            type: "CRYPTO" },
  NEO:   { name: "NEO",              type: "CRYPTO" },
  QTUM:  { name: "Qtum",             type: "CRYPTO" },
  IOTA:  { name: "IOTA",             type: "CRYPTO" },
  HOT:   { name: "Holo",             type: "CRYPTO" },
  SC:    { name: "Siacoin",          type: "CRYPTO" },
  ICX:   { name: "ICON",             type: "CRYPTO" },
  ONT:   { name: "Ontology",         type: "CRYPTO" },
  WAN:   { name: "Wanchain",         type: "CRYPTO" },
  ANKR:  { name: "Ankr",             type: "CRYPTO" },
  CKB:   { name: "Nervos Network",   type: "CRYPTO" },
  BAND:  { name: "Band Protocol",    type: "CRYPTO" },
  STORJ: { name: "Storj",            type: "CRYPTO" },
  SKL:   { name: "SKALE Network",    type: "CRYPTO" },
  NMR:   { name: "Numeraire",        type: "CRYPTO" },
  OGN:   { name: "Origin Protocol",  type: "CRYPTO" },
  CELR:  { name: "Celer Network",    type: "CRYPTO" },
  AUDIO: { name: "Audius",           type: "CRYPTO" },
  API3:  { name: "API3",             type: "CRYPTO" },
  MASK:  { name: "Mask Network",     type: "CRYPTO" },
  PERP:  { name: "Perpetual Protocol",type:"CRYPTO" },
  BICO:  { name: "Biconomy",         type: "CRYPTO" },
  HIGH:  { name: "Highstreet",       type: "CRYPTO" },
  ACH:   { name: "Alchemy Pay",      type: "CRYPTO" },
  DENT:  { name: "Dent",             type: "CRYPTO" },
  FET:   { name: "Fetch.ai",         type: "CRYPTO" },
  AGIX:  { name: "SingularityNET",   type: "CRYPTO" },
  OCEAN: { name: "Ocean Protocol",   type: "CRYPTO" },
  GLM:   { name: "Golem",            type: "CRYPTO" },
  NKN:   { name: "NKN",              type: "CRYPTO" },
  POLS:  { name: "Polkastarter",     type: "CRYPTO" },
  REEF:  { name: "Reef",             type: "CRYPTO" },
  TLM:   { name: "Alien Worlds",     type: "CRYPTO" },
  ALICE: { name: "My Neighbor Alice",type: "CRYPTO" },
  BAKE:  { name: "BakerySwap",       type: "CRYPTO" },
  BURGER:{ name: "BurgerSwap",       type: "CRYPTO" },
  TWT:   { name: "Trust Wallet",     type: "CRYPTO" },
  SXP:   { name: "Swipe",            type: "CRYPTO" },
  MDX:   { name: "Mdex",             type: "CRYPTO" },
  LUNA:  { name: "Terra Luna",       type: "CRYPTO" },
  LUNC:  { name: "Terra Classic",    type: "CRYPTO" },
  USTC:  { name: "TerraClassicUSD",  type: "STABLECOIN" },
  USDC:  { name: "USD Coin",         type: "STABLECOIN" },
  DAI:   { name: "Dai",              type: "STABLECOIN" },
  BUSD:  { name: "Binance USD",      type: "STABLECOIN" },
};

function getCoinName(symbol: string): string {
  return COIN_META[symbol]?.name ?? symbol;
}

function getCoinType(symbol: string): "CRYPTO" | "STABLECOIN" | "FIAT" | "UTILITY" {
  return COIN_META[symbol]?.type ?? "CRYPTO";
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log("🔄 Fetching Binance market data...");

const [tickers, exchangeSymbols] = await Promise.all([
  fetchBinanceTickers(),
  fetchBinanceExchangeInfo(),
]);

// Build a map: symbol → baseAsset for USDT pairs that are TRADING
const usdtPairMap = new Map<string, string>();
for (const s of exchangeSymbols) {
  if (s.quoteAsset === "USDT" && s.status === "TRADING") {
    usdtPairMap.set(s.symbol, s.baseAsset);
  }
}

// Filter tickers to USDT pairs, sort by quoteVolume DESC, take top 100
const top100 = tickers
  .filter((t) => usdtPairMap.has(t.symbol))
  .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
  .slice(0, 100);

console.log(`✅ Got ${top100.length} top USDT pairs from Binance`);

// Unique base assets
const baseSymbols = [...new Set(top100.map((t) => usdtPairMap.get(t.symbol)!))];

await sql.begin(async (tx) => {
  // 1. Upsert USDT as the quote asset (stablecoin)
  const [usdtRow] = await tx`
    INSERT INTO assets (symbol, name, type, status, precision, display_precision,
                        deposit_enabled, withdrawal_enabled, trading_enabled, metadata)
    VALUES (
      'USDT',
      'Tether',
      'STABLECOIN',
      'ACTIVE',
      6,
      2,
      true,
      true,
      true,
      ${{ price_usd: "1.0000", source: "stable" }}::jsonb
    )
    ON CONFLICT (symbol) DO UPDATE
      SET name               = EXCLUDED.name,
          type               = EXCLUDED.type,
          status             = 'ACTIVE',
          metadata           = EXCLUDED.metadata,
          updated_at         = now()
    RETURNING id
  `;

  console.log(`💰 USDT asset id: ${usdtRow.id}`);

  // 2. Upsert each base asset
  const assetIds = new Map<string, string>(); // symbol → uuid
  assetIds.set("USDT", usdtRow.id);

  for (const ticker of top100) {
    const baseSymbol = usdtPairMap.get(ticker.symbol)!;
    if (assetIds.has(baseSymbol)) continue; // already inserted

    const price       = parseFloat(ticker.lastPrice);
    const change24h   = parseFloat(ticker.priceChangePercent);
    const vol24h      = parseFloat(ticker.quoteVolume);
    const high24h     = parseFloat(ticker.highPrice);
    const low24h      = parseFloat(ticker.lowPrice);
    const tradeCount  = ticker.count;

    const assetType = getCoinType(baseSymbol);
    const isStable  = assetType === "STABLECOIN";

    const [row] = await tx`
      INSERT INTO assets (symbol, name, type, status, precision, display_precision,
                          deposit_enabled, withdrawal_enabled, trading_enabled, metadata)
      VALUES (
        ${baseSymbol},
        ${getCoinName(baseSymbol)},
        ${assetType}::"asset_type",
        'ACTIVE',
        ${isStable ? 6 : 18},
        ${isStable ? 4 : 8},
        true,
        true,
        true,
        ${{
          price_usd:           price,
          price_change_24h:    parseFloat(ticker.priceChange),
          price_change_pct_24h: change24h,
          high_24h:            high24h,
          low_24h:             low24h,
          volume_24h_usdt:     vol24h,
          trade_count_24h:     tradeCount,
          source:              "binance",
          fetched_at:          new Date().toISOString(),
        }}::jsonb
      )
      ON CONFLICT (symbol) DO UPDATE
        SET name                = EXCLUDED.name,
            type                = EXCLUDED.type,
            status              = 'ACTIVE',
            metadata            = EXCLUDED.metadata,
            updated_at          = now()
      RETURNING id
    `;

    assetIds.set(baseSymbol, row.id);
    console.log(`  • ${baseSymbol.padEnd(10)} $${price.toFixed(4).padStart(14)}   (${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%)`);
  }

  // 3. Upsert markets (BASE/USDT)
  console.log("\n📈 Creating markets...");
  let marketCount = 0;

  for (const ticker of top100) {
    const baseSymbol = usdtPairMap.get(ticker.symbol)!;
    const baseId     = assetIds.get(baseSymbol);
    const quoteId    = assetIds.get("USDT");

    if (!baseId || !quoteId || baseId === quoteId) continue;

    const price     = parseFloat(ticker.lastPrice);
    const precision = price < 0.0001 ? 8 : price < 0.01 ? 6 : price < 1 ? 4 : price < 1000 ? 2 : 1;

    await tx`
      INSERT INTO markets (symbol, base_asset_id, quote_asset_id, status,
                           price_precision, quantity_precision,
                           minimum_quantity, minimum_notional,
                           maker_fee, taker_fee)
      VALUES (
        ${ticker.symbol},
        ${baseId},
        ${quoteId},
        'TRADING',
        ${precision},
        8,
        '0.00000001',
        '1.00000000',
        '0.00100000',
        '0.00100000'
      )
      ON CONFLICT (symbol) DO UPDATE
        SET status            = 'TRADING',
            price_precision   = EXCLUDED.price_precision,
            updated_at        = now()
    `;
    marketCount++;
  }

  console.log(`✅ ${marketCount} markets upserted`);
  console.log(`✅ ${assetIds.size} total assets in database`);
});

await sql.end({ timeout: 5 });
console.log("\n🚀 Seed complete!");
