import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  async findAll() {
    return this.patientsService.findAll();
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const patientId = req.user.userId;
    return this.patientsService.findById(patientId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }
}
