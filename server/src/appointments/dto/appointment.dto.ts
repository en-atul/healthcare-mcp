import { IsDateString, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  therapistId: string;

  @IsDateString()
  appointmentDate: string;

  @IsNumber()
  duration: number; // in minutes

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsEnum(['scheduled', 'confirmed', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
