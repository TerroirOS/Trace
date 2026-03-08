import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Producer } from "@terroiros/schemas";
import { ProducersService } from "./producers.service";

@Controller("producers")
export class ProducersController {
  constructor(private readonly producersService: ProducersService) {}

  @Post()
  create(@Body() body: Producer): Producer {
    return this.producersService.create(body);
  }

  @Get()
  list(): Producer[] {
    return this.producersService.list();
  }

  @Get(":producerId")
  getById(@Param("producerId") producerId: string): Producer {
    return this.producersService.getById(producerId);
  }
}
