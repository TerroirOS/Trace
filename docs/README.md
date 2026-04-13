# TerroirOS Documentation

This directory contains protocol, API, architecture, and pilot data docs for
TerroirOS Trace.

- `protocol.md`: protocol model and lifecycle events
- `api.md`: MVP API surface
- `environment.md`: shared `.env` contract for API, web, database, and chain settings
- `monorepo-boundaries.md`: workspace ownership and allowed dependency edges
- `database-schema-audit.md`: canonical table contract and Supabase compatibility notes
- `api-persistence.md`: Postgres-backed API state and restart-survival notes
- `data-access-layer.md`: repository ownership and shared database access boundaries
- `local-demo-data.md`: local migration runner and deterministic Georgian wine seed flow
- `restart-verification.md`: DB-backed API restart verification for list/detail endpoints
- `producer-onboarding.md`: producer onboarding validation, idempotency, and wallet-uniqueness rules
- `tooling.md`: shared TypeScript, linting, and formatting baseline
- `trace-production-architecture.md`: production blockchain + database requirements
- `../apps/api/db/supabase.schema.sql`: Supabase DDL for MVP tables
