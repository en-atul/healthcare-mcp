import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { McpServerService } from './mcp-server.service';
import { LlmIntegrationService } from './llm-integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '../config/config.service';

@Controller('mcp')
export class McpController {
  constructor(
    private readonly mcpService: McpServerService,
    private readonly llmIntegrationService: LlmIntegrationService,
    private readonly configService: ConfigService,
  ) {}

  // Helper method to validate MCP API key (only for external requests)
  private validateMcpApiKey(apiKey: string, req: Request): boolean {
    // Skip API key validation for internal NestJS requests
    const userAgent = req.headers['user-agent'] || '';
    const isInternalRequest =
      userAgent.includes('NestJS') ||
      req.headers['x-internal-request'] === 'true' ||
      req.headers['x-mcp-api-key'] === undefined;

    if (isInternalRequest) {
      return true; // Allow internal requests without API key
    }

    // Require API key for external requests (Claude/ChatGPT)
    return apiKey === this.configService.mcpApiKey;
  }

  @Get('tools')
  getAvailableTools() {
    return this.mcpService.getAvailableTools();
  }

  @Post('list-therapists')
  async listTherapists(
    @Headers('x-mcp-api-key') apiKey: string | undefined,
    @Req() req: Request,
  ) {
    if (!this.validateMcpApiKey(apiKey || '', req)) {
      throw new UnauthorizedException('Invalid MCP API key');
    }
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
    @Headers('x-mcp-api-key') apiKey: string | undefined,
    @Req() req: Request,
  ) {
    if (!this.validateMcpApiKey(apiKey || '', req)) {
      throw new UnauthorizedException('Invalid MCP API key');
    }

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
  async listAppointments(
    @Headers('x-mcp-api-key') apiKey: string | undefined,
    @Req() req: Request,
  ) {
    if (!this.validateMcpApiKey(apiKey || '', req)) {
      throw new UnauthorizedException('Invalid MCP API key');
    }

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
    @Headers('x-mcp-api-key') apiKey: string | undefined,
    @Req() req: Request,
  ) {
    if (!this.validateMcpApiKey(apiKey || '', req)) {
      throw new UnauthorizedException('Invalid MCP API key');
    }

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
  async getProfile(
    @Headers('x-mcp-api-key') apiKey: string | undefined,
    @Req() req: Request,
  ) {
    if (!this.validateMcpApiKey(apiKey || '', req)) {
      throw new UnauthorizedException('Invalid MCP API key');
    }

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
