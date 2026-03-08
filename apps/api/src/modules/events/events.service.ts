import { Injectable, NotFoundException } from "@nestjs/common";
import type { BatchEvent } from "@terroiros/schemas";
import { traceEventSchema } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";
import { BatchesService } from "../batches/batches.service";
import { IssuersService } from "../issuers/issuers.service";
import { ChainService } from "../chain/chain.service";
import { EventAuthzService } from "./event-authz.service";

@Injectable()
export class EventsService {
  constructor(
    private readonly store: StoreService,
    private readonly batchesService: BatchesService,
    private readonly issuersService: IssuersService,
    private readonly chainService: ChainService,
    private readonly eventAuthzService: EventAuthzService
  ) {}

  create(input: BatchEvent): BatchEvent {
    this.batchesService.getById(input.batchId);
    this.issuersService.getById(input.issuerId);
    const event = traceEventSchema.parse(input);
    this.eventAuthzService.authorizeEventType(event);
    const recoveredSigner = this.eventAuthzService.verifySignature(event);
    this.store.batchEvents.set(event.eventId, event);
    this.store.recoveredSignersByEventId.set(event.eventId, recoveredSigner);
    this.chainService.queueAttestation(event.eventId);
    return event;
  }

  listByBatch(batchId: string): BatchEvent[] {
    this.batchesService.getById(batchId);
    return [...this.store.batchEvents.values()]
      .filter((event) => event.batchId === batchId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  getById(eventId: string): BatchEvent {
    const event = this.store.batchEvents.get(eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found.`);
    }
    return event;
  }
}
