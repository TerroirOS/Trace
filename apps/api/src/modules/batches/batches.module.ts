import { Module } from "@nestjs/common";
import { BatchesController } from "./batches.controller";
import { BatchesService } from "./batches.service";
import { ProducersModule } from "../producers/producers.module";

@Module({
  imports: [ProducersModule],
  providers: [BatchesService],
  controllers: [BatchesController],
  exports: [BatchesService]
})
export class BatchesModule {}
