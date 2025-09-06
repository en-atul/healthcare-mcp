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

  @Prop({ required: true })
  experience: number;

  @Prop({ type: Number, min: 1, max: 5 })
  rating?: number;

  @Prop()
  phone: string;

  @Prop()
  address: string;

  @Prop()
  photo: string;

  @Prop({ default: 'therapist' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TherapistSchema = SchemaFactory.createForClass(Therapist);
