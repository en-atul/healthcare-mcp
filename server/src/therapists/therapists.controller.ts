import { Controller, Get, Post, Param } from '@nestjs/common';
import { TherapistsService } from './therapists.service';

@Controller('therapists')
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  @Get()
  async findAll() {
    return this.therapistsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.therapistsService.findById(id);
  }

  @Post('seed')
  async seedTherapists() {
    return this.therapistsService.seedTherapists();
  }
}
