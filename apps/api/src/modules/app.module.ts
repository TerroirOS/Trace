import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { DataModule } from "./data/data.module";
import { AuthModule } from "./auth/auth.module";
import { ProducersModule } from "./producers/producers.module";
import { IssuersModule } from "./issuers/issuers.module";
import { BatchesModule } from "./batches/batches.module";
import { EventsModule } from "./events/events.module";
import { ChainModule } from "./chain/chain.module";
import { VerificationModule } from "./verification/verification.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DataModule,
    AuthModule,
    ProducersModule,
    IssuersModule,
    BatchesModule,
    EventsModule,
    ChainModule,
    VerificationModule
  ]
})
export class AppModule {}
