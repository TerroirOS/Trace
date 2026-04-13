import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { BatchEvent } from "@terroiros/schemas";
import { EventsService } from "./events.service";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() body: BatchEvent): Promise<BatchEvent> {
    return this.eventsService.create(body);
  }

  @Get(":eventId")
  async getById(@Param("eventId") eventId: string): Promise<BatchEvent> {
    return this.eventsService.getById(eventId);
  }

  @Get("batch/:batchId")
  async listByBatch(@Param("batchId") batchId: string): Promise<BatchEvent[]> {
    return this.eventsService.listByBatch(batchId);
  }
}
