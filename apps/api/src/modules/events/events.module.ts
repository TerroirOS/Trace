import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { BatchesModule } from "../batches/batches.module";
import { IssuersModule } from "../issuers/issuers.module";
import { ChainModule } from "../chain/chain.module";
import { EventAuthzService } from "./event-authz.service";

@Module({
  imports: [BatchesModule, IssuersModule, ChainModule],
  providers: [EventsService, EventAuthzService],
  controllers: [EventsController],
  exports: [EventsService]
})
export class EventsModule {}
