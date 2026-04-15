import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Issuer } from "@terroiros/schemas";
import { CreateIssuerDto, toIssuerInput } from "./issuers.dto";
import { IssuersService } from "./issuers.service";

@Controller("issuers")
export class IssuersController {
  constructor(private readonly issuersService: IssuersService) {}

  @Post()
  async create(@Body() body: CreateIssuerDto): Promise<Issuer> {
    return this.issuersService.create(toIssuerInput(body));
  }

  @Get()
  async list(): Promise<Issuer[]> {
    return this.issuersService.list();
  }

  @Get(":issuerId")
  async getById(@Param("issuerId") issuerId: string): Promise<Issuer> {
    return this.issuersService.getById(issuerId);
  }
}
