import { Transform } from "class-transformer";
import {
  IsEthereumAddress,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import type { Producer } from "@terroiros/schemas";

export class CreateProducerDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{2,63}$/)
  producerId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  legalName!: string;

  @IsString()
  @IsISO31661Alpha2()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value
  )
  countryCode!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  region?: string;

  @IsEthereumAddress()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value
  )
  organizationWallet!: string;
}

export function toProducerInput(dto: CreateProducerDto): Producer {
  return {
    producerId: dto.producerId,
    legalName: dto.legalName,
    countryCode: dto.countryCode,
    region: dto.region,
    organizationWallet: dto.organizationWallet
  };
}
