import { Injectable } from "@nestjs/common";
import type { Batch } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";
import { ProducersService } from "../producers/producers.service";

@Injectable()
export class BatchesService {
  constructor(
    private readonly store: StoreService,
    private readonly producersService: ProducersService
  ) {}

  async create(input: Batch): Promise<Batch> {
    await this.producersService.getById(input.producerId);
    return this.store.saveBatch(input);
  }

  async list(): Promise<Batch[]> {
    return this.store.listBatches();
  }

  async getById(batchId: string): Promise<Batch> {
    return this.store.getBatchById(batchId);
  }
}
