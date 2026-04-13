import {
  Injectable,
  Logger,
  OnModuleDestroy,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { ethers } from "ethers";

type PgRowSet = { rows: Record<string, unknown>[] };
type PgPoolLike = {
  query: (text: string, values?: unknown[]) => Promise<PgRowSet>;
  end: () => Promise<void>;
};

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly challenges = new Map<string, string>();
  private readonly pool: PgPoolLike | null;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>("DATABASE_URL");
    if (!databaseUrl) {
      this.pool = null;
      return;
    }
    const { Pool } = require("pg") as {
      Pool: new (config: { connectionString: string }) => PgPoolLike;
    };
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) {
      return;
    }
    await this.pool.end();
  }

  async issueChallenge(walletAddress: string): Promise<{ challenge: string }> {
    const wallet = walletAddress.toLowerCase();
    const challenge = `terroiros-auth:${randomUUID()}`;
    if (this.pool) {
      await this.safeQuery(
        `INSERT INTO auth_challenges (wallet_address, challenge, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (wallet_address) DO UPDATE
         SET challenge = EXCLUDED.challenge,
             created_at = NOW()`,
        [wallet, challenge],
        `issue auth challenge for ${wallet}`
      );
    }
    this.challenges.set(wallet, challenge);
    return { challenge };
  }

  async verifyChallenge(params: {
    walletAddress: string;
    signature: string;
  }): Promise<{ token: string }> {
    const wallet = params.walletAddress.toLowerCase();
    const challenge = await this.getChallenge(wallet);
    if (!challenge) {
      throw new UnauthorizedException("Challenge missing or expired.");
    }
    const recovered = ethers.verifyMessage(challenge, params.signature).toLowerCase();
    if (recovered !== wallet) {
      throw new UnauthorizedException("Signature verification failed.");
    }
    this.challenges.delete(wallet);
    if (this.pool) {
      await this.safeQuery(
        `DELETE FROM auth_challenges WHERE wallet_address = $1`,
        [wallet],
        `delete auth challenge for ${wallet}`
      );
    }
    return { token: Buffer.from(`${wallet}:${Date.now()}`).toString("base64url") };
  }

  private async getChallenge(wallet: string): Promise<string | null> {
    const cached = this.challenges.get(wallet);
    if (cached) {
      return cached;
    }
    if (!this.pool) {
      return null;
    }
    const result = await this.safeQuery(
      `SELECT challenge
       FROM auth_challenges
       WHERE wallet_address = $1
       LIMIT 1`,
      [wallet],
      `load auth challenge for ${wallet}`
    );
    const challenge = result?.rows[0]?.challenge;
    if (typeof challenge !== "string") {
      return null;
    }
    this.challenges.set(wallet, challenge);
    return challenge;
  }

  private async safeQuery(
    sql: string,
    values: unknown[],
    context: string
  ): Promise<PgRowSet | null> {
    if (!this.pool) {
      return null;
    }
    try {
      return await this.pool.query(sql, values);
    } catch (error) {
      this.logger.warn(`Failed to ${context}: ${String(error)}`);
      return null;
    }
  }
}
