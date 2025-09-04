import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { McpClientService } from '../mcp/mcp-client.service';
import { LlmService } from '../llm/llm.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly mcpService: McpClientService,
    private readonly llmService: LlmService,
  ) {}

  @Post()
  async handleMessage(@Body('message') message: string, @Request() req) {
    try {
      console.log('📨 User message:', message);

      // Extract JWT token from request headers
      const authorization = req.headers.authorization;
      const jwtToken = authorization?.replace('Bearer ', '');

      if (!jwtToken) {
        throw new Error('JWT token not found in request');
      }

      // Step 1: LLM decides which tool to call
      console.log('🤖 LLM planning tool call...');
      const plan = await this.llmService.planToolCall(message, req.user);
      console.log('📋 Tool call plan:', plan);

      // Add JWT token to args for authenticated endpoints
      const argsWithToken = { ...plan.args, jwtToken };

      // Step 2: MCP executes the tool
      console.log('🔧 MCP executing tool...');
      const result = await this.mcpService.callTool(plan.tool, argsWithToken);
      console.log('📊 MCP result:', result);

      // Step 3: LLM reformats for user
      console.log('🤖 LLM formatting result...');
      const friendly = await this.llmService.formatResult(result);
      console.log('💬 Formatted response:', friendly);

      return {
        answer: friendly,
        tool: plan.tool,
        args: plan.args,
        rawResult: result,
      };
    } catch (error) {
      console.error('❌ Error in chat pipeline:', error);
      return {
        answer:
          'I apologize, but I encountered an error processing your request. Please try again.',
        error: error.message,
      };
    }
  }

  @Get('tools')
  async getAvailableTools() {
    return {
      tools: [
        'list_therapists',
        'book_appointment',
        'list_appointments',
        'cancel_appointment',
        'get_profile',
      ],
      systemPrompt: await this.llmService.getSystemPrompt(),
    };
  }

  @Get('health')
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Chat service is running',
    };
  }
}
