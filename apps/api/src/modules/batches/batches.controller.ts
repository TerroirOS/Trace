import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Batch } from "@terroiros/schemas";
import { CreateBatchDto, toBatchInput } from "./batches.dto";
import { BatchesService } from "./batches.service";

@Controller("batches")
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  async create(@Body() body: CreateBatchDto): Promise<Batch> {
    return this.batchesService.create(toBatchInput(body));
  }

  @Get()
  async list(): Promise<Batch[]> {
    return this.batchesService.list();
  }

  @Get(":batchId")
  async getById(@Param("batchId") batchId: string): Promise<Batch> {
    return this.batchesService.getById(batchId);
  }
}
