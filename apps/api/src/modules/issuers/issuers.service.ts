import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { Issuer } from "@terroiros/schemas";
import { StoreService } from "../data/store.service";
import { allowedIssuerRoles } from "./issuers.dto";

@Injectable()
export class IssuersService {
  constructor(private readonly store: StoreService) {}

  async create(input: Issuer): Promise<Issuer> {
    const normalized = this.normalize(input);
    const existing = await this.store.findIssuerById(normalized.issuerId);
    if (existing) {
      if (this.isSameIssuer(existing, normalized)) {
        return existing;
      }
      throw new ConflictException(
        `Issuer ${normalized.issuerId} already exists with different registration details.`
      );
    }

    const walletOwner = await this.store.getIssuerByWalletAddress(
      normalized.walletAddress
    );
    if (walletOwner) {
      throw new ConflictException(
        `Wallet ${normalized.walletAddress} is already assigned to issuer ${walletOwner.issuerId}.`
      );
    }

    return this.store.saveIssuer(normalized);
  }

  async list(): Promise<Issuer[]> {
    return this.store.listIssuers();
  }

  async getById(issuerId: string): Promise<Issuer> {
    return this.store.getIssuerById(issuerId);
  }

  private normalize(input: Issuer): Issuer {
    const roles = [...new Set(input.roles.map((role) => role.trim().toUpperCase()))]
      .filter((role) => allowedIssuerRoles.has(role))
      .filter((role) => role.length > 0)
      .sort();
    if (roles.length === 0) {
      throw new BadRequestException("Issuer registration must include at least one valid role.");
    }
    return {
      issuerId: input.issuerId.trim(),
      organizationName: input.organizationName.trim(),
      walletAddress: input.walletAddress.trim().toLowerCase(),
      roles,
      trusted: input.trusted ?? true
    };
  }

  private isSameIssuer(left: Issuer, right: Issuer): boolean {
    return (
      left.issuerId === right.issuerId &&
      left.organizationName === right.organizationName &&
      left.walletAddress.toLowerCase() === right.walletAddress.toLowerCase() &&
      left.trusted === right.trusted &&
      this.sameRoles(left.roles, right.roles)
    );
  }

  private sameRoles(left: string[], right: string[]): boolean {
    const leftRoles = [...left].map((role) => role.trim().toUpperCase()).sort();
    const rightRoles = [...right].map((role) => role.trim().toUpperCase()).sort();
    if (leftRoles.length !== rightRoles.length) {
      return false;
    }
    return leftRoles.every((role, index) => role === rightRoles[index]);
  }
}
