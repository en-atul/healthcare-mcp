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

      return history;
    } catch (error) {
      console.error('❌ Error retrieving conversation history:', error);
      return [];
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

      // Get recent conversation history for context
      let patientId: string;
      try {
        patientId = this.extractPatientIdFromToken(jwtToken);
      } catch {
        throw new Error('Invalid JWT token');
      }
      console.log('🔍 Getting conversation history for patient:', patientId);
      const conversationHistory = await this.ragService.getConversationHistory(
        patientId,
        10, // Get last 10 messages for context
      );
      console.log(
        '📚 Retrieved conversation history:',
        conversationHistory.length,
        'messages',
      );

      // Step 1: Process message with RAG
      console.log('🧠 RAG processing message...');
      const ragResponse = await this.ragService.processMessageWithRag(
        message,
        jwtToken,
        conversationHistory,
      );
      console.log('📊 RAG response:', JSON.stringify(ragResponse, null, 2));
      console.log('🔍 RAG action:', ragResponse.action);
      console.log('🔍 RAG parameters:', ragResponse.parameters);

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

        // Note: MCP operation result will be stored as part of the full conversation context

        // Update response with action result
        if (actionResult) {
          // Use the message from the action result if available
          if (
            actionResult &&
            typeof actionResult === 'object' &&
            'message' in actionResult
          ) {
            finalResponse = (actionResult as { message: string }).message;
          }
        }
      }

      // Store conversation context with full response structure
      const fullChatResponse = {
        type: 'assistant',
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
        timestamp: new Date().toISOString(),
      };

      console.log('💾 Storing conversation context for patient:', patientId);
      try {
        await this.ragService.storeConversationContext(
          patientId,
          message,
          finalResponse,
          {
            action: ragResponse.action,
            parameters: ragResponse.parameters,
          },
          fullChatResponse,
        );
        console.log('✅ Conversation context stored successfully');
      } catch (storageError) {
        console.error('❌ Failed to store conversation context:', storageError);
        console.log('⚠️  Continuing without storing conversation context');
        // Don't throw the error - let the conversation continue
      }

      return {
        type: 'assistant',
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
        type: 'assistant',
        answer:
          'I apologize, but I encountered an error processing your request. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Post('clear-history')
  async clearConversationHistory(@Req() req: Request) {
    try {
      const authorization = (req.headers as { authorization?: string })
        ?.authorization;
      const jwtToken = authorization?.replace('Bearer ', '');

      if (!jwtToken) {
        throw new Error('JWT token not found in request');
      }

      const patientId = this.extractPatientIdFromToken(jwtToken);
      await this.ragService.clearConversationHistory(patientId);

      return {
        success: true,
        message: 'Conversation history cleared successfully',
      };
    } catch (error) {
      console.error('❌ Error clearing conversation history:', error);
      return {
        success: false,
        message: 'Failed to clear conversation history',
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
