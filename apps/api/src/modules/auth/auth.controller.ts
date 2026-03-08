import { Body, Controller, Post } from "@nestjs/common";
import { IsEthereumAddress, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";

class ChallengeRequestDto {
  @IsEthereumAddress()
  walletAddress!: string;
}

class VerifyRequestDto {
  @IsEthereumAddress()
  walletAddress!: string;

  @IsString()
  @MinLength(20)
  signature!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("challenge")
  issueChallenge(@Body() body: ChallengeRequestDto): { challenge: string } {
    return this.authService.issueChallenge(body.walletAddress);
  }

  @Post("verify")
  verify(@Body() body: VerifyRequestDto): { token: string } {
    return this.authService.verifyChallenge(body);
  }
}
