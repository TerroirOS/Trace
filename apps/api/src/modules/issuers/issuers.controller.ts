import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Issuer } from "@terroiros/schemas";
import { IssuersService } from "./issuers.service";

@Controller("issuers")
export class IssuersController {
  constructor(private readonly issuersService: IssuersService) {}

  @Post()
  create(@Body() body: Issuer): Issuer {
    return this.issuersService.create(body);
  }

  @Get()
  list(): Issuer[] {
    return this.issuersService.list();
  }

  @Get(":issuerId")
  getById(@Param("issuerId") issuerId: string): Issuer {
    return this.issuersService.getById(issuerId);
  }
}
