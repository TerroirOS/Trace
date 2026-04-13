import { Controller, Get } from "@nestjs/common";
import { ChainService } from "./chain.service";
import type { ChainTransaction } from "../data/chain-transaction.types";

@Controller("chain")
export class ChainController {
  constructor(private readonly chainService: ChainService) {}

  @Get("transactions")
  async listTransactions(): Promise<ChainTransaction[]> {
    return this.chainService.listTransactions();
  }
}
