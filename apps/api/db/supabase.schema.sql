-- Supabase/Postgres schema aligned with TerroirOS Trace API and web client.

create table if not exists producers (
  producer_id text primary key,
  legal_name text not null,
  country_code char(2) not null,
  region text,
  organization_wallet text not null,
  created_at timestamptz not null default now()
);

create table if not exists batches (
  batch_id text primary key,
  producer_id text not null references producers(producer_id),
  product_type text not null,
  varietal_or_subtype text not null,
  vineyard_or_farm_location text not null,
  harvest_date date not null,
  schema_version text not null,
  qr_token text unique,
  created_at timestamptz not null default now()
);

create table if not exists issuers (
  issuer_id text primary key,
  organization_name text not null,
  wallet_address text not null,
  roles jsonb not null,
  trusted boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists batch_events (
  event_id text primary key,
  batch_id text not null references batches(batch_id),
  event_type text not null,
  issuer_id text not null references issuers(issuer_id),
  event_timestamp timestamptz not null,
  payload jsonb not null,
  payout_reference text,
  document_refs jsonb not null,
  prev_event_hash text,
  signature text not null,
  event_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists chain_transactions (
  tx_id text primary key,
  event_id text not null references batch_events(event_id),
  status text not null,
  tx_hash text,
  block_number bigint,
  error text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id bigserial primary key,
  event_id text not null references batch_events(event_id),
  uri text not null,
  content_hash text not null,
  media_type text,
  visibility text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists chain_transactions_event_id_uniq
  on chain_transactions(event_id);

create index if not exists chain_transactions_status_updated_at_idx
  on chain_transactions(status, updated_at desc);

create index if not exists batch_events_batch_id_event_timestamp_idx
  on batch_events(batch_id, event_timestamp desc);

create index if not exists batch_events_issuer_id_event_timestamp_idx
  on batch_events(issuer_id, event_timestamp desc);
