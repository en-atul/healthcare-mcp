import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { TherapistsModule } from '../therapists/therapists.module';
import { PatientsModule } from '../patients/patients.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AppointmentsModule, TherapistsModule, PatientsModule, AuthModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
