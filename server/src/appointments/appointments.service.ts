import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
  ) {}

  async create(createAppointmentDto: CreateAppointmentDto, patientId: string) {
    const appointment = new this.appointmentModel({
      ...createAppointmentDto,
      patientId: new Types.ObjectId(patientId),
      therapistId: new Types.ObjectId(createAppointmentDto.therapistId),
      status: 'scheduled',
    });

    return appointment.save();
  }

  async findAll() {
    return this.appointmentModel.find()
      .populate('patientId', 'firstName lastName email')
      .populate('therapistId', 'firstName lastName specialization');
  }

  async findByPatientId(patientId: string) {
    return this.appointmentModel.find({ patientId: new Types.ObjectId(patientId) })
      .populate('patientId', 'firstName lastName email')
      .populate('therapistId', 'firstName lastName specialization');
  }

  async findByTherapistId(therapistId: string) {
    return this.appointmentModel.find({ therapistId: new Types.ObjectId(therapistId) })
      .populate('patientId', 'firstName lastName email')
      .populate('therapistId', 'firstName lastName specialization');
  }

  async findOne(id: string) {
    const appointment = await this.appointmentModel.findById(id)
      .populate('patientId', 'firstName lastName email')
      .populate('therapistId', 'firstName lastName specialization');
    
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    
    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    const appointment = await this.appointmentModel.findByIdAndUpdate(
      id,
      updateAppointmentDto,
      { new: true }
    ).populate('patientId', 'firstName lastName email')
     .populate('therapistId', 'firstName lastName specialization');

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async remove(id: string) {
    const appointment = await this.appointmentModel.findByIdAndDelete(id);
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return { message: 'Appointment deleted successfully' };
  }
}
