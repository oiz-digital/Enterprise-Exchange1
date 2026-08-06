# Zebvix Exchange

## Enterprise exchange backend foundation

Zebvix Exchange is being built as a secure, modular backend platform for a future cryptocurrency exchange, administration console, and client applications.

This repository is currently complete through **Phase 1: Backend Foundation**. Phase 2 and all exchange-domain functionality are intentionally paused until explicit approval is given.

> The uploaded Zebvix master development prompt is the product-level source of truth. This README documents what is implemented in the repository today and clearly separates it from planned work.

## Current status

### Implemented in Phase 1

- Fastify 5 TypeScript API service
- PostgreSQL connectivity through `postgres.js`
- Drizzle ORM runtime integration
- Redis connectivity and readiness checks
- Environment validation with Zod
- Structured Pino logging
- Request ID propagation through `x-request-id`
- Sensitive-field log redaction
- Helmet security headers
- CORS allowlist configuration
- Global in-memory rate limiting
- Standard application error response format
- Health and readiness endpoints
- OpenAPI/Swagger UI
- Graceful shutdown for PostgreSQL and Redis
- Local Docker Compose services for PostgreSQL 16 and Redis 7
- Vitest health-route coverage
- ESM production bundle with bundled Swagger UI assets

### Not implemented yet

The following are deliberately outside the current Phase 1 boundary:

- User or admin authentication
- JWT, Argon2, MFA, or session management
- Admin panel
- RBAC and permissions
- PostgreSQL domain schema and migrations
- Users, admins, KYC, assets, networks, or markets
- Wallets, deposits, withdrawals, or custody
- Ledger, accounting, balances, or double-entry transactions
- Orders, trades, matching engine, or market data
- Fees, staking, P2P, referrals, risk, reports, or notifications
- BullMQ queues and workers
- WebSockets
- Flutter/mobile application
- Blockchain, AML/KYC, sanctions, fraud, custody, HSM, or MPC integrations

## Repository layout

```text
.
├── artifacts/
│   ├── api-server/
│   │   ├── src/
│   │   │   ├── config/          # env, logger, PostgreSQL, Redis
│   │   │   ├── errors/          # application error types
│   │   │   ├── lib/             # compatibility exports
│   │   │   ├── middleware/      # error handling
│   │   │   ├── plugins/         # security plugins
│   │   │   ├── routes/          # health/readiness routes
│   │   │   ├── app.ts           # app construction entry point
│   │   │   ├── index.ts         # process entry point
│   │   │   └── server.ts        # Fastify runtime and lifecycle
│   │   ├── tests/
│   │   ├── .env.example
│   │   ├── build.mjs
│   │   └── package.json
│   └── mockup-sandbox/           # reusable component preview artifact
├── attached_assets/              # uploaded product prompts and assets
├── docker-compose.yml             # local PostgreSQL and Redis
├── docs/
│   └── phase-1-backend-foundation.md
├── lib/                           # shared workspace libraries
├── replit.md                      # Replit project context and guardrails
├── package.json                   # workspace scripts
└── pnpm-workspace.yaml
```

The backend is currently located at `artifacts/api-server`. The workspace uses pnpm and supports multiple artifacts; do not create a second API service for the same Zebvix product.

## Technology stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js 24 |
| Language | TypeScript |
| HTTP server | Fastify 5 |
| Database | PostgreSQL |
| Database driver | `postgres.js` |
| ORM | Drizzle ORM |
| Runtime validation | Zod |
| Cache/infrastructure | Redis |
| Future jobs | BullMQ dependency foundation |
| Logging | Pino |
| API documentation | OpenAPI / Swagger UI |
| Testing | Vitest and Fastify inject |
| Build | esbuild ESM bundle |
| Package manager | pnpm workspaces |

Prisma is not used and must not be introduced. Future database work must use Drizzle, `drizzle-kit`, PostgreSQL `NUMERIC`, and PostgreSQL transactions.

## Prerequisites

- Node.js compatible with the workspace runtime
- pnpm
- Docker and Docker Compose for local PostgreSQL and Redis
- A PostgreSQL connection string

The Replit development environment already provides the workspace toolchain and managed database connection. For local development, Docker Compose supplies the database and Redis services.

## Quick start

### 1. Install dependencies

From the repository root:

```bash
pnpm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
docker compose ps
```

The compose file starts:

