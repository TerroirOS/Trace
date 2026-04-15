CREATE TABLE IF NOT EXISTS producers (
  producer_id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  region TEXT,
  organization_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS producers_organization_wallet_idx
  ON producers(organization_wallet);

CREATE UNIQUE INDEX IF NOT EXISTS producers_organization_wallet_unique_idx
  ON producers(LOWER(organization_wallet));

CREATE TABLE IF NOT EXISTS batches (
  batch_id TEXT PRIMARY KEY,
  producer_id TEXT NOT NULL REFERENCES producers(producer_id),
  product_type TEXT NOT NULL,
  varietal_or_subtype TEXT NOT NULL,
  vineyard_or_farm_location TEXT NOT NULL,
  harvest_date DATE NOT NULL,
  schema_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS batches_producer_id_idx
  ON batches(producer_id);

CREATE UNIQUE INDEX IF NOT EXISTS batches_identity_unique_idx
  ON batches(
    producer_id,
    LOWER(product_type),
    LOWER(varietal_or_subtype),
    LOWER(vineyard_or_farm_location),
    harvest_date
  );

ALTER TABLE batches
  DROP CONSTRAINT IF EXISTS batches_schema_version_chk;

ALTER TABLE batches
  ADD CONSTRAINT batches_schema_version_chk
  CHECK (schema_version = '1.0.0');

CREATE TABLE IF NOT EXISTS issuers (
  issuer_id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]'::JSONB,
  trusted BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS issuers_wallet_address_idx
  ON issuers(wallet_address);

CREATE UNIQUE INDEX IF NOT EXISTS issuers_wallet_address_unique_idx
  ON issuers(LOWER(wallet_address));

ALTER TABLE issuers
  DROP CONSTRAINT IF EXISTS issuers_roles_non_empty_chk;

ALTER TABLE issuers
  ADD CONSTRAINT issuers_roles_non_empty_chk
  CHECK (
    jsonb_typeof(roles) = 'array'
    AND jsonb_array_length(roles) > 0
  );

CREATE TABLE IF NOT EXISTS batch_events (
  event_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batches(batch_id),
  schema_version TEXT NOT NULL DEFAULT '1.0.0',
  event_type TEXT NOT NULL,
  issuer_id TEXT NOT NULL REFERENCES issuers(issuer_id),
  event_timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  payout_reference TEXT,
  document_refs JSONB NOT NULL DEFAULT '[]'::JSONB,
  prev_event_hash TEXT,
  signature TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES batch_events(event_id),
  uri TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  media_type TEXT,
  visibility TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chain_transactions (
  tx_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES batch_events(event_id),
  status TEXT NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE chain_transactions
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_challenges (
  wallet_address TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_events (
  external_event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  related_batch_id TEXT REFERENCES batches(batch_id)
);

CREATE INDEX IF NOT EXISTS external_events_related_batch_id_idx
  ON external_events(related_batch_id);

CREATE UNIQUE INDEX IF NOT EXISTS chain_transactions_event_id_uniq
  ON chain_transactions(event_id);

CREATE INDEX IF NOT EXISTS chain_transactions_status_updated_at_idx
  ON chain_transactions(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS auth_challenges_created_at_idx
  ON auth_challenges(created_at DESC);

CREATE INDEX IF NOT EXISTS batch_events_batch_id_event_timestamp_idx
  ON batch_events(batch_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS batch_events_issuer_id_event_timestamp_idx
  ON batch_events(issuer_id, event_timestamp DESC);
