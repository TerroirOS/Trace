CREATE UNIQUE INDEX IF NOT EXISTS issuers_wallet_address_unique_idx
  ON issuers (LOWER(wallet_address));

ALTER TABLE issuers
  DROP CONSTRAINT IF EXISTS issuers_roles_non_empty_chk;

ALTER TABLE issuers
  ADD CONSTRAINT issuers_roles_non_empty_chk
  CHECK (
    jsonb_typeof(roles) = 'array'
    AND jsonb_array_length(roles) > 0
  );
