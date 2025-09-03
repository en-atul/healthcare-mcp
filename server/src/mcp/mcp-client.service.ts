import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private client: Client;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const transport = new StdioClientTransport({
        command: this.configService.mcpServerCommand,
        args: this.configService.mcpServerArgs,
      });

      this.client = new Client({
        name: 'healthcare-mcp-client',
        version: '1.0.0',
      });
      await this.client.connect(transport);
      console.log('✅ MCP client connected to healthcare server');
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async callTool(tool: string, args: any): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('MCP client not connected');
      }

      // Use the correct MCP SDK method for calling tools
      const result = await this.client.callTool({
        name: tool,
        arguments: args,
      });
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
  async listTherapists(): Promise<any> {
    return this.callTool('list_therapists', {});
  }

  async bookAppointment(
    therapistId: string,
    appointmentDate: string,
    duration: number,
    notes?: string,
  ): Promise<any> {
    return this.callTool('book_appointment', {
      therapistId,
      appointmentDate,
      duration,
      notes,
    });
  }

  async listAppointments(patientId: string): Promise<any> {
    return this.callTool('list_appointments', { patientId });
  }

  async cancelAppointment(
    appointmentId: string,
    cancellationReason?: string,
  ): Promise<any> {
    return this.callTool('cancel_appointment', {
      appointmentId,
      cancellationReason,
    });
  }

  async getProfile(patientId: string): Promise<any> {
    return this.callTool('get_profile', { patientId });
  }
}