- PostgreSQL 16 on `localhost:5432`
- Redis 7 on `localhost:6379`

Both services have health checks and persistent named volumes.

### 3. Configure the API

Copy the example environment file:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

The default local values point to the Docker services:

```dotenv
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zebvix
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
BULLMQ_PREFIX=zebvix
```

Never commit `.env` files, passwords, connection strings, or production credentials.

### 4. Start the API

```bash
pnpm --filter @workspace/api-server run dev
```

The API listens on the configured `PORT` and binds to `0.0.0.0` so it works through Replit's preview proxy.

### 5. Verify the service

```bash
curl http://localhost:8080/api/health
curl http://localhost:8080/api/ready
```

Open Swagger UI at:

```text
http://localhost:8080/api/docs/
```

In Replit, use the artifact preview rather than assuming a direct localhost URL.

## Workspace commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install workspace dependencies |
| `pnpm run typecheck` | Typecheck libraries and artifacts |
| `pnpm run build` | Typecheck and build all packages |
| `pnpm --filter @workspace/api-server run dev` | Build and start the API |
| `pnpm --filter @workspace/api-server run build` | Build the API bundle |
| `pnpm --filter @workspace/api-server run typecheck` | Typecheck only the API |
| `pnpm --filter @workspace/api-server run test` | Run API unit tests |
| `docker compose up -d` | Start local PostgreSQL and Redis |
| `docker compose down` | Stop local infrastructure |
| `docker compose logs -f postgres redis` | Follow infrastructure logs |

The `@workspace/api-spec` and `@workspace/db` commands mentioned in the project context are future-workspace capabilities; no Phase 2 domain schema has been added yet.

## API contract

### Health

| Method | Path | Meaning |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/healthz` | Liveness compatibility path |
| `GET` | `/api/health` | Liveness API path |
| `GET` | `/api/healthz` | Existing artifact health probe path |

Successful response:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

Health endpoints do not query PostgreSQL or Redis. They answer whether the HTTP process is alive.

### Readiness

| Method | Path | Meaning |
| --- | --- | --- |
| `GET` | `/ready` | Infrastructure readiness |
| `GET` | `/api/ready` | Infrastructure readiness API path |

Successful response:

```json
{
  "success": true,
  "data": {
    "status": "ready",
    "checks": {
      "postgres": "ok",
      "redis": "ok"
    }
  }
}
```

If either dependency is unavailable, the endpoint returns HTTP `503` and reports the failing dependency as `unavailable`.

### Documentation

- Swagger UI: `/api/docs/`
- OpenAPI JSON: exposed by the registered Fastify Swagger plugin

The Swagger server metadata is prepared for `/api/v1`. Current Phase 1 observability routes retain their compatibility paths and do not yet represent the complete versioned domain API.

## Response and error conventions

Successful responses use:

```json
{
  "success": true,
  "data": {}
}
```

Known errors use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Current standard error codes include:

- `VALIDATION_ERROR` — invalid request data
- `RATE_LIMITED` — global request limit exceeded
- Application-specific codes from the `AppError` hierarchy
- `INTERNAL_ERROR` — unexpected errors; implementation details are not exposed

Request IDs are accepted from `x-request-id`. If the caller does not provide one, the server generates a UUID and includes it in request logging.

## Security baseline

The Phase 1 server registers:

- Helmet security headers
- CORS with a configured origin allowlist
- Credentials support for future authenticated clients
- Global rate limiting: 100 requests per minute outside tests
- 1 MiB request body limit
- Pino redaction for authorization headers, cookies, passwords, OTPs, tokens, private keys, seed phrases, and KYC documents
- Safe generic responses for unexpected failures

An empty `CORS_ORIGINS` value disables cross-origin requests. Configure comma-separated origins when browser clients are introduced:

```dotenv
CORS_ORIGINS=https://admin.example.com,https://app.example.com
```

Authentication and authorization are not yet present. Do not treat the current health routes as proof that a business endpoint is protected.

## Configuration reference

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `PORT` | No | `8080` | HTTP listening port |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Development/test only | `redis://127.0.0.1:6379` | Redis connection string; required explicitly in production |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `CORS_ORIGINS` | No | empty | Comma-separated browser origins |
| `BULLMQ_PREFIX` | No | `zebvix` | Reserved namespace for future BullMQ jobs |

Configuration is parsed at startup. Invalid values cause startup to fail instead of silently falling back to unsafe behavior.

