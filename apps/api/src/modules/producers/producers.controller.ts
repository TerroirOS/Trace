import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import type { Producer } from "@terroiros/schemas";
import { CreateProducerDto, toProducerInput } from "./producers.dto";
import { ProducersService } from "./producers.service";

@Controller("producers")
export class ProducersController {
  constructor(private readonly producersService: ProducersService) {}

  @Post()
  async create(@Body() body: CreateProducerDto): Promise<Producer> {
    return this.producersService.create(toProducerInput(body));
  }

  @Get()
  async list(): Promise<Producer[]> {
    return this.producersService.list();
  }

  @Get(":producerId")
  async getById(@Param("producerId") producerId: string): Promise<Producer> {
    return this.producersService.getById(producerId);
  }
}
