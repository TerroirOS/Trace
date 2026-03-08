import { Module } from "@nestjs/common";
import { IssuersService } from "./issuers.service";
import { IssuersController } from "./issuers.controller";

@Module({
  providers: [IssuersService],
  controllers: [IssuersController],
  exports: [IssuersService]
})
export class IssuersModule {}
