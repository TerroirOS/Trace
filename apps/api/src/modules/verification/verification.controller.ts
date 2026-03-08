import { Controller, Get, Param } from "@nestjs/common";
import type { VerificationResult } from "@terroiros/schemas";
import { VerificationService } from "./verification.service";

@Controller("verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get(":batchId")
  verifyBatch(@Param("batchId") batchId: string): VerificationResult {
    return this.verificationService.verifyBatch(batchId);
  }
}
