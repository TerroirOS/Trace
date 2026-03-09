import { Module } from "@nestjs/common";
import { ChainService } from "./chain.service";
import { ChainController } from "./chain.controller";
import { ChainWorker } from "./chain.worker";
import { ChainClient } from "./chain.client";
import { ChainTransactionsStoreService } from "./chain-transactions.store";

@Module({
  providers: [ChainService, ChainWorker, ChainClient, ChainTransactionsStoreService],
  controllers: [ChainController],
  exports: [ChainService, ChainClient]
})
export class ChainModule {}
