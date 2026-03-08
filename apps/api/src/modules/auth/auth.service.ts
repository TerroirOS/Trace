import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ethers } from "ethers";

@Injectable()
export class AuthService {
  private readonly challenges = new Map<string, string>();

  issueChallenge(walletAddress: string): { challenge: string } {
    const challenge = `terroiros-auth:${randomUUID()}`;
    this.challenges.set(walletAddress.toLowerCase(), challenge);
    return { challenge };
  }

  verifyChallenge(params: {
    walletAddress: string;
    signature: string;
  }): { token: string } {
    const wallet = params.walletAddress.toLowerCase();
    const challenge = this.challenges.get(wallet);
    if (!challenge) {
      throw new UnauthorizedException("Challenge missing or expired.");
    }
    const recovered = ethers.verifyMessage(challenge, params.signature).toLowerCase();
    if (recovered !== wallet) {
      throw new UnauthorizedException("Signature verification failed.");
    }
    this.challenges.delete(wallet);
    return { token: Buffer.from(`${wallet}:${Date.now()}`).toString("base64url") };
  }
}
