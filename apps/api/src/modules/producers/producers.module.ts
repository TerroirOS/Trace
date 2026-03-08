import { Module } from "@nestjs/common";
import { ProducersService } from "./producers.service";
import { ProducersController } from "./producers.controller";

@Module({
  providers: [ProducersService],
  controllers: [ProducersController],
  exports: [ProducersService]
})
export class ProducersModule {}
