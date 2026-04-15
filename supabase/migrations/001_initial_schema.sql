-- TerroirOS Trace · Initial Schema
-- Supabase-ready migration with RLS policies

-- =============================================================
-- Extensions
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- 1. producers
-- =============================================================
CREATE TABLE producers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id     TEXT NOT NULL UNIQUE,
  legal_name      TEXT NOT NULL,
  country_code    CHAR(2) NOT NULL DEFAULT 'GE',
  region          TEXT,
  organization_wallet TEXT NOT NULL,
  profile_image_url   TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_producers_wallet ON producers (organization_wallet);

-- =============================================================
-- 2. batches
-- =============================================================
CREATE TABLE batches (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                TEXT NOT NULL UNIQUE,
  producer_id             TEXT NOT NULL REFERENCES producers(producer_id) ON DELETE CASCADE,
  product_type            TEXT NOT NULL,
  varietal_or_subtype     TEXT NOT NULL,
  vineyard_or_farm_location TEXT NOT NULL,
  harvest_date            DATE NOT NULL,
  schema_version          TEXT NOT NULL DEFAULT '1.0.0',
  qr_token                UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_batches_qr_token ON batches (qr_token);
CREATE INDEX idx_batches_producer ON batches (producer_id);
CREATE UNIQUE INDEX idx_batches_identity_unique
  ON batches (
    producer_id,
    LOWER(product_type),
    LOWER(varietal_or_subtype),
    LOWER(vineyard_or_farm_location),
    harvest_date
  );

ALTER TABLE batches
  ADD CONSTRAINT batches_schema_version_chk
  CHECK (schema_version = '1.0.0');

-- =============================================================
-- 3. issuers
-- =============================================================
CREATE TABLE issuers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id         TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL,
  wallet_address    TEXT NOT NULL,
  roles             JSONB NOT NULL DEFAULT '[]'::JSONB,
  trusted           BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_issuers_wallet ON issuers (wallet_address);

CREATE UNIQUE INDEX IF NOT EXISTS idx_issuers_wallet_unique
  ON issuers (LOWER(wallet_address));

ALTER TABLE issuers
  ADD CONSTRAINT issuers_roles_non_empty_chk
  CHECK (
    jsonb_typeof(roles) = 'array'
    AND jsonb_array_length(roles) > 0
  );

-- =============================================================
-- 4. batch_events  (attestation events)
-- =============================================================
CREATE TABLE batch_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        TEXT NOT NULL UNIQUE,
  batch_id        TEXT NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
  schema_version  TEXT NOT NULL DEFAULT '1.0.0',
  event_type      TEXT NOT NULL,
  issuer_id       TEXT NOT NULL REFERENCES issuers(issuer_id),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload         JSONB NOT NULL DEFAULT '{}'::JSONB,
  document_refs   JSONB NOT NULL DEFAULT '[]'::JSONB,
  prev_event_hash TEXT,
  signature       TEXT NOT NULL,
  event_hash      TEXT NOT NULL,
  payout_reference TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_events_batch ON batch_events (batch_id);
CREATE INDEX idx_batch_events_issuer ON batch_events (issuer_id);
CREATE INDEX idx_batch_events_type ON batch_events (event_type);

-- =============================================================
-- 5. documents  (evidence files stored in Supabase Storage)
-- =============================================================
CREATE TABLE documents (
  id              BIGSERIAL PRIMARY KEY,
  event_id        TEXT NOT NULL REFERENCES batch_events(event_id),
  uri             TEXT NOT NULL,
  content_hash    TEXT NOT NULL,
  media_type      TEXT,
  visibility      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_event ON documents (event_id);

-- =============================================================
-- 6. chain_transactions  (on-chain anchoring status)
-- =============================================================
CREATE TABLE chain_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_id           TEXT NOT NULL UNIQUE,
  event_id        TEXT NOT NULL REFERENCES batch_events(event_id),
  status          TEXT NOT NULL DEFAULT 'QUEUED'
                    CHECK (status IN ('QUEUED','SUBMITTED','CONFIRMED','FAILED')),
  tx_hash         TEXT,
  block_number    BIGINT,
  error           TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chain_tx_event ON chain_transactions (event_id);
CREATE INDEX idx_chain_tx_status ON chain_transactions (status);

-- =============================================================
-- 7. auth_challenges  (wallet challenge persistence)
-- =============================================================
CREATE TABLE auth_challenges (
  wallet_address  TEXT PRIMARY KEY,
  challenge       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_challenges_created_at ON auth_challenges (created_at DESC);

-- =============================================================
-- 8. external_events  (Shield extension placeholder)
-- =============================================================
CREATE TABLE external_events (
  external_event_id TEXT PRIMARY KEY,
  source          TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload         JSONB NOT NULL DEFAULT '{}'::JSONB,
  related_batch_id TEXT REFERENCES batches(batch_id)
);

CREATE INDEX idx_external_events_batch ON external_events (related_batch_id);

-- =============================================================
-- Auto-update updated_at trigger
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_producers_updated   BEFORE UPDATE ON producers          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_batches_updated     BEFORE UPDATE ON batches            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_issuers_updated     BEFORE UPDATE ON issuers            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_batch_events_updated BEFORE UPDATE ON batch_events      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chain_tx_updated    BEFORE UPDATE ON chain_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- Row Level Security
-- =============================================================
ALTER TABLE producers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_challenges    ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_events    ENABLE ROW LEVEL SECURITY;

-- Public read for verification pages (anon role)
CREATE POLICY "Public read producers"          ON producers          FOR SELECT USING (true);
CREATE POLICY "Public read batches"            ON batches            FOR SELECT USING (true);
CREATE POLICY "Public read issuers"            ON issuers            FOR SELECT USING (true);
CREATE POLICY "Public read batch_events"       ON batch_events       FOR SELECT USING (true);
CREATE POLICY "Public read documents"          ON documents          FOR SELECT USING (true);
CREATE POLICY "Public read chain_transactions" ON chain_transactions FOR SELECT USING (true);
CREATE POLICY "Service read auth_challenges"   ON auth_challenges    FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Public read external_events"    ON external_events    FOR SELECT USING (true);

-- Authenticated users can insert/update their own producer data
-- (wallet address matches auth.jwt() ->> 'sub')
CREATE POLICY "Producer insert own" ON producers
  FOR INSERT
  WITH CHECK (organization_wallet = current_setting('request.jwt.claim.sub', true));

CREATE POLICY "Producer update own" ON producers
  FOR UPDATE
  USING (organization_wallet = current_setting('request.jwt.claim.sub', true));

-- Producers can manage their own batches
CREATE POLICY "Producer insert batches" ON batches
  FOR INSERT
  WITH CHECK (
    producer_id IN (
      SELECT producer_id FROM producers
      WHERE organization_wallet = current_setting('request.jwt.claim.sub', true)
    )
  );

CREATE POLICY "Producer update batches" ON batches
  FOR UPDATE
  USING (
    producer_id IN (
      SELECT producer_id FROM producers
      WHERE organization_wallet = current_setting('request.jwt.claim.sub', true)
    )
  );

-- Issuers can insert events for batches they are authorized on
CREATE POLICY "Issuer insert events" ON batch_events
  FOR INSERT
  WITH CHECK (
    issuer_id IN (
      SELECT issuer_id FROM issuers
      WHERE wallet_address = current_setting('request.jwt.claim.sub', true)
    )
  );

-- Service role bypass (for Edge Functions / backend operations)
-- Supabase service_role already bypasses RLS by default.

-- =============================================================
-- Storage bucket (run via Supabase dashboard or CLI)
-- =============================================================
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('trace-evidence', 'trace-evidence', false);
