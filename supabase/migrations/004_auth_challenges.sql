ALTER TABLE IF EXISTS chain_transactions
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_challenges (
  wallet_address TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_created_at
  ON auth_challenges(created_at DESC);

ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'auth_challenges'
      AND policyname = 'Service read auth_challenges'
  ) THEN
    CREATE POLICY "Service read auth_challenges"
      ON auth_challenges
      FOR SELECT
      USING (auth.role() = 'service_role');
  END IF;
END
$$;
