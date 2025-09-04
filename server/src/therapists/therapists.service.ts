import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Therapist, TherapistDocument } from './schemas/therapist.schema';

@Injectable()
export class TherapistsService {
  constructor(
    @InjectModel(Therapist.name)
    private therapistModel: Model<TherapistDocument>,
  ) {}

  async findById(id: string): Promise<Therapist> {
    const therapist = await this.therapistModel.findById(id);
    if (!therapist) {
      throw new NotFoundException('Therapist not found');
    }
    return therapist;
  }

  async findAll(): Promise<Therapist[]> {
    return this.therapistModel.find({ isActive: true });
  }

  async seedTherapists() {
    const therapistsData = [
      {
        email: 'dr.smith@healthcare.com',
        firstName: 'Dr. John',
        lastName: 'Smith',
        specialization: 'Psychotherapy',
        phone: '+1-555-0101',
        address: '123 Main St, City, State 12345',
        role: 'therapist',
        isActive: true,
      },
      {
        email: 'dr.johnson@healthcare.com',
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        specialization: 'Cognitive Behavioral Therapy',
        phone: '+1-555-0102',
        address: '456 Oak Ave, City, State 12345',
        role: 'therapist',
        isActive: true,
      },
      {
        email: 'dr.williams@healthcare.com',
        firstName: 'Dr. Michael',
        lastName: 'Williams',
        specialization: 'Family Therapy',
        phone: '+1-555-0103',
        address: '789 Pine Rd, City, State 12345',
        role: 'therapist',
        isActive: true,
      },
      {
        email: 'dr.brown@healthcare.com',
        firstName: 'Dr. Emily',
        lastName: 'Brown',
        specialization: 'Trauma Therapy',
        phone: '+1-555-0104',
        address: '321 Elm St, City, State 12345',
        role: 'therapist',
        isActive: true,
      },
      {
        email: 'dr.davis@healthcare.com',
        firstName: 'Dr. David',
        lastName: 'Davis',
        specialization: 'Addiction Counseling',
        phone: '+1-555-0105',
        address: '654 Maple Dr, City, State 12345',
        role: 'therapist',
        isActive: true,
      },
    ];

    for (const therapistData of therapistsData) {
      const existingTherapist = await this.therapistModel.findOne({
        email: therapistData.email,
      });

      if (!existingTherapist) {
        await this.therapistModel.create(therapistData);
      }
    }

    return { message: 'Therapists seeded successfully' };
  }
}
