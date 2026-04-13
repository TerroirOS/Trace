import { Global, Module } from "@nestjs/common";
import { BatchEventRepository } from "./batch-event.repository";
import { BatchRepository } from "./batch.repository";
import { ChainTransactionRepository } from "./chain-transaction.repository";
import { DatabaseService } from "./database.service";
import { IssuerRepository } from "./issuer.repository";
import { ProducerRepository } from "./producer.repository";
import { StoreService } from "./store.service";

@Global()
@Module({
  providers: [
    DatabaseService,
    ProducerRepository,
    IssuerRepository,
    BatchRepository,
    BatchEventRepository,
    ChainTransactionRepository,
    StoreService
  ],
  exports: [
    DatabaseService,
    ProducerRepository,
    IssuerRepository,
    BatchRepository,
    BatchEventRepository,
    ChainTransactionRepository,
    StoreService
  ]
})
export class DataModule {}
