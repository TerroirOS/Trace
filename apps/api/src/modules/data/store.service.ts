import { Injectable, NotFoundException } from "@nestjs/common";
import type { Batch, BatchEvent, Issuer, Producer } from "@terroiros/schemas";
import type { ChainTransaction } from "./chain-transaction.types";
import { BatchEventRepository } from "./batch-event.repository";
import { BatchRepository } from "./batch.repository";
import { ChainTransactionRepository } from "./chain-transaction.repository";
import { IssuerRepository } from "./issuer.repository";
import { ProducerRepository } from "./producer.repository";

@Injectable()
export class StoreService {
  readonly chainTransactions = new Map<string, ChainTransaction>();

  constructor(
    private readonly producerRepository: ProducerRepository,
    private readonly issuerRepository: IssuerRepository,
    private readonly batchRepository: BatchRepository,
    private readonly batchEventRepository: BatchEventRepository,
    private readonly chainTransactionRepository: ChainTransactionRepository
  ) {}

  async saveProducer(input: Producer): Promise<Producer> {
    return this.producerRepository.save(input);
  }

  async listProducers(): Promise<Producer[]> {
    return this.producerRepository.list();
  }

  async getProducerById(producerId: string): Promise<Producer> {
    const producer = await this.producerRepository.findById(producerId);
    if (!producer) {
      throw new NotFoundException(`Producer ${producerId} not found.`);
    }
    return producer;
  }

  async findProducerById(producerId: string): Promise<Producer | null> {
    return this.producerRepository.findById(producerId);
  }

  async getProducerByOrganizationWallet(
    organizationWallet: string
  ): Promise<Producer | null> {
    return this.producerRepository.findByOrganizationWallet(organizationWallet);
  }

  async saveIssuer(input: Issuer): Promise<Issuer> {
    return this.issuerRepository.save(input);
  }

  async listIssuers(): Promise<Issuer[]> {
    return this.issuerRepository.list();
  }

  async getIssuerById(issuerId: string): Promise<Issuer> {
    const issuer = await this.issuerRepository.findById(issuerId);
    if (!issuer) {
      throw new NotFoundException(`Issuer ${issuerId} not found.`);
    }
    return issuer;
  }

  async saveBatch(input: Batch): Promise<Batch> {
    return this.batchRepository.save(input);
  }

  async listBatches(): Promise<Batch[]> {
    return this.batchRepository.list();
  }

  async getBatchById(batchId: string): Promise<Batch> {
    const batch = await this.batchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found.`);
    }
    return batch;
  }

  async saveBatchEvent(input: BatchEvent): Promise<BatchEvent> {
    return this.batchEventRepository.save(input);
  }

  async listBatchEventsByBatchId(batchId: string): Promise<BatchEvent[]> {
    return this.batchEventRepository.listByBatchId(batchId);
  }

  async getBatchEventById(eventId: string): Promise<BatchEvent> {
    const event = await this.batchEventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found.`);
    }
    return event;
  }

  async getEventHashById(eventId: string): Promise<string | null> {
    return this.batchEventRepository.getEventHashById(eventId);
  }

  async listChainTransactions(): Promise<ChainTransaction[]> {
    const transactions = await this.chainTransactionRepository.list();
    this.refreshChainTransactionCache(transactions);
    return transactions;
  }

  async getChainTransactionByEventId(
    eventId: string
  ): Promise<ChainTransaction | null> {
    const cached = [...this.chainTransactions.values()].find(
      (transaction) => transaction.eventId === eventId
    );
    if (cached) {
      return cached;
    }
    const transaction = await this.chainTransactionRepository.findByEventId(eventId);
    if (transaction) {
      this.chainTransactions.set(transaction.txId, transaction);
    }
    return transaction;
  }

  async saveChainTransaction(tx: ChainTransaction): Promise<ChainTransaction> {
    const saved = await this.chainTransactionRepository.upsert(tx);
    this.chainTransactions.set(saved.txId, saved);
    return saved;
  }

  private refreshChainTransactionCache(values: ChainTransaction[]): void {
    this.chainTransactions.clear();
    for (const value of values) {
      this.chainTransactions.set(value.txId, value);
    }
  }
}
