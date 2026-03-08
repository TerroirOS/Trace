CREATE TABLE IF NOT EXISTS producers (
  producer_id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  region TEXT,
  organization_wallet TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  batch_id TEXT PRIMARY KEY,
  producer_id TEXT NOT NULL REFERENCES producers(producer_id),
  product_type TEXT NOT NULL,
  varietal_or_subtype TEXT NOT NULL,
  vineyard_or_farm_location TEXT NOT NULL,
  harvest_date DATE NOT NULL,
  schema_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issuer_attestations (
  issuer_id TEXT PRIMARY KEY,
  organization_name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  roles JSONB NOT NULL,
  trusted BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS batch_events (
  event_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES batches(batch_id),
  event_type TEXT NOT NULL,
  issuer_id TEXT NOT NULL REFERENCES issuer_attestations(issuer_id),
  event_timestamp TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  payout_reference TEXT,
  document_refs JSONB NOT NULL,
  prev_event_hash TEXT,
  signature TEXT NOT NULL,
  event_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES batch_events(event_id),
  uri TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  media_type TEXT,
  visibility TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chain_transactions (
  tx_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES batch_events(event_id),
  status TEXT NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS external_events (
  external_event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  related_batch_id TEXT REFERENCES batches(batch_id)
);
