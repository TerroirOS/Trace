import { Module } from "@nestjs/common";
import { ChainService } from "./chain.service";
import { ChainController } from "./chain.controller";
import { ChainWorker } from "./chain.worker";
import { ChainClient } from "./chain.client";

@Module({
  providers: [ChainService, ChainWorker, ChainClient],
  controllers: [ChainController],
  exports: [ChainService, ChainClient]
})
export class ChainModule {}
