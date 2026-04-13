-- Align the original Supabase baseline with the canonical Trace API schema.
-- This keeps hosted environments compatible without dropping operational metadata
-- such as UUID surrogate keys, updated_at triggers, or RLS policies.

ALTER TABLE producers
  ALTER COLUMN organization_wallet SET NOT NULL;

ALTER TABLE batches
  ALTER COLUMN product_type SET NOT NULL,
  ALTER COLUMN varietal_or_subtype SET NOT NULL,
  ALTER COLUMN vineyard_or_farm_location SET NOT NULL,
  ALTER COLUMN harvest_date SET NOT NULL,
  ALTER COLUMN schema_version SET DEFAULT '1.0.0';

ALTER TABLE issuers
  ALTER COLUMN wallet_address SET NOT NULL,
  ALTER COLUMN trusted SET DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'issuers'
      AND column_name = 'roles'
      AND udt_name <> 'jsonb'
  ) THEN
    ALTER TABLE issuers
      ALTER COLUMN roles DROP DEFAULT;

    ALTER TABLE issuers
      ALTER COLUMN roles TYPE JSONB
      USING to_jsonb(COALESCE(roles, ARRAY[]::TEXT[]));
  END IF;
END $$;

ALTER TABLE issuers
  ALTER COLUMN roles SET DEFAULT '[]'::JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'batch_events'
      AND column_name = 'timestamp'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'batch_events'
      AND column_name = 'event_timestamp'
  ) THEN
    ALTER TABLE batch_events RENAME COLUMN "timestamp" TO event_timestamp;
  END IF;
END $$;

ALTER TABLE batch_events
  ADD COLUMN IF NOT EXISTS schema_version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS document_refs JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS prev_event_hash TEXT,
  ADD COLUMN IF NOT EXISTS event_hash TEXT;

ALTER TABLE batch_events
  ALTER COLUMN payload SET DEFAULT '{}'::JSONB;

ALTER TABLE chain_transactions
  ALTER COLUMN event_id SET NOT NULL,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_events'
      AND column_name = 'batch_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_events'
      AND column_name = 'related_batch_id'
  ) THEN
    ALTER TABLE external_events RENAME COLUMN batch_id TO related_batch_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_events'
      AND column_name = 'received_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_events'
      AND column_name = 'observed_at'
  ) THEN
    ALTER TABLE external_events RENAME COLUMN received_at TO observed_at;
  END IF;
END $$;

ALTER TABLE external_events
  ADD COLUMN IF NOT EXISTS external_event_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'external_events'
      AND column_name = 'id'
  ) THEN
    UPDATE external_events
    SET external_event_id = COALESCE(
      external_event_id,
      COALESCE(id::TEXT, gen_random_uuid()::TEXT)
    )
    WHERE external_event_id IS NULL;
  ELSE
    UPDATE external_events
    SET external_event_id = COALESCE(external_event_id, gen_random_uuid()::TEXT)
    WHERE external_event_id IS NULL;
  END IF;
END $$;

ALTER TABLE external_events
  ALTER COLUMN external_event_id SET NOT NULL,
  ALTER COLUMN observed_at SET DEFAULT NOW(),
  ALTER COLUMN payload SET DEFAULT '{}'::JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'external_events_pkey'
      AND conrelid = 'public.external_events'::regclass
  ) THEN
    ALTER TABLE external_events
      ADD CONSTRAINT external_events_pkey PRIMARY KEY (external_event_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS external_events_external_event_id_uniq
  ON external_events (external_event_id);

DROP INDEX IF EXISTS idx_external_events_batch;
CREATE INDEX IF NOT EXISTS idx_external_events_batch
  ON external_events (related_batch_id);

CREATE INDEX IF NOT EXISTS idx_batch_events_batch_timestamp
  ON batch_events (batch_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_batch_events_issuer_timestamp
  ON batch_events (issuer_id, event_timestamp DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chain_tx_event_unique
  ON chain_transactions (event_id);
