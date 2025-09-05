import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
  therapistId: Types.ObjectId;

  @Prop({ required: true })
  appointmentDate: Date;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({
    required: true,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
  })
  status: string;

  @Prop()
  notes: string;

  @Prop()
  cancellationReason: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
