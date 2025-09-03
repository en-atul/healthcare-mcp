import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient, PatientDocument } from './schemas/patient.schema';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
  ) {}

  async findById(id: string): Promise<Patient> {
    const patient = await this.patientModel.findById(id).select('-password');
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async findByEmail(email: string): Promise<Patient> {
    const patient = await this.patientModel.findOne({ email }).select('-password');
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async findAll(): Promise<Patient[]> {
    return this.patientModel.find().select('-password');
  }
}
