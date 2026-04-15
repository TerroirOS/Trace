import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { TRACE_SCHEMA_VERSION, type Batch } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";
import { ProducersService } from "../producers/producers.service";

@Injectable()
export class BatchesService {
  constructor(
    private readonly store: StoreService,
    private readonly producersService: ProducersService
  ) {}

  async create(input: Batch): Promise<Batch> {
    const normalized = this.normalize(input);
    await this.producersService.getById(normalized.producerId);

    const existing = await this.store.findBatchById(normalized.batchId);
    if (existing) {
      if (this.isSameBatch(existing, normalized)) {
        return existing;
      }
      throw new ConflictException(
        `Batch ${normalized.batchId} already exists with different creation details.`
      );
    }

    const duplicate = await this.store.findDuplicateBatch(normalized);
    if (duplicate) {
      throw new ConflictException(
        `Batch ${duplicate.batchId} already exists for producer ${normalized.producerId} with the same product, varietal, location, and harvest date.`
      );
    }

    return this.store.saveBatch(normalized);
  }

  async list(): Promise<Batch[]> {
    return this.store.listBatches();
  }

  async getById(batchId: string): Promise<Batch> {
    return this.store.getBatchById(batchId);
  }

  private normalize(input: Batch): Batch {
    const schemaVersion = input.schemaVersion.trim();
    if (schemaVersion !== TRACE_SCHEMA_VERSION) {
      throw new BadRequestException(
        `Unsupported batch schemaVersion ${schemaVersion}. Expected ${TRACE_SCHEMA_VERSION}.`
      );
    }
    return {
      batchId: input.batchId.trim(),
      producerId: input.producerId.trim(),
      productType: input.productType.trim(),
      varietalOrSubtype: input.varietalOrSubtype.trim(),
      vineyardOrFarmLocation: input.vineyardOrFarmLocation.trim(),
      harvestDate: input.harvestDate.trim(),
      schemaVersion
    };
  }

  private isSameBatch(left: Batch, right: Batch): boolean {
    return (
      left.batchId === right.batchId &&
      left.producerId === right.producerId &&
      left.productType.trim().toLowerCase() === right.productType.trim().toLowerCase() &&
      left.varietalOrSubtype.trim().toLowerCase() ===
        right.varietalOrSubtype.trim().toLowerCase() &&
      left.vineyardOrFarmLocation.trim().toLowerCase() ===
        right.vineyardOrFarmLocation.trim().toLowerCase() &&
      left.harvestDate === right.harvestDate &&
      left.schemaVersion === right.schemaVersion
    );
  }
}
