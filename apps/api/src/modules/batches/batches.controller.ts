import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Batch } from "@terroiros/schemas";
import { BatchesService } from "./batches.service";

@Controller("batches")
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  create(@Body() body: Batch): Batch {
    return this.batchesService.create(body);
  }

  @Get()
  list(): Batch[] {
    return this.batchesService.list();
  }

  @Get(":batchId")
  getById(@Param("batchId") batchId: string): Batch {
    return this.batchesService.getById(batchId);
  }
}
