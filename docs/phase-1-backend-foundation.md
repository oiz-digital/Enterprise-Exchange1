# Zebvix Exchange — Phase 1 Backend Foundation

## 1. Purpose of this document

This document is the implementation record and handoff guide for Phase 1 of Zebvix Exchange.

It answers:

1. What was built?
2. How does the service start and stop?
3. Which configuration is required?
4. Which endpoints are available?
5. How are failures and dependencies handled?
6. How is the result tested?
7. What is explicitly deferred to Phase 2 and later?

This is an engineering document, not a claim that the complete exchange product is production-ready. A cryptocurrency exchange requires additional security reviews, domain controls, compliance providers, custody architecture, operational processes, and infrastructure hardening.

## 2. Scope

### Included

Phase 1 establishes the backend runtime boundary:

- HTTP server
- Configuration validation
- PostgreSQL client and Drizzle runtime
- Redis client
- Logging
- Security middleware
- Request IDs
- Error response conventions
- Health and readiness checks
- OpenAPI/Swagger documentation
- Graceful shutdown
- Local development infrastructure
- Automated health-route coverage

### Excluded

No business or financial state is implemented yet. In particular, this phase does not include:

- Authentication or authorization
- Users, admins, roles, or permissions
- KYC or compliance workflows
- Assets, networks, or markets
- Wallets, addresses, balances, or custody
- Deposits or withdrawals
- Double-entry ledger or accounting
- Orders, trades, matching, or settlement
- Fees, staking, P2P, referrals, or notifications
- Risk, fraud, reports, or audit-domain records
- Queues, workers, WebSockets, or event consumers
- Admin UI or Flutter UI

The absence of these modules is intentional. Adding them before the database and security design is approved would create premature domain contracts.

## 3. Runtime architecture

```text
                 ┌──────────────────────────┐
                 │ Replit preview / client  │
                 └────────────┬─────────────┘
                              │ HTTP
                 ┌────────────▼─────────────┐
                 │ Fastify 5 API server     │
                 │                           │
                 │ request ID                │
                 │ error handler              │
                 │ Helmet / CORS / rate limit │
                 │ Swagger UI                 │
                 │ health / readiness routes │
                 └───────┬──────────┬────────┘
                         │          │
              ┌──────────▼───┐  ┌───▼──────────┐
              │ PostgreSQL   │  │ Redis        │
              │ authoritative│  │ infrastructure│
              │ persistence  │  │ dependency    │
              └──────────────┘  └──────────────┘
```

### Request lifecycle

1. Fastify creates or accepts a request ID.
2. Pino logs the incoming request with the request ID.
3. Helmet, CORS, and rate limiting are applied globally.
4. The registered route executes.
5. Known validation and application errors are normalized.
6. Unexpected errors are logged server-side and returned as a generic `INTERNAL_ERROR`.
7. Fastify logs the completed request.

### Startup lifecycle

1. `src/index.ts` loads and validates environment variables.
2. `startServer()` calls `buildApp()`.
3. The logger is created.
4. PostgreSQL runtime is created.
5. Redis runtime connects.
6. Fastify is created with the configured body limit and request ID behavior.
7. Error handling and security plugins are registered.
8. Swagger and Swagger UI are registered.
9. Routes are registered.
10. Shutdown hooks are attached.
11. Fastify listens on `0.0.0.0:${PORT}`.

If configuration is invalid or Redis cannot connect, startup fails. This is preferable to serving a partially functional exchange backend.

### Shutdown lifecycle

The process listens for `SIGINT` and `SIGTERM`.

On shutdown:

1. Fastify logs the signal.
2. Fastify closes active resources and triggers its `onClose` hook.
3. PostgreSQL and Redis are closed in parallel.
4. Completion is logged.

## 4. Source map

### `src/index.ts`

Process entry point. Loads validated environment configuration and starts the server.

### `src/app.ts`

Application construction entry point for consumers that need an app factory. The server runtime is implemented in `src/server.ts`.

### `src/server.ts`

Owns Fastify creation, dependencies, plugin registration, documentation setup, route registration, and lifecycle management.

### `src/config/env.ts`

Owns Zod parsing for:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `LOG_LEVEL`
- `CORS_ORIGINS`
- `BULLMQ_PREFIX`

Development/test environments receive a local Redis default when `REDIS_URL` is omitted. Production requires `REDIS_URL` explicitly.

### `src/config/database.ts`

Creates:

- `postgres.js` SQL client
- Drizzle database wrapper
- readiness ping
- close method

The current implementation has no schema import because Phase 2 schema work has not started.

### `src/config/redis.ts`

Creates and connects the Redis client, registers error logging, exposes `PING`, and closes the client cleanly.

### `src/config/logger.ts`

Creates Pino with the configured log level. Development logs use `pino-pretty`; production and tests use normal structured output.

