import { Controller, Get } from "@nestjs/common";
import { ChainService } from "./chain.service";
import type { ChainTransaction } from "../data/store.service";

@Controller("chain")
export class ChainController {
  constructor(private readonly chainService: ChainService) {}

  @Get("transactions")
  async listTransactions(): Promise<ChainTransaction[]> {
    return this.chainService.listTransactions();
  }
}
