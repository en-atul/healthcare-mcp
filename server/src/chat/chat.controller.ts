import { Controller, Post, Body, Get } from '@nestjs/common';
import { McpClientService } from '../mcp/mcp-client.service';
import { LlmService } from '../llm/llm.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly mcpService: McpClientService,
    private readonly llmService: LlmService
  ) {}

  @Post()
  async handleMessage(@Body('message') message: string) {
    try {
      console.log('📨 User message:', message);

      // Step 1: LLM decides which tool to call
      console.log('🤖 LLM planning tool call...');
      const plan = await this.llmService.planToolCall(message);
      console.log('📋 Tool call plan:', plan);

      // Step 2: MCP executes the tool
      console.log('🔧 MCP executing tool...');
      const result = await this.mcpService.callTool(plan.tool, plan.args);
      console.log('📊 MCP result:', result);

      // Step 3: LLM reformats for user
      console.log('🤖 LLM formatting result...');
      const friendly = await this.llmService.formatResult(result);
      console.log('💬 Formatted response:', friendly);

      return { 
        answer: friendly,
        tool: plan.tool,
        args: plan.args,
        rawResult: result
      };
    } catch (error) {
      console.error('❌ Error in chat pipeline:', error);
      return {
        answer: 'I apologize, but I encountered an error processing your request. Please try again.',
        error: error.message
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
        'get_profile'
      ],
      systemPrompt: await this.llmService.getSystemPrompt()
    };
  }

  @Get('health')
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Chat service is running'
    };
  }
}
