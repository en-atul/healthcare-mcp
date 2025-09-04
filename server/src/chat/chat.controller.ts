import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { McpClientService } from '../mcp/mcp-client.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../rag/rag.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

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
      );
      return payload.sub;
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  @Get('history')
  async getConversationHistory(@Request() req, @Query('limit') limit?: string) {
    try {
      const authorization = req.headers.authorization;
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
        error: error.message,
        data: [],
        total: 0,
        limit: 0,
      };
    }
  }

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
          if ((actionResult as any).formattedResponse) {
            finalResponse = (actionResult as any).formattedResponse;
          }
          // If actionResult has raw data, include it in the response
          if ((actionResult as any).data) {
            // Keep the formatted response but also include raw data
            finalResponse = (actionResult as any).formattedResponse || finalResponse;
          }
        }
      }

      return {
        answer: finalResponse,
        action: ragResponse.action,
        parameters: ragResponse.parameters,
        actionResult: actionResult,
        rawData: actionResult ? (actionResult as any).data : null,
        context: ragResponse.context,
      };
    } catch (error) {
      console.error('❌ Error in RAG chat pipeline:', error);
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