Sensitive values are redacted before logging.

### `src/plugins/security.ts`

Registers:

- `@fastify/helmet`
- `@fastify/cors`
- `@fastify/rate-limit`

The rate limit is 100 requests per minute in normal environments and is relaxed for the test environment.

### `src/middleware/error-handler.ts`

Normalizes Zod errors, `AppError` instances, and unexpected errors.

### `src/errors/app-error.ts`

Defines the base error type and typed error subclasses for validation, authentication, authorization, not-found, conflict, and rate-limit scenarios. Domain routes are not using these classes yet.

### `src/routes/health.ts`

Registers liveness and readiness endpoints.

### `src/routes/index.ts`

Central route registration boundary. Future modules should be registered here without placing business logic in this file.

### `tests/health.test.ts`

Uses Fastify inject and stubbed dependencies to test the health response without requiring live infrastructure.

## 5. Configuration

### Example file

The template is located at:

```text
artifacts/api-server/.env.example
```

Example:

```dotenv
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zebvix
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
BULLMQ_PREFIX=zebvix
```

### Variable details

#### `NODE_ENV`

Allowed values:

- `development`
- `test`
- `production`

Development enables readable Pino output. Test mode uses a smaller PostgreSQL pool and relaxed rate limiting. Production requires an explicit Redis URL.

#### `PORT`

The Fastify listening port. The server binds to all interfaces. Replit workflows provide the runtime port environment when needed; local development defaults to `8080`.

#### `DATABASE_URL`

Required in every environment. It must be a PostgreSQL connection string.

#### `REDIS_URL`

Used to connect Redis. Local development defaults to `redis://127.0.0.1:6379` only when omitted. Production does not receive that default.

#### `LOG_LEVEL`

Supported Pino levels:

```text
fatal | error | warn | info | debug | trace | silent
```

Use `debug` only for controlled troubleshooting because database query information can become verbose.

#### `CORS_ORIGINS`

Comma-separated origin list. Empty means CORS is disabled:

```dotenv
CORS_ORIGINS=https://admin.example.com,https://app.example.com
```

#### `BULLMQ_PREFIX`

Reserved namespace for future queues and workers. It has no active queue behavior in Phase 1.

## 6. Local infrastructure

`docker-compose.yml` defines:

```yaml
postgres:
  image: postgres:16-alpine
  database: zebvix
  user: postgres
  port: 5432

redis:
  image: redis:7-alpine
  port: 6379
```

Both services:

- expose a local port
- use a named persistent volume
- have a health check

Commands:

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres redis
docker compose stop
docker compose down
```

To remove local volumes, which destroys local data:

```bash
docker compose down -v
```

Do not use the volume-destroying command against production infrastructure.

## 7. Endpoint reference

### `GET /health`

Liveness endpoint. Does not call PostgreSQL or Redis.

Response:

```http
HTTP/1.1 200 OK
```

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

### `GET /healthz`

Compatibility liveness endpoint.

### `GET /api/health`

API-prefixed liveness endpoint.

### `GET /api/healthz`

API-prefixed compatibility endpoint used by the existing artifact health probe.

### `GET /ready`

Checks both infrastructure dependencies:

- PostgreSQL: `SELECT 1`
- Redis: `PING`

Healthy response:

```http
HTTP/1.1 200 OK
```

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

Unhealthy response:

```http
HTTP/1.1 503 Service Unavailable
```

```json
{
  "success": false,
  "data": {
    "status": "not_ready",
    "checks": {
      "postgres": "unavailable",
      "redis": "ok"
    }
  }
}
```

The exact failing check depends on the runtime condition.

### `GET /api/ready`

API-prefixed readiness endpoint with the same behavior as `/ready`.

### Swagger UI

```text
/api/docs/
```

The build copies the Swagger UI assets into `dist/static` so the bundled ESM service remains self-contained.

## 8. API versioning policy

The master prompt reserves:

```text
/api/v1
```

for stable client-facing domain APIs. Swagger metadata already declares `/api/v1` as the server base.

Phase 1 health routes intentionally preserve the paths already used by the artifact health probe:

```text
/api/health
/api/healthz
/api/ready
```

When domain modules are introduced, new public contracts should use `/api/v1`. Existing health paths should remain available for infrastructure probes and should not be repurposed for business data.

## 9. Logging and observability

### Request logs

Fastify logs incoming and completed requests. Each request has a request ID:

- caller-provided `x-request-id`, or
- generated UUID

Use the request ID to correlate client reports with server logs.

### Redaction

The logger redacts fields associated with:

- authorization headers
- cookies
- set-cookie response headers
- passwords
- OTP values
- access tokens
- refresh tokens
- private keys
- seed phrases
- KYC documents

Future domain modules must preserve this approach when adding request or event fields.

### Health versus readiness

Use liveness to determine whether the process is alive. Use readiness to determine whether the process should receive traffic requiring infrastructure connectivity.

Do not make liveness depend on the database; otherwise a database outage can cause orchestrators to repeatedly restart an otherwise diagnosable process.

## 10. Security behavior

### Helmet

Helmet adds common security headers through Fastify.

### CORS

CORS uses an explicit origin list. Credentials are enabled for future authenticated browser clients. A wildcard origin must not be used with credentialed requests.

### Rate limiting

The global rate limiter allows 100 requests per minute in development and production. The test environment uses a much larger limit to avoid making unit tests dependent on request count.

The current limiter is process-local. A future horizontally scaled deployment should use a shared strategy if rate-limit consistency across instances is required.

### Error safety

Unexpected errors are logged internally and returned without stack traces or implementation details.

### Missing authentication

No route currently authenticates a caller. Phase 1 must not be exposed as an exchange business API. Authentication, authorization, MFA readiness, session handling, and audit controls must be implemented before adding protected domain operations.

## 11. Build details

The API uses `build.mjs` and esbuild to produce an ESM bundle:

```text
artifacts/api-server/dist/index.mjs
```

Runtime-only dependencies are externalized where appropriate. Swagger UI assets are copied into:

```text
artifacts/api-server/dist/static
```

This is required because the server is bundled while Swagger UI still serves static files at runtime.

Start the built service with:

```bash
pnpm --filter @workspace/api-server run start
```

The development script builds before starting:

```bash
pnpm --filter @workspace/api-server run dev
```

## 12. Verification checklist

### Static verification

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run build
```

