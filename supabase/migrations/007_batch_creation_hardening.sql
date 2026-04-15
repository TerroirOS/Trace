CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_identity_unique
  ON batches (
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
