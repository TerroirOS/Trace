import { Injectable, NotFoundException } from "@nestjs/common";
import type { Batch } from "@terroiros/schemas";
import { batchSchema } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";
import { ProducersService } from "../producers/producers.service";

@Injectable()
export class BatchesService {
  constructor(
    private readonly store: StoreService,
    private readonly producersService: ProducersService
  ) {}

  create(input: Batch): Batch {
    this.producersService.getById(input.producerId);
    const batch = batchSchema.parse(input);
    this.store.batches.set(batch.batchId, batch);
    return batch;
  }

  list(): Batch[] {
    return [...this.store.batches.values()];
  }

  getById(batchId: string): Batch {
    const batch = this.store.batches.get(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found.`);
    }
    return batch;
  }
}
