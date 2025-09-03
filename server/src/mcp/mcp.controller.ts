import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common';
import { McpServerService } from './mcp-server.service';
import { LlmIntegrationService } from './llm-integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpService: McpServerService,
    private readonly llmIntegrationService: LlmIntegrationService,
  ) {}

  @Get('tools')
  getAvailableTools() {
    return this.mcpService.getAvailableTools();
  }

  @Post('list-therapists')
  async listTherapists() {
    return this.mcpService.listTherapists();
  }

  @Post('book-appointment')
  @UseGuards(JwtAuthGuard)
  async bookAppointment(
    @Body()
    body: {
      therapistId: string;
      appointmentDate: string;
      duration: number;
      notes?: string;
    },
    @Req() req: Request,
  ) {
    const authorization = req.headers.get('Authorization');
    const jwtToken = authorization?.replace('Bearer ', '');

    if (!jwtToken) {
      return;
    }

    return this.mcpService.bookAppointment(
      jwtToken,
      body.therapistId,
      body.appointmentDate,
      body.duration,
      body.notes,
    );
  }

  @Post('list-appointments')
  @UseGuards(JwtAuthGuard)
  async listAppointments(@Req() req: Request) {
    const authorization = req.headers.get('Authorization');
    const jwtToken = authorization?.replace('Bearer ', '');

    if (!jwtToken) {
      return;
    }

    return this.mcpService.listAppointments(jwtToken);
  }

  @Post('cancel-appointment')
  @UseGuards(JwtAuthGuard)
  async cancelAppointment(
    @Body()
    body: {
      appointmentId: string;
      cancellationReason?: string;
    },
    @Req() req: Request,
  ) {
    const authorization = req.headers.get('Authorization');
    const jwtToken = authorization?.replace('Bearer ', '');

    if (!jwtToken) {
      return;
    }
    return this.mcpService.cancelAppointment(
      jwtToken,
      body.appointmentId,
      body.cancellationReason,
    );
  }

  @Post('get-profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request) {
    const authorization = req.headers.get('Authorization');
    const jwtToken = authorization?.replace('Bearer ', '');

    if (!jwtToken) {
      return;
    }
    return this.mcpService.getProfile(jwtToken);
  }

  // Chat endpoint for frontend to send messages
  @Post('chat')
  async chat(@Body() body: { message: string }, @Req() req: Request) {
    const authorization = req.headers.get('Authorization');
    const jwtToken = authorization?.replace('Bearer ', '');

    if (!jwtToken) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.llmIntegrationService.processUserMessage(
      body.message,
      jwtToken,
    );
  }

  // Endpoint for LLM to get tool descriptions
  @Get('llm-tools')
  getLlmTools() {
    return {
      tools: this.mcpService.getAvailableTools(),
      systemPrompt: this.llmIntegrationService.getSystemPrompt(),
    };
  }
}
