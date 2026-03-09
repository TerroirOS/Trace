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
  getById(@Param("eventId") eventId: string): BatchEvent {
    return this.eventsService.getById(eventId);
  }

  @Get("batch/:batchId")
  listByBatch(@Param("batchId") batchId: string): BatchEvent[] {
    return this.eventsService.listByBatch(batchId);
  }
}
