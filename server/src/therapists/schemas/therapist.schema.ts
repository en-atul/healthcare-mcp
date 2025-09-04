import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TherapistDocument = Therapist & Document;

@Schema({ timestamps: true })
export class Therapist {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  specialization: string;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop({ default: 'therapist' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TherapistSchema = SchemaFactory.createForClass(Therapist);
