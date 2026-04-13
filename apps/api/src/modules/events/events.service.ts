import { Injectable } from "@nestjs/common";
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

  async create(input: BatchEvent): Promise<BatchEvent> {
    await this.batchesService.getById(input.batchId);
    await this.issuersService.getById(input.issuerId);
    const event = traceEventSchema.parse(input);
    await this.eventAuthzService.authorizeEventType(event);
    await this.eventAuthzService.verifySignature(event);
    await this.store.saveBatchEvent(event);
    await this.chainService.queueAttestation(event.eventId);
    return event;
  }

  async listByBatch(batchId: string): Promise<BatchEvent[]> {
    await this.batchesService.getById(batchId);
    return this.store.listBatchEventsByBatchId(batchId);
  }

  async getById(eventId: string): Promise<BatchEvent> {
    return this.store.getBatchEventById(eventId);
  }
}
