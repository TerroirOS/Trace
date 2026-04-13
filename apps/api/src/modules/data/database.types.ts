export type PgRow = Record<string, unknown>;
export type PgRowSet = { rows: PgRow[] };
export type PgPoolLike = {
  query: (text: string, values?: unknown[]) => Promise<PgRowSet>;
  end: () => Promise<void>;
};
