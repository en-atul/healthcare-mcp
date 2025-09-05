import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
  Req,
} from '@nestjs/common';
import { McpClientService } from '../mcp/mcp-client.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly mcpService: McpClientService,
    private readonly llmService: LlmService,
    private readonly ragService: RagService,
  ) {}

  // Helper method to extract patient ID from JWT token
  private extractPatientIdFromToken(token: string): string {
    try {
      // Simple JWT decode - in production, use proper JWT service
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      ) as { sub: string };
      return payload.sub;
    } catch {
      throw new Error('Invalid JWT token');
    }
  }

  @Get('history')
  async getConversationHistory(
    @Req() req: Request,
    @Query('limit') limit?: string,
  ) {
    try {
      const authorization = (req.headers as { authorization?: string })
        ?.authorization;
      const jwtToken = authorization?.replace('Bearer ', '');

      if (!jwtToken) {
        throw new Error('JWT token not found in request');
      }

      const patientId = this.extractPatientIdFromToken(jwtToken);
      const messageLimit = limit ? parseInt(limit, 10) : 50;

      // Get conversation history from RAG service
      const history = await this.ragService.getConversationHistory(
        patientId,
        messageLimit,
      );

      return {
        success: true,
        data: history,
        message: 'Conversation history retrieved successfully',
        total: history.length,
        limit: messageLimit,
      };
    } catch (error) {
      console.error('❌ Error retrieving conversation history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
        total: 0,
        limit: 0,
      };
    }
  }

  @Post()
  async handleMessage(@Body('message') message: string, @Req() req: Request) {
    try {
      console.log('📨 User message:', message);

      // Extract JWT token from request headers
      const authorization = (req.headers as { authorization?: string })
        ?.authorization;
      const jwtToken = authorization?.replace('Bearer ', '');

      if (!jwtToken) {
        throw new Error('JWT token not found in request');
      }

      // Step 1: Process message with RAG
      console.log('🧠 RAG processing message...');
      const ragResponse = await this.ragService.processMessageWithRag(
        message,
        jwtToken,
      );
      console.log('📊 RAG response:', JSON.stringify(ragResponse, null, 2));

      let finalResponse = ragResponse.response;
      let actionResult: any = null;

      // Step 2: Execute action if needed
      if (ragResponse.action && ragResponse.parameters) {
        console.log('🔧 Executing action:', ragResponse.action);
        const argsWithToken = { ...ragResponse.parameters, jwtToken };
        actionResult = await this.mcpService.callTool(
          ragResponse.action,
          argsWithToken,
        );
        console.log('📊 Action result:', actionResult);

        // Store MCP operation result in RAG for future reference
        if (actionResult) {
          await this.ragService.storeMcpOperationResult(
            this.extractPatientIdFromToken(jwtToken),
            ragResponse.action,
            actionResult,
            ragResponse.parameters,
          );
        }

        // Update response with action result
        if (actionResult) {
          // If actionResult has formattedResponse, use it
          if (
            actionResult &&
            typeof actionResult === 'object' &&
            'formattedResponse' in actionResult
          ) {
            finalResponse = (actionResult as { formattedResponse: string })
              .formattedResponse;
          }
          // If actionResult has raw data, include it in the response
          if (
            actionResult &&
            typeof actionResult === 'object' &&
            'data' in actionResult
          ) {
            // Keep the formatted response but also include raw data
            const resultWithData = actionResult as {
              formattedResponse?: string;
              data: unknown;
            };
            finalResponse = resultWithData.formattedResponse || finalResponse;
          }
        }
      }

      return {
        answer: finalResponse,
        action: ragResponse.action,
        parameters: ragResponse.parameters,
        actionResult: actionResult as Record<string, unknown> | null,
        rawData:
          actionResult &&
          typeof actionResult === 'object' &&
          'data' in actionResult
            ? (actionResult as { data: unknown }).data
            : null,
        context: ragResponse.context,
      };
    } catch (error) {
      console.error('❌ Error in RAG chat pipeline:', error);
      return {
        answer:
          'I apologize, but I encountered an error processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Get('tools')
  getAvailableTools() {
    return {
      tools: [
        'list_therapists',
        'book_appointment',
        'list_appointments',
        'cancel_appointment',
        'get_profile',
      ],
      systemPrompt: this.llmService.getSystemPrompt(),
    };
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Chat service is running',
    };
  }
}
