-- Compatibility shim: keep legacy references to public.issuer_attestations
-- working while public.issuers remains the canonical table.

DO $$
BEGIN
  IF to_regclass('public.issuer_attestations') IS NULL THEN
    EXECUTE '
      CREATE VIEW public.issuer_attestations AS
      SELECT
        issuer_id,
        organization_name,
        wallet_address,
        roles,
        trusted,
        created_at,
        updated_at
      FROM public.issuers
    ';
  END IF;
END $$;