## Database and Redis lifecycle

PostgreSQL is the authoritative persistence layer. The current runtime:

- Creates a `postgres.js` client
- Creates a Drizzle database wrapper
- Uses a pool size of 10 outside tests and 1 in tests
- Uses a five-second connection timeout
- Exposes a `SELECT 1` readiness ping
- Closes the client during Fastify shutdown

Redis is a required runtime dependency for readiness and future caching, rate-limit distribution, event fan-out, and BullMQ. The current runtime:

- Creates a Redis client from `REDIS_URL`
- Connects during application construction
- Logs client errors through Pino
- Exposes a `PING` readiness check
- Quits cleanly during Fastify shutdown

No exchange tables, migrations, seed data, balances, or ledger records exist in Phase 1.

## Testing and verification

Run:

```bash
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
pnpm run typecheck
pnpm run build
```

The health test uses Fastify inject and mocked infrastructure checks. It does not require a live PostgreSQL or Redis process, which keeps unit tests deterministic. Live readiness checks should still be performed against running infrastructure before release.

Recommended manual smoke test:

```bash
curl -i http://localhost:8080/api/health
curl -i http://localhost:8080/api/healthz
curl -i http://localhost:8080/api/ready
curl -i http://localhost:8080/api/docs/
```

Expected status codes:

- Health: `200`
- Ready with healthy dependencies: `200`
- Ready with an unhealthy dependency: `503`
- Swagger UI: `200`

## Troubleshooting

### The API does not start

1. Confirm dependencies are installed:

   ```bash
   pnpm install
   ```

2. Confirm environment configuration includes `DATABASE_URL`.
3. Confirm PostgreSQL and Redis are running:

   ```bash
   docker compose ps
   docker compose logs postgres redis
   ```

4. Run the API typecheck directly:

   ```bash
   pnpm --filter @workspace/api-server run typecheck
   ```

### Readiness returns `503`

Inspect the response:

```bash
curl -sS http://localhost:8080/api/ready
```

- `postgres: unavailable` means the database URL is incorrect or PostgreSQL is unreachable.
- `redis: unavailable` means Redis is not reachable at `REDIS_URL`.
- In production, a missing `REDIS_URL` fails configuration validation before the server starts.

### Swagger UI is blank or returns `404`

The API build copies Swagger UI static assets into the bundle. Rebuild the API and restart its workflow:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```

Use `/api/docs/` with the trailing slash.

### CORS requests fail

Set the exact browser origin in `CORS_ORIGINS`. Do not use a wildcard with credentialed browser requests:

```dotenv
CORS_ORIGINS=http://localhost:3000
```

Restart the API after changing environment variables.

### Docker data needs to be reset

This deletes local PostgreSQL and Redis volumes and is destructive:

```bash
docker compose down -v
docker compose up -d
```

Do not run this against any production database or production Redis service.

## Operational guidance

- Keep PostgreSQL authoritative for financial correctness; Redis must not become the source of balances or ledger state.
- Use PostgreSQL transactions and appropriate locking for future financial state changes.
- Do not put business logic inside route registration files.
- Future modules should separate route, controller, schema, service, repository, and types.
- Do not add credentials or secrets to the repository.
- Add authentication and authorization before adding any user or admin business endpoints.
- Add migrations and constraints before creating financial tables.
- Add auditability and idempotency requirements before implementing deposits, withdrawals, or ledger operations.
- Use specialist providers for custody/HSM/MPC, blockchain indexing, AML/KYC, sanctions, fraud, monitoring, backups, and secret management before production launch.

## Phase boundary

Phase 1 is complete and verified. The next approved phase is:

### Phase 2 — PostgreSQL domain foundation

Expected Phase 2 work:

- Drizzle schema organization
- Relations and indexes
- PostgreSQL constraints and enums
- Migration configuration and migration files
- Seed strategy for non-production development
- Database repository conventions
- Initial domain foundations, subject to the phase plan

Phase 2 must not begin until explicit approval is received.

## Additional documentation

- [Complete Phase 1 backend documentation](docs/phase-1-backend-foundation.md)
- [API service operations reference](artifacts/api-server/README.md)
- [Replit project context and guardrails](replit.md)
- [Uploaded master development prompt](attached_assets/Pasted--ZEBVIX-EXCHANGE-ENTERPRISE--1785942427553_1785942427557.txt)