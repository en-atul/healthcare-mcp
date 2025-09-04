import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { McpServerService } from './mcp-server.service';

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly mcpServerService: McpServerService) {}

  onModuleInit() {
    try {
      console.log('✅ MCP client service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MCP client service:', error);
      throw error;
    }
  }

  async callTool(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    try {
      // Map MCP tool names to MCP server service methods
      switch (tool) {
        case 'list_therapists':
          return await this.mcpServerService.listTherapists();

        case 'book_appointment':
          const { therapistId, appointmentDate, duration, notes } = args;
          return await this.mcpServerService.bookAppointment(
            args.jwtToken as string,
            therapistId as string,
            appointmentDate as string,
            duration as number,
            notes as string | undefined,
          );

        case 'list_appointments':
          return await this.mcpServerService.listAppointments(
            args.jwtToken as string,
          );

        case 'cancel_appointment':
          const { appointmentId, cancellationReason } = args;
          return await this.mcpServerService.cancelAppointment(
            args.jwtToken as string,
            appointmentId as string,
            cancellationReason as string | undefined,
          );

        case 'get_profile':
          return await this.mcpServerService.getProfile(
            args.jwtToken as string,
          );

        default:
          throw new Error(`Unknown tool: ${tool}`);
      }
    } catch (error: any) {
      console.error(`Error calling MCP tool ${tool}:`, error.message);
      throw error;
    }
  }

  onModuleDestroy() {
    try {
      console.log('✅ MCP client service destroyed');
    } catch (error) {
      console.error('Error destroying MCP client service:', error);
    }
  }

  // Helper methods for specific healthcare operations
  async listTherapists(): Promise<unknown> {
    return this.callTool('list_therapists', {});
  }

  async bookAppointment(
    jwtToken: string,
    therapistId: string,
    appointmentDate: string,
    duration: number,
    notes?: string,
  ): Promise<unknown> {
    return this.callTool('book_appointment', {
      jwtToken,
      therapistId,
      appointmentDate,
      duration,
      notes,
    });
  }

  async listAppointments(jwtToken: string): Promise<unknown> {
    return this.callTool('list_appointments', { jwtToken });
  }

  async cancelAppointment(
    jwtToken: string,
    appointmentId: string,
    cancellationReason?: string,
  ): Promise<unknown> {
    return this.callTool('cancel_appointment', {
      jwtToken,
      appointmentId,
      cancellationReason,
    });
  }

  async getProfile(jwtToken: string): Promise<unknown> {
    return this.callTool('get_profile', { jwtToken });
  }
}
