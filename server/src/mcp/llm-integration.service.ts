import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpServerService } from './mcp-server.service';
import OpenAI from 'openai';

@Injectable()
export class LlmIntegrationService {
  private openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpService: McpServerService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // Process user message through OpenAI and execute MCP tools
  async processUserMessage(userMessage: string, jwtToken?: string) {
    try {
      // Use OpenAI to understand the user's intent and extract parameters
      const analysis = await this.analyzeMessageWithOpenAI(userMessage, jwtToken);
      
      if (!analysis.success) {
        return analysis;
      }

      // Execute the appropriate MCP tool based on OpenAI's analysis
      const result = await this.executeMcpTool(analysis.intent, analysis.parameters, jwtToken);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to process user message'
      };
    }
  }

  private async analyzeMessageWithOpenAI(message: string, jwtToken?: string) {
    try {
      const systemPrompt = `You are a healthcare assistant. Analyze the user's message and determine their intent and required parameters.

Available actions:
1. list-therapists - User wants to see available therapists
2. book-appointment - User wants to book an appointment
3. list-appointments - User wants to see their appointments
4. cancel-appointment - User wants to cancel an appointment
5. get-profile - User wants to see their profile

For book-appointment, extract: therapistId, appointmentDate, duration, notes
For cancel-appointment, extract: appointmentId, cancellationReason

Return a JSON response with:
{
  "intent": "action_name",
  "parameters": { "param1": "value1" },
  "requiresAuth": true/false,
  "confidence": 0.9
}

If the message is unclear, set intent to "unclear" and provide a helpful message.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse OpenAI's JSON response
      const analysis = JSON.parse(response);
      
      // Check if authentication is required but not provided
      if (analysis.requiresAuth && !jwtToken) {
        return {
          success: false,
          error: 'Authentication required',
          message: 'Please log in to perform this action'
        };
      }

      return {
        success: true,
        ...analysis
      };

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return {
        success: false,
        error: 'Failed to understand request',
        message: 'I had trouble understanding your request. Please try rephrasing it.'
      };
    }
  }

  private async executeMcpTool(intent: string, parameters: any, jwtToken?: string) {
    try {
      switch (intent) {
        case 'list-therapists':
          return await this.mcpService.listTherapists();

        case 'book-appointment':
          if (!jwtToken) {
            return {
              success: false,
              error: 'Authentication required',
              message: 'Please log in to book an appointment'
            };
          }
          
          const { therapistId, appointmentDate, duration, notes } = parameters;
          if (!therapistId || !appointmentDate || !duration) {
            return {
              success: false,
              error: 'Missing required parameters',
              message: 'Please provide therapist ID, appointment date, and duration'
            };
          }

          return await this.mcpService.bookAppointment(
            jwtToken,
            therapistId,
            appointmentDate,
            duration,
            notes
          );

        case 'list-appointments':
          if (!jwtToken) {
            return {
              success: false,
              error: 'Authentication required',
              message: 'Please log in to view your appointments'
            };
          }
          
          return await this.mcpService.listAppointments(jwtToken);

        case 'cancel-appointment':
          if (!jwtToken) {
            return {
              success: false,
              error: 'Authentication required',
              message: 'Please log in to cancel appointments'
            };
          }
          
          const { appointmentId, cancellationReason } = parameters;
          if (!appointmentId) {
            return {
              success: false,
              error: 'Missing appointment ID',
              message: 'Please provide the appointment ID to cancel'
            };
          }

          return await this.mcpService.cancelAppointment(
            jwtToken,
            appointmentId,
            cancellationReason
          );

        case 'get-profile':
          if (!jwtToken) {
            return {
              success: false,
              error: 'Authentication required',
              message: 'Please log in to view your profile'
            };
          }
          
          return await this.mcpService.getProfile(jwtToken);

        case 'unclear':
          return {
            success: false,
            error: 'Unclear request',
            message: parameters.message || 'I\'m not sure what you want. I can help you:\n- List therapists\n- Book appointments\n- View your appointments\n- Cancel appointments\n- View your profile'
          };

        default:
          return {
            success: false,
            error: 'Unknown intent',
            message: 'I don\'t understand what you want to do. Please try rephrasing your request.'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to execute the requested action'
      };
    }
  }

  // Get system prompt for LLM
  getSystemPrompt() {
    return `You are a healthcare assistant integrated with a healthcare management system. You can help patients with:

1. **Listing Therapists**: Show available therapists and their specializations
2. **Booking Appointments**: Help patients book appointments with therapists
3. **Viewing Appointments**: Show patients their upcoming appointments
4. **Canceling Appointments**: Help patients cancel appointments
5. **Viewing Profile**: Show patient profile information

When a patient wants to book an appointment, you need:
- Therapist ID
- Appointment date and time
- Duration (15-180 minutes)
- Optional notes

Always ensure patients are authenticated (have valid JWT token) before performing sensitive operations.`;
  }

  // Get available tools for LLM
  getAvailableTools() {
    return this.mcpService.getAvailableTools();
  }
}
