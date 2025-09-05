import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentPatientId } from '../common';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentPatientId() patientId: string,
  ) {
    return this.appointmentsService.create(createAppointmentDto, patientId);
  }

  @Get()
  async findAll() {
    return this.appointmentsService.findAll();
  }

  @Get('my-appointments')
  async findMyAppointments(@CurrentPatientId() patientId: string) {
    return this.appointmentsService.findByPatientId(patientId);
  }

  @Get('therapist/:therapistId')
  async findByTherapist(@Param('therapistId') therapistId: string) {
    return this.appointmentsService.findByTherapistId(therapistId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
