import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop({ default: 'patient' })
  role: string;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
