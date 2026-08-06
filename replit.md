# Zebvix Exchange Backend Foundation

Phase 1 backend foundation for the Zebvix Exchange administration and future client APIs.

For the complete developer and operations handoff, read:

- `README.md` — project onboarding and quick reference
- `docs/phase-1-backend-foundation.md` — detailed architecture, runtime, API, security, testing, and handoff documentation
- `artifacts/api-server/README.md` — API-service-specific commands and behavior

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional in development: `REDIS_URL` defaults to `redis://127.0.0.1:6379`; production requires it.
- `docker compose up -d` — start local PostgreSQL and Redis for foundation development.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Fastify 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Cache/jobs: Redis + BullMQ foundation
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/api-server/src/config/` — validated environment, PostgreSQL, Redis, and Pino setup.
- `artifacts/api-server/src/server.ts` — Fastify app construction and graceful shutdown.
- `artifacts/api-server/src/routes/` — health and readiness routes.
- `docker-compose.yml` — local PostgreSQL and Redis development services.

## Architecture decisions

- Phase 1 intentionally contains infrastructure only; exchange domain tables and financial workflows begin in Phase 2.
- PostgreSQL remains the authoritative persistence layer; Redis is an infrastructure dependency for cache, rate limiting, fan-out, and BullMQ.
- `/api/health` and `/api/ready` are available now, with `/api/healthz` preserved for the existing artifact health probe.

## Product

The backend foundation exposes a version-ready API service with security middleware, structured errors, operational health/readiness checks, and managed database/cache connections. No exchange balances, orders, custody, or ledger logic exists yet.

## User preferences

The uploaded Zebvix master prompt requires implementation phase-by-phase and explicitly stops after Phase 1 until approval.

## Gotchas

- Do not add exchange tables or financial domain logic before Phase 2 is explicitly approved.
- Production startup fails when `REDIS_URL` is missing; development may use the local default.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `docs/phase-1-backend-foundation.md` before changing the Phase 1 runtime or beginning Phase 2
