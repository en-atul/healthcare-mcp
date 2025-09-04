import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.openaiApiKey,
    });
  }

  async planToolCall(
    userInput: string,
    user: {
      sub: string;
      email: string;
      role: string;
    },
  ) {
    try {
      const systemPrompt = `You are a healthcare assistant. Convert user input into a JSON MCP tool call.

Available tools:
1. list_therapists - List available therapists (no parameters needed)
2. book_appointment - Book appointment (requires: therapistId, appointmentDate, duration, notes?)
3. list_appointments - List patient appointments (requires: patientId)
4. cancel_appointment - Cancel appointment (requires: appointmentId, cancellationReason?)
5. get_profile - Get patient profile (requires: patientId)

Return ONLY a valid JSON object like:
{ "tool": "tool_name", "args": { "param1": "value1" } }

Examples:
- "Show me therapists" → {"tool": "list_therapists", "args": {}}
- "Book appointment with Dr. Smith tomorrow at 2 PM for 60 minutes. Date should be in ISO format" → {"tool": "book_appointment", "args": {"therapistId": "Dr. Smith", "appointmentDate": "tomorrow at 2 PM", "duration": 60}}
- "Cancel my 3 PM appointment" → {"tool": "cancel_appointment", "args": {"appointmentId": "3 PM appointment"}}

logged in user's data → user's id=${user.sub} and user's role=${user.role}
`;

      const response = await this.openai.chat.completions.create({
        model: this.configService.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
        response_format: { type: 'json_object' },
        temperature: this.configService.openaiTemperature,
        max_tokens: this.configService.openaiMaxTokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error planning tool call:', error);
      throw new Error('Failed to understand user request');
    }
  }

  async formatResult(rawResult: any) {
    try {
      const systemPrompt = `You are a helpful healthcare assistant. Format the tool result into friendly, natural text that a patient would understand. Be professional but warm.`;

      const response = await this.openai.chat.completions.create({
        model: this.configService.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(rawResult) },
        ],
        temperature: this.configService.openaiTemperature,
        max_tokens: this.configService.openaiMaxTokens,
      });

      return (
        response.choices[0]?.message?.content ||
        'I have the information for you.'
      );
    } catch (error) {
      console.error('Error formatting result:', error);
      // Fallback to raw result if formatting fails
      if (rawResult?.content?.[0]?.text) {
        return rawResult.content[0].text;
      }
      return 'I have completed your request.';
    }
  }

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

Always be helpful, professional, and ensure patients provide necessary information for each task.`;
  }
}
