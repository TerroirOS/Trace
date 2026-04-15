import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";
import { TRACE_SCHEMA_VERSION, type Batch } from "@terroiros/schemas";

export class CreateBatchDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{7,95}$/)
  batchId!: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{2,63}$/)
  producerId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  productType!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  varietalOrSubtype!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  vineyardOrFarmLocation!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  harvestDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^1\.0\.0$/)
  schemaVersion?: string;
}

export function toBatchInput(dto: CreateBatchDto): Batch {
  return {
    batchId: dto.batchId,
    producerId: dto.producerId,
    productType: dto.productType,
    varietalOrSubtype: dto.varietalOrSubtype,
    vineyardOrFarmLocation: dto.vineyardOrFarmLocation,
    harvestDate: dto.harvestDate,
    schemaVersion: dto.schemaVersion ?? TRACE_SCHEMA_VERSION
  };
}