### Unit verification

```bash
pnpm --filter @workspace/api-server run test
```

### Live verification

With the API and dependencies running:

```bash
curl -sS -i http://localhost:8080/api/health
curl -sS -i http://localhost:8080/api/healthz
curl -sS -i http://localhost:8080/api/ready
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/docs/
```

Expected results:

| Check | Expected |
| --- | --- |
| Health | HTTP 200 and `status: ok` |
| Compatibility health | HTTP 200 |
| Readiness | HTTP 200 with Postgres and Redis `ok` |
| Swagger | HTTP 200 |

Before declaring a workflow healthy, inspect runtime logs for startup failures, dependency errors, and repeated Redis errors.

## 13. Failure modes

### Configuration failure

Invalid or missing required environment values fail during startup. This prevents an incorrectly configured server from looking healthy.

### PostgreSQL failure

The server may start after creating the SQL client, but readiness returns `503` when the database ping fails. Future deployment configuration should use readiness for traffic gating.

### Redis startup failure

Redis connects during app construction. If it cannot connect, server startup fails. This is deliberate because Redis is part of the required Phase 1 infrastructure contract.

### Unexpected route failure

The centralized error handler returns:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

The original error is logged with the request context.

## 14. Development rules for future phases

The following rules should be preserved:

1. Do not introduce Prisma.
2. Keep PostgreSQL authoritative for financial state.
3. Use Drizzle for database access and Zod for runtime input validation.
4. Use transactions for financial state changes.
5. Keep route files thin.
6. Separate route, controller, schema, service, repository, and types in domain modules.
7. Do not add business logic to health or infrastructure probes.
8. Do not log secrets, credentials, tokens, private keys, seed phrases, or sensitive KYC data.
9. Add idempotency before implementing externally retried financial operations.
10. Add audit records for privileged operations.
11. Treat custody, blockchain, AML/KYC, sanctions, and fraud as specialist integrations.
12. Do not expose a domain endpoint before its authentication and authorization requirements are defined.

## 15. Phase 2 handoff

Phase 2 is the next implementation gate. It should be started only after explicit approval.

Recommended Phase 2 workstream:

1. Define database ownership and naming conventions.
2. Add Drizzle schema and relation directories.
3. Add `drizzle.config.ts`.
4. Define UUID, timestamps, status, and soft-delete conventions.
5. Add constraints and indexes deliberately.
6. Define migration generation and application commands.
7. Add development-only seed strategy.
8. Add database integration tests.
9. Document rollback and migration safety.
10. Re-run full typecheck, build, unit tests, and live readiness checks.

No Phase 2 schema is implied by this document. The exact domain model should be approved before implementation.

## 16. Production-readiness disclaimer

Phase 1 is a functioning backend foundation, not a complete exchange deployment. Before handling real users or funds, the project still needs:

- independent security review
- threat modeling and abuse-case review
- authentication and hardened session/token management
- admin RBAC and privileged-action controls
- immutable audit trail
- ledger correctness review
- custody/HSM/MPC architecture
- blockchain confirmation and reorg handling
- AML/KYC and sanctions screening
- withdrawal risk controls
- fraud detection
- monitoring, alerting, backups, and disaster recovery
- secrets management and key rotation
- privacy and data-retention controls
- load, resilience, and failure-injection testing
- deployment and incident-response procedures
