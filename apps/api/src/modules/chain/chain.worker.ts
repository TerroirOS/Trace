import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { ChainService } from "./chain.service";

@Injectable()
export class ChainWorker {
  constructor(private readonly chainService: ChainService) {}

  @Interval(5000)
  async syncQueue(): Promise<void> {
    await this.chainService.processQueueTick();
  }
}
