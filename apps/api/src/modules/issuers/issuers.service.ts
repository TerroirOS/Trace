import { Injectable } from "@nestjs/common";
import type { Issuer } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";

@Injectable()
export class IssuersService {
  constructor(private readonly store: StoreService) {}

  async create(input: Issuer): Promise<Issuer> {
    return this.store.saveIssuer(input);
  }

  async list(): Promise<Issuer[]> {
    return this.store.listIssuers();
  }

  async getById(issuerId: string): Promise<Issuer> {
    return this.store.getIssuerById(issuerId);
  }
}
