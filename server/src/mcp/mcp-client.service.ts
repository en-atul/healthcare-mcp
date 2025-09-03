import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const mcpConfig = this.configService.get('mcp');

      const transport = new StdioClientTransport({
        command: mcpConfig.serverCommand,
        args: mcpConfig.serverArgs,
      });

      this.client = new Client(transport);
      await this.client.connect();
      console.log('✅ MCP client connected to healthcare server');
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async callTool(tool: string, args: any) {
    try {
      if (!this.client) {
        throw new Error('MCP client not connected');
      }

      // Use the correct MCP SDK method for calling tools
      const result = await this.client.callTool(tool, args);
      return result;
    } catch (error) {
      console.error(`Error calling MCP tool ${tool}:`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        await this.client.close();
        console.log('✅ MCP client disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting MCP client:', error);
    }
  }

  // Helper methods for specific healthcare operations
  async listTherapists() {
    return this.callTool('list_therapists', {});
  }

  async bookAppointment(
    therapistId: string,
    appointmentDate: string,
    duration: number,
    notes?: string,
  ) {
    return this.callTool('book_appointment', {
      therapistId,
      appointmentDate,
      duration,
      notes,
    });
  }

  async listAppointments(patientId: string) {
    return this.callTool('list_appointments', { patientId });
  }

  async cancelAppointment(appointmentId: string, cancellationReason?: string) {
    return this.callTool('cancel_appointment', {
      appointmentId,
      cancellationReason,
    });
  }

  async getProfile(patientId: string) {
    return this.callTool('get_profile', { patientId });
  }
}
