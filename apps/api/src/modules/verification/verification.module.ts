import { Module } from "@nestjs/common";
import { VerificationService } from "./verification.service";
import { VerificationController } from "./verification.controller";
import { BatchesModule } from "../batches/batches.module";
import { EventsModule } from "../events/events.module";
import { IssuersModule } from "../issuers/issuers.module";

@Module({
  imports: [BatchesModule, EventsModule, IssuersModule],
  providers: [VerificationService],
  controllers: [VerificationController]
})
export class VerificationModule {}
