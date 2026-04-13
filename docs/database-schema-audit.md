# Trace Database Schema Audit

This note records the Day 6 schema validation pass across:

- `packages/schemas/src/trace.schemas.ts`
- `apps/api/db/schema.sql`
- `apps/api/db/supabase.schema.sql`
- `supabase/migrations/*.sql`

## Canonical contract

The shared API/schema packages define the durable database contract for the MVP:

- `producers`: `producer_id`, identity/profile fields, and `organization_wallet`
- `batches`: producer link plus `product_type`, `varietal_or_subtype`, `vineyard_or_farm_location`, `harvest_date`, and `schema_version`
- `issuers`: `wallet_address`, string-array-like `roles`, and `trusted`
- `batch_events`: `schema_version`, `event_timestamp`, `payload`, `document_refs`, `prev_event_hash`, `signature`, and `event_hash`
- `chain_transactions`: one row per event with retry metadata
- `documents`: normalized document reference rows for event evidence
- `external_events`: reserved bridge table for Shield-style external data intake

## Intentional Supabase-only metadata

The Supabase baseline keeps a few operational columns that are not part of the
shared TypeScript models but are still useful for hosted Postgres workflows:

- UUID surrogate `id` columns on the Supabase migration baseline
- `updated_at` columns and the shared trigger that maintains them
- RLS policies for public verification reads and authenticated producer/issuer writes
- `qr_token` on `batches` for public verification URLs
- `issuer_attestations` compatibility view for older web reads

These extra columns are compatibility metadata. They should not replace or rename
the canonical API-facing columns above.

## Day 6 fixes

This validation pass aligned the checked-in SQL artifacts around the same field
names and defaults:

- `issuers.trusted` now defaults to `TRUE`
- `issuers.wallet_address` is required
- `issuers.roles` is stored as JSONB with an empty-array default
- `batch_events` uses `event_timestamp` as the canonical timestamp column
- `batch_events` includes `schema_version`, `document_refs`, `prev_event_hash`, and `event_hash`
- `chain_transactions` includes `retry_count`
- `external_events` uses `external_event_id`, `observed_at`, and `related_batch_id`

## Remaining limitation

The Nest API still writes core entities to the in-memory `StoreService`. Day 6
only aligns the schema contract and migration baseline so Day 7 can move those
services onto Postgres without fighting table drift first.
