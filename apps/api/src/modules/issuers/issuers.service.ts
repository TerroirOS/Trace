import { Injectable, NotFoundException } from "@nestjs/common";
import type { Issuer } from "@terroiros/schemas";
import { issuerSchema } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";

@Injectable()
export class IssuersService {
  constructor(private readonly store: StoreService) {}

  create(input: Issuer): Issuer {
    const issuer = issuerSchema.parse(input);
    this.store.issuers.set(issuer.issuerId, issuer);
    return issuer;
  }

  list(): Issuer[] {
    return [...this.store.issuers.values()];
  }

  getById(issuerId: string): Issuer {
    const issuer = this.store.issuers.get(issuerId);
    if (!issuer) {
      throw new NotFoundException(`Issuer ${issuerId} not found.`);
    }
    return issuer;
  }
}
