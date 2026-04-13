CREATE UNIQUE INDEX IF NOT EXISTS producers_organization_wallet_unique_idx
  ON producers (LOWER(organization_wallet));
