import { Injectable, NotFoundException } from "@nestjs/common";
import type { Producer } from "@terroiros/schemas";
import { producerSchema } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";

@Injectable()
export class ProducersService {
  constructor(private readonly store: StoreService) {}

  create(input: Producer): Producer {
    const producer = producerSchema.parse(input);
    this.store.producers.set(producer.producerId, producer);
    return producer;
  }

  list(): Producer[] {
    return [...this.store.producers.values()];
  }

  getById(producerId: string): Producer {
    const producer = this.store.producers.get(producerId);
    if (!producer) {
      throw new NotFoundException(`Producer ${producerId} not found.`);
    }
    return producer;
  }
}
