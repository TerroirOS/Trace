import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEthereumAddress,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import type { Issuer } from "@terroiros/schemas";

export const allowedIssuerRoles = new Set([
  "ASSOCIATION",
  "CERTIFIER",
  "LOGISTICS_PARTNER",
  "WINERY_OPERATOR"
]);

export class CreateIssuerDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{2,63}$/)
  issuerId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  organizationName!: string;

  @IsEthereumAddress()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  walletAddress!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @Matches(/^(ASSOCIATION|CERTIFIER|LOGISTICS_PARTNER|WINERY_OPERATOR)$/, {
    each: true
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((entry) =>
          typeof entry === "string" ? entry.trim().toUpperCase() : entry
        )
      : value
  )
  roles!: string[];

  @IsOptional()
  @IsBoolean()
  trusted?: boolean;
}

export function toIssuerInput(dto: CreateIssuerDto): Issuer {
  const roles = [...new Set(dto.roles)].filter((role) => allowedIssuerRoles.has(role));
  return {
    issuerId: dto.issuerId,
    organizationName: dto.organizationName,
    walletAddress: dto.walletAddress,
    roles,
    trusted: dto.trusted ?? true
  };
}
