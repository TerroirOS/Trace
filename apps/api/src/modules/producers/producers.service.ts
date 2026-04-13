import { ConflictException, Injectable } from "@nestjs/common";
import type { Producer } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";

@Injectable()
export class ProducersService {
  constructor(private readonly store: StoreService) {}

  async create(input: Producer): Promise<Producer> {
    const normalized = this.normalize(input);
    const existing = await this.store.findProducerById(normalized.producerId);
    if (existing) {
      if (this.isSameProducer(existing, normalized)) {
        return existing;
      }
      throw new ConflictException(
        `Producer ${normalized.producerId} already exists with different onboarding details.`
      );
    }

    const walletOwner = await this.store.getProducerByOrganizationWallet(
      normalized.organizationWallet
    );
    if (walletOwner) {
      throw new ConflictException(
        `Wallet ${normalized.organizationWallet} is already assigned to producer ${walletOwner.producerId}.`
      );
    }

    return this.store.saveProducer(normalized);
  }

  async list(): Promise<Producer[]> {
    return this.store.listProducers();
  }

  async getById(producerId: string): Promise<Producer> {
    return this.store.getProducerById(producerId);
  }

  private normalize(input: Producer): Producer {
    return {
      producerId: input.producerId.trim(),
      legalName: input.legalName.trim(),
      countryCode: input.countryCode.trim().toUpperCase(),
      region: input.region?.trim() || undefined,
      organizationWallet: input.organizationWallet.trim().toLowerCase()
    };
  }

  private isSameProducer(left: Producer, right: Producer): boolean {
    return (
      left.producerId === right.producerId &&
      left.legalName === right.legalName &&
      left.countryCode === right.countryCode &&
      (left.region ?? undefined) === (right.region ?? undefined) &&
      left.organizationWallet.toLowerCase() === right.organizationWallet.toLowerCase()
    );
  }
}
