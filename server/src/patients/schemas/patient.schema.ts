import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PatientDocument = Patient & Document;

@Schema({ timestamps: true })
export class Patient {
  _id: Types.ObjectId;

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

  @Prop()
  gender: 'male' | 'female';

  @Prop()
  photo: string;

  @Prop({ default: 'patient' })
  role: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
