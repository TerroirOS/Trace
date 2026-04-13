import { Injectable } from "@nestjs/common";
import type { BatchEvent } from "@terroiros/schemas";
import { hashTraceEvent, traceEventSchema } from "@terroiros/schemas";
import { DatabaseService } from "./database.service";
import type { PgRow } from "./database.types";

@Injectable()
export class BatchEventRepository {
  private readonly cache = new Map<string, BatchEvent>();

  constructor(private readonly databaseService: DatabaseService) {}

  async save(input: BatchEvent): Promise<BatchEvent> {
    const event = traceEventSchema.parse(input);
    await this.databaseService.query(
      `INSERT INTO batch_events (
          event_id, batch_id, schema_version, event_type, issuer_id, event_timestamp,
          payload, payout_reference, document_refs, prev_event_hash, signature, event_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, $12)
        ON CONFLICT (event_id) DO UPDATE
        SET batch_id = EXCLUDED.batch_id,
            schema_version = EXCLUDED.schema_version,
            event_type = EXCLUDED.event_type,
            issuer_id = EXCLUDED.issuer_id,
            event_timestamp = EXCLUDED.event_timestamp,
            payload = EXCLUDED.payload,
            payout_reference = EXCLUDED.payout_reference,
            document_refs = EXCLUDED.document_refs,
            prev_event_hash = EXCLUDED.prev_event_hash,
            signature = EXCLUDED.signature,
            event_hash = EXCLUDED.event_hash`,
      [
        event.eventId,
        event.batchId,
        event.schemaVersion,
        event.eventType,
        event.issuerId,
        event.timestamp,
        JSON.stringify(event.payload),
        event.payoutReference ?? null,
        JSON.stringify(event.documentRefs),
        event.prevEventHash ?? null,
        event.signature,
        hashTraceEvent(event)
      ],
      `save event ${event.eventId}`
    );
    this.cache.set(event.eventId, event);
    return event;
  }

  async listByBatchId(batchId: string): Promise<BatchEvent[]> {
    const result = await this.databaseService.query(
      `SELECT event_id, batch_id, schema_version, event_type, issuer_id, event_timestamp,
              payload, payout_reference, document_refs, prev_event_hash, signature
       FROM batch_events
       WHERE batch_id = $1
       ORDER BY event_timestamp ASC, created_at ASC`,
      [batchId],
      `list events for batch ${batchId}`
    );
    if (!result) {
      return [...this.cache.values()]
        .filter((event) => event.batchId === batchId)
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    }
    const events = result.rows.map((row) => this.mapRow(row));
    for (const event of events) {
      this.cache.set(event.eventId, event);
    }
    return events;
  }

  async findById(eventId: string): Promise<BatchEvent | null> {
    const cached = this.cache.get(eventId);
    if (cached) {
      return cached;
    }
    const result = await this.databaseService.query(
      `SELECT event_id, batch_id, schema_version, event_type, issuer_id, event_timestamp,
              payload, payout_reference, document_refs, prev_event_hash, signature
       FROM batch_events
       WHERE event_id = $1
       LIMIT 1`,
      [eventId],
      `get event ${eventId}`
    );
    const row = result?.rows[0];
    if (!row) {
      return null;
    }
    const event = this.mapRow(row);
    this.cache.set(event.eventId, event);
    return event;
  }

  async getEventHashById(eventId: string): Promise<string | null> {
    const cached = this.cache.get(eventId);
    if (cached) {
      return hashTraceEvent(cached);
    }
    const result = await this.databaseService.query(
      `SELECT event_hash
       FROM batch_events
       WHERE event_id = $1
       LIMIT 1`,
      [eventId],
      `get event hash ${eventId}`
    );
    const row = result?.rows[0];
    return typeof row?.event_hash === "string" ? row.event_hash : null;
  }

  private mapRow(row: PgRow): BatchEvent {
    return traceEventSchema.parse({
      eventId: row.event_id,
      batchId: row.batch_id,
      schemaVersion: row.schema_version,
      eventType: row.event_type,
      issuerId: row.issuer_id,
      timestamp: new Date(row.event_timestamp as string).toISOString(),
      payload: this.parseJsonObject(row.payload),
      payoutReference: (row.payout_reference as string) ?? undefined,
      documentRefs: this.parseJsonArray(row.document_refs),
      prevEventHash: (row.prev_event_hash as string) ?? undefined,
      signature: row.signature
    });
  }

  private parseJsonArray(value: unknown): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value !== "string") {
      return [];
    }
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private parseJsonObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value !== "string") {
      return {};
    }
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
