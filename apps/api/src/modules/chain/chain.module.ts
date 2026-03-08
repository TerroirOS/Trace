import { Module } from "@nestjs/common";
import { ChainService } from "./chain.service";
import { ChainController } from "./chain.controller";
import { ChainWorker } from "./chain.worker";

@Module({
  providers: [ChainService, ChainWorker],
  controllers: [ChainController],
  exports: [ChainService]
})
export class ChainModule {}
