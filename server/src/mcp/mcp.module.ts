import { Module } from '@nestjs/common';
import { McpClientService } from './mcp-client.service';
import { McpServerService } from './mcp-server.service';
import { McpController } from './mcp.controller';
import { LlmIntegrationService } from './llm-integration.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { TherapistsModule } from '../therapists/therapists.module';
import { PatientsModule } from '../patients/patients.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AppointmentsModule,
    TherapistsModule,
    PatientsModule,
    AuthModule,
  ],
  providers: [McpClientService, McpServerService, LlmIntegrationService],
  controllers: [McpController],
  exports: [McpClientService, McpServerService],
})
export class McpModule {}
