import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { TherapistsService } from '../therapists/therapists.service';
import { PatientsService } from '../patients/patients.service';
import { JwtService } from '@nestjs/jwt';
import { ChromaClient, Collection } from 'chromadb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { Document } from 'langchain/document';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class RagService implements OnModuleInit {
  private chromaClient: ChromaClient;
  private embeddings: OpenAIEmbeddings;
  private llm: ChatOpenAI;
  private collection: Collection;

  constructor(
    private readonly configService: ConfigService,
    private readonly appointmentsService: AppointmentsService,
    private readonly therapistsService: TherapistsService,
    private readonly patientsService: PatientsService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      this.chromaClient = new ChromaClient({
        host: this.configService.chromaHost,
        port: this.configService.chromaPort,
      });

      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.openaiApiKey,
        modelName: 'text-embedding-3-small',
      });

      this.llm = new ChatOpenAI({
        openAIApiKey: this.configService.openaiApiKey,
        modelName: this.configService.openaiModel,
        temperature: this.configService.openaiTemperature,
        maxTokens: this.configService.openaiMaxTokens,
      });

      // Get or create collection
      await this.initializeCollection();

      console.log('✅ RAG Service initialized with ChromaDB');
    } catch (error) {
      console.error('❌ Failed to initialize RAG service:', error);
      console.log(
        '⚠️  RAG service will continue without ChromaDB. Start ChromaDB with: docker-compose up chroma',
      );
    }
  }

  private async initializeCollection() {
    try {
      // Try to get existing collection
      this.collection = await this.chromaClient.getCollection({
        name: 'healthcare_conversations',
      });
    } catch {
      // Create new collection if it doesn't exist
      this.collection = await this.chromaClient.createCollection({
        name: 'healthcare_conversations',
        metadata: {
          description: 'Healthcare conversation context and user data',
        },
      });
    }
  }

  private extractPatientIdFromToken(token: string): string {
    try {
      const payload = this.jwtService.verify(token) satisfies {
        sub: string;
        role: string;
        email?: string;
        [key: string]: unknown;
      };

      if (!payload.sub || payload.role !== 'patient') {
        throw new UnauthorizedException(
          'Invalid token: patient access required',
        );
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  // Store conversation context in ChromaDB
  async storeConversationContext(
    patientId: string,
    message: string,
    response: string,
    metadata: Record<string, unknown> = {},
    fullChatResponse?: {
      type: string;
      answer: string;
      action?: string;
      parameters?: Record<string, unknown>;
      actionResult?: Record<string, unknown> | null;
      rawData?: unknown;
      timestamp?: string;
    },
  ) {
    try {
      if (!this.collection) {
        console.log(
          '⚠️  ChromaDB not available, skipping conversation storage',
        );
        return;
      }

      // Create user message
      const userMessage = {
        type: 'user',
        answer: message,
        action: null,
        parameters: null,
        actionResult: null,
        rawData: null,
        timestamp: new Date().toISOString(),
      };

      // Create assistant message with full structure
      const assistantMessage = fullChatResponse || {
        type: 'assistant',
        answer: response,
        action: metadata.action || null,
        parameters: metadata.parameters || null,
        actionResult: null,
        rawData: null,
        timestamp: new Date().toISOString(),
      };

      // Store user message
      const userDocument = new Document({
        pageContent: `User: ${userMessage.answer}`,
        metadata: {
          patientId,
          timestamp: userMessage.timestamp,
          messageType: 'user',
          fullMessage: JSON.stringify(userMessage),
          ...this.sanitizeMetadata(metadata),
        },
      });

      const userEmbedding = await this.embeddings.embedQuery(
        userDocument.pageContent,
      );
      await this.collection.add({
        ids: [`${patientId}_user_${Date.now()}`],
        embeddings: [userEmbedding],
        documents: [userDocument.pageContent],
        metadatas: [userDocument.metadata],
      });

      // Store assistant message
      const assistantDocument = new Document({
        pageContent: `Assistant: ${assistantMessage.answer}`,
        metadata: {
          patientId,
          timestamp: assistantMessage.timestamp || new Date().toISOString(),
          messageType: 'assistant',
          fullMessage: JSON.stringify(assistantMessage),
          ...this.sanitizeMetadata(metadata),
        },
      });

      const assistantEmbedding = await this.embeddings.embedQuery(
        assistantDocument.pageContent,
      );
      await this.collection.add({
        ids: [`${patientId}_assistant_${Date.now() + 1}`],
        embeddings: [assistantEmbedding],
        documents: [assistantDocument.pageContent],
        metadatas: [assistantDocument.metadata],
      });

      console.log('✅ Conversation context stored in ChromaDB');
    } catch (error) {
      console.error('❌ Failed to store conversation context:', error);
    }
  }

  // Store MCP operation results for future reference
  async storeMcpOperationResult(
    patientId: string,
    operation: string,
    result: Record<string, unknown>,
    metadata: Record<string, unknown> = {},
  ) {
    try {
      if (!this.collection) {
        console.log(
          '⚠️  ChromaDB not available, skipping MCP operation storage',
        );
        return;
      }
      let documentContent = '';
      const operationMetadata = { ...metadata };

      switch (operation) {
        case 'list_therapists': {
          const therapists = result.data as
            | Array<{
                firstName: string;
                lastName: string;
                _id?: { toString(): string } | string;
                specialization: string;
                email: string;
              }>
            | undefined;

          documentContent = `Available therapists:\n${
            therapists
              ?.map(
                (t) =>
                  `- Dr. ${t.firstName} ${t.lastName} (ID: ${t._id ? (typeof t._id === 'string' ? t._id : t._id.toString()) : 'N/A'}) - ${t.specialization} - ${t.email}`,
              )
              .join('\n') || 'No therapists found'
          }`;
          operationMetadata.operationType = 'therapist_list';
          operationMetadata.therapistCount = therapists?.length || 0;
          operationMetadata.therapistIds = therapists
            ?.map((t) =>
              t._id
                ? typeof t._id === 'string'
                  ? t._id
                  : t._id.toString()
                : 'N/A',
            )
            .join(',');
          break;
        }

        case 'list_appointments': {
          const appointments = result.data as
            | Array<{
                _id?: { toString(): string } | string;
                appointmentDate: string | Date;
                status: string;
                duration: number;
                therapistId?: {
                  firstName: string;
                  lastName: string;
                };
              }>
            | undefined;

          documentContent = `Current appointments:\n${
            appointments
              ?.map(
                (apt) =>
                  `- ID: ${apt._id ? (typeof apt._id === 'string' ? apt._id : apt._id.toString()) : 'N/A'}, Date: ${new Date(apt.appointmentDate).toLocaleString()}, Status: ${apt.status}, Duration: ${apt.duration}min, Therapist: ${apt.therapistId?.firstName || 'Unknown'} ${apt.therapistId?.lastName || ''}`,
              )
              .join('\n') || 'No appointments found'
          }`;
          operationMetadata.operationType = 'appointment_list';
          operationMetadata.appointmentCount = appointments?.length || 0;
          operationMetadata.appointmentIds = appointments
            ?.map((apt) =>
              apt._id
                ? typeof apt._id === 'string'
                  ? apt._id
                  : apt._id.toString()
                : 'N/A',
            )
            .join(',');
          break;
        }

        case 'book_appointment': {
          const appointment = result.data as
            | {
                _id?: { toString(): string } | string;
                appointmentDate?: string | Date;
                duration?: number;
                therapistId?: {
                  firstName: string;
                  lastName: string;
                };
              }
            | undefined;

          const appointmentId = appointment?._id
            ? typeof appointment._id === 'string'
              ? appointment._id
              : appointment._id.toString()
            : 'N/A';
          documentContent = `Appointment booked successfully:\n- ID: ${appointmentId}\n- Date: ${appointment?.appointmentDate ? new Date(appointment.appointmentDate).toLocaleString() : 'N/A'}\n- Duration: ${appointment?.duration || 'N/A'}min\n- Therapist: ${appointment?.therapistId?.firstName || 'Unknown'} ${appointment?.therapistId?.lastName || ''}`;
          operationMetadata.operationType = 'appointment_booked';
          operationMetadata.appointmentId = appointmentId;
          operationMetadata.appointmentDate =
            appointment?.appointmentDate instanceof Date
              ? appointment.appointmentDate.toISOString()
              : appointment?.appointmentDate;
          operationMetadata.duration = appointment?.duration;
          break;
        }

        case 'cancel_appointment': {
          const appointmentId =
            typeof metadata.appointmentId === 'string'
              ? metadata.appointmentId
              : 'Unknown';
          const appointmentDate =
            typeof metadata.appointmentDate === 'string'
              ? metadata.appointmentDate
              : 'Unknown';
          const therapistName =
            typeof metadata.therapistName === 'string'
              ? metadata.therapistName
              : 'Unknown';

          documentContent = `Appointment cancelled successfully:\n- ID: ${appointmentId}\n- Date: ${appointmentDate}\n- Therapist: ${therapistName}`;
          operationMetadata.operationType = 'appointment_cancelled';
          operationMetadata.appointmentId = appointmentId;
          break;
        }

        case 'get_profile': {
          const profile = result.data as
            | {
                firstName?: string;
                lastName?: string;
                email?: string;
                phone?: string;
                address?: string;
              }
            | undefined;

          documentContent = `Patient profile:\n- Name: ${profile?.firstName || 'Unknown'} ${profile?.lastName || ''}\n- Email: ${profile?.email || 'Not provided'}\n- Phone: ${profile?.phone || 'Not provided'}\n- Address: ${profile?.address || 'Not provided'}`;
          operationMetadata.operationType = 'profile_viewed';
          break;
        }

        default:
          documentContent = `Operation ${operation} completed: ${JSON.stringify(result)}`;
          operationMetadata.operationType = operation;
      }

      const document = new Document({
        pageContent: documentContent,
        metadata: {
          patientId,
          timestamp: new Date().toISOString(),
          operation,
          ...this.sanitizeMetadata(operationMetadata),
        },
      });

      const embedding = await this.embeddings.embedQuery(document.pageContent);

      // Store in ChromaDB with a special prefix for MCP results
      await this.collection.add({
        ids: [`mcp_${patientId}_${operation}_${Date.now()}`],
        embeddings: [embedding],
        documents: [document.pageContent],
        metadatas: [document.metadata],
      });

      console.log(`✅ MCP operation result stored: ${operation}`);
    } catch (error) {
      console.error('❌ Failed to store MCP operation result:', error);
    }
  }

  // Retrieve relevant conversation context
  async retrieveConversationContext(
    patientId: string,
    query: string,
    limit: number = 5,
  ): Promise<Document[]> {
    try {
      if (!this.collection) {
        console.log('⚠️  ChromaDB not available, returning empty context');
        return [];
      }

      const queryEmbedding = await this.embeddings.embedQuery(query);

      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: { patientId },
      });

      // Convert to LangChain documents
      const documents = results.documents[0].map(
        (doc: string, index: number) => {
          return new Document({
            pageContent: doc,
            metadata: results.metadatas[0][index] || {},
          });
        },
      );

      return documents;
    } catch (error) {
      console.error('❌ Failed to retrieve conversation context:', error);
      return [];
    }
  }

  // Get patient's current appointments for context
  async getPatientAppointments(patientId: string) {
    try {
      const appointments =
        await this.appointmentsService.findByPatientId(patientId);
      return appointments.map((apt) => ({
        id: apt._id ? apt._id.toString() : 'unknown',
        date: apt.appointmentDate,
        duration: apt.duration,
        status: apt.status,
        notes: apt.notes,
        therapist: apt.therapistId,
      }));
    } catch (error) {
      console.error('❌ Failed to get patient appointments:', error);
      return [];
    }
  }

  async getConversationHistory(
    patientId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      type: string;
      answer: string;
      action?: string | null;
      parameters?: Record<string, unknown> | null;
      actionResult?: Record<string, unknown> | null;
      rawData?: unknown;
      timestamp: string;
    }>
  > {
    try {
      if (!this.collection) {
        console.log('⚠️  ChromaDB not available, returning empty history');
        return [];
      }

      // Get all conversation entries for this patient
      const results = await this.collection.get({
        where: { patientId },
        limit,
      });

      console.log('-----results', results);

      if (!results.documents || results.documents.length === 0) {
        return [];
      }

      // Parse and format conversation history
      const history = results.documents
        .map((doc, index) => {
          const metadata = results.metadatas?.[index] || {};
          const timestamp =
            (metadata.timestamp as string) || new Date().toISOString();

          // Try to parse the full message from metadata
          if (metadata.fullMessage) {
            try {
              const fullMessage = JSON.parse(
                metadata.fullMessage as string,
              ) as {
                type: string;
                answer: string;
                action?: string | null;
                parameters?: Record<string, unknown> | null;
                actionResult?: Record<string, unknown> | null;
                rawData?: unknown;
                timestamp?: string;
              };

              return {
                type: fullMessage.type,
                answer: fullMessage.answer,
                action: fullMessage.action,
                parameters: fullMessage.parameters,
                actionResult: fullMessage.actionResult,
                rawData: fullMessage.rawData,
                timestamp: fullMessage.timestamp || timestamp,
              };
            } catch (error) {
              console.error('Failed to parse full message:', error);
            }
          }

          // Fallback to basic message structure
          const messageType = (metadata.messageType as string) || 'user';
          const content = doc || '';

          return {
            type: messageType,
            answer: content,
            action: null,
            parameters: null,
            actionResult: null,
            rawData: null,
            timestamp: timestamp,
          };
        })
        .filter(
          (item): item is NonNullable<typeof item> =>
            item !== null && item !== undefined,
        );

      console.log('-----fu', history);

      return history;
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      return [];
    }
  }

  // Clear conversation history for a patient (useful for testing)
  async clearConversationHistory(patientId: string) {
    try {
      if (!this.collection) {
        console.log('⚠️  ChromaDB not available, cannot clear history');
        return;
      }

      // Delete all documents for this patient
      const results = await this.collection.get({
        where: { patientId },
      });

      if (results.ids && results.ids.length > 0) {
        await this.collection.delete({
          ids: results.ids,
        });
        console.log(
          `✅ Cleared ${results.ids.length} conversation messages for patient ${patientId}`,
        );
      }
    } catch (error) {
      console.error('❌ Failed to clear conversation history:', error);
    }
  }

  // Get available therapists for context
  async getAvailableTherapists() {
    try {
      const therapists = await this.therapistsService.findAll();
      return therapists.map((t) => ({
        id: t._id ? t._id.toString() : 'unknown',
        name: `Dr. ${t.firstName} ${t.lastName}`,
        specialization: t.specialization,
        email: t.email,
      }));
    } catch (error) {
      console.error('❌ Failed to get therapists:', error);
      return [];
    }
  }

  // Process user message with RAG
  async processMessageWithRag(
    message: string,
    jwtToken: string,
  ): Promise<{
    response: string;
    action?: string;
    parameters?: Record<string, unknown>;
    context?: Record<string, unknown>;
  }> {
    try {
      const patientId = this.extractPatientIdFromToken(jwtToken);

      const contextDocs = await this.retrieveConversationContext(
        patientId,
        message,
      );

      const appointments = await this.getPatientAppointments(patientId);
      const therapists = await this.getAvailableTherapists();
      const patient = await this.patientsService.findById(patientId);

      // Build context string
      const contextString = this.buildContextString(
        contextDocs,
        appointments,
        therapists,
        patient,
      );

      // Create system prompt with context
      const systemPrompt = this.createSystemPrompt(contextString);

      // Generate response using LLM
      const response = await this.llm.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ]);

      console.log('🤖 Raw LLM response:', response.content);

      // Parse response for actions
      const parsedResponse = this.parseResponse(response.content as string);

      // Note: Conversation context will be stored by the chat controller with full response structure

      return parsedResponse;
    } catch (error) {
      console.error('❌ RAG processing error:', error);
      return {
        response:
          'I apologize, but I encountered an error processing your request. Please try again.',
        context: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private buildContextString(
    contextDocs: Document[],
    appointments: Array<{
      id: string;
      date: string | Date;
      duration: number;
      status: string;
      notes?: string;
      therapist: unknown;
    }>,
    therapists: Array<{
      id: string;
      name: string;
      specialization: string;
      email: string;
    }>,
    patient: {
      firstName: string;
      lastName: string;
      email: string;
    },
  ): string {
    let context = `Patient: ${patient.firstName} ${patient.lastName} (${patient.email})\n\n`;

    // Add conversation history
    if (contextDocs.length > 0) {
      context += 'Recent conversation:\n';
      contextDocs.forEach((doc) => {
        context += `${doc.pageContent}\n\n`;
      });
    }

    // Add current appointments
    if (appointments.length > 0) {
      context += 'Current appointments:\n';
      appointments.forEach((apt) => {
        context += `- ID: ${apt.id}, Date: ${new Date(apt.date).toLocaleString()}, Status: ${apt.status}, Duration: ${apt.duration}min\n`;
      });
      context += '\n';
    }

    // Add available therapists
    context += 'Available therapists:\n';
    therapists.forEach((t) => {
      context += `- ID: ${t.id}, Name: ${t.name}, Specialization: ${t.specialization}\n`;
    });

    return context;
  }

  private createSystemPrompt(context: string): string {
    return `You are a helpful healthcare assistant. You have access to the following context:

${context}

You can help with:
1. Listing therapists and their specializations
2. Booking appointments (you have access to therapist IDs and patient info)
3. Viewing current appointments (you have access to appointment IDs and details)
4. Canceling appointments (you can identify appointments by date, therapist, or other details)
5. Viewing patient profile information

IMPORTANT INSTRUCTIONS:
- ALWAYS call the appropriate MCP tool when the user requests specific data
- If the context contains recent therapist lists, use those therapist IDs directly for booking
- If the context contains recent appointment lists, use those appointment IDs directly for canceling
- If the context contains recent profile information, use that data directly

When the user wants to:
- List therapists: ALWAYS call list_therapists tool (returns JSON data)
- Book an appointment: Use therapist ID from cached context if available, otherwise call list_therapists first
- View appointments: ALWAYS call list_appointments tool (returns JSON data)
- Cancel an appointment: Use appointment ID from cached context if available, otherwise call list_appointments first
- View profile: ALWAYS call get_profile tool (returns JSON data)

CRITICAL: When the user asks for specific data (therapists, appointments, profile), you MUST respond with the exact format:

ACTION: [action_name]
PARAMETERS: {"key": "value"}

Examples:
- For "list therapists" or "show me therapists":
ACTION: list_therapists
PARAMETERS: {}

- For "book appointment":
ACTION: book_appointment
PARAMETERS: {"therapistId": "507f1f77bcf86cd799439011", "appointmentDate": "2024-01-15T10:00:00", "duration": 60}

- For "my appointments":
ACTION: list_appointments
PARAMETERS: {}

- For "my profile":
ACTION: get_profile
PARAMETERS: {}

DO NOT provide natural language responses for data requests. ALWAYS use the ACTION/PARAMETERS format.`;
  }

  private parseResponse(response: string): {
    response: string;
    action?: string;
    parameters?: Record<string, unknown>;
  } {
    console.log('🔍 Parsing LLM response:', response);

    const actionMatch = response.match(/ACTION:\s*(.+)/i);
    const parametersMatch = response.match(
      /PARAMETERS:\s*([\s\S]+?)(?=\n\n|\n[A-Z]|$)/i,
    );

    const cleanResponse = response
      .replace(/ACTION:\s*.+/gi, '')
      .replace(/PARAMETERS:\s*.+/gi, '')
      .trim();

    // If we have an action but no parameters, try to infer parameters based on the action
    if (actionMatch && !parametersMatch) {
      const action = actionMatch[1].trim().toLowerCase();
      let parameters = {};

      if (
        action === 'list_therapists' ||
        action === 'list_appointments' ||
        action === 'get_profile'
      ) {
        parameters = {};
      }

      console.log(
        '✅ Parsed action without explicit parameters:',
        action,
        'with inferred parameters:',
        parameters,
      );
      return {
        response: cleanResponse,
        action: actionMatch[1].trim(),
        parameters,
      };
    }

    // Fallback: Try to detect common phrases and map them to actions
    const lowerResponse = response.toLowerCase();
    if (
      lowerResponse.includes('list') &&
      (lowerResponse.includes('therapist') || lowerResponse.includes('doctor'))
    ) {
      console.log('✅ Detected therapist list request, mapping to action');
      return {
        response: cleanResponse,
        action: 'list_therapists',
        parameters: {},
      };
    }
    if (
      lowerResponse.includes('appointment') &&
      (lowerResponse.includes('list') ||
        lowerResponse.includes('show') ||
        lowerResponse.includes('my'))
    ) {
      console.log('✅ Detected appointment list request, mapping to action');
      return {
        response: cleanResponse,
        action: 'list_appointments',
        parameters: {},
      };
    }
    if (
      lowerResponse.includes('profile') &&
      (lowerResponse.includes('my') || lowerResponse.includes('show'))
    ) {
      console.log('✅ Detected profile request, mapping to action');
      return { response: cleanResponse, action: 'get_profile', parameters: {} };
    }

    if (actionMatch && parametersMatch) {
      try {
        const action = actionMatch[1].trim();
        let parametersString = parametersMatch[1].trim();

        // Clean up the parameters string - remove newlines and fix formatting
        parametersString = parametersString
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // If it's not wrapped in braces, wrap it
        if (!parametersString.startsWith('{')) {
          parametersString = `{${parametersString}}`;
        }

        console.log('Cleaned parameters string:', parametersString);
        const parameters = JSON.parse(parametersString) as Record<
          string,
          unknown
        >;
        console.log(
          '✅ Parsed action:',
          action,
          'with parameters:',
          parameters,
        );
        return { response: cleanResponse, action, parameters };
      } catch (error) {
        console.error('❌ Failed to parse action parameters:', error);
        console.log('Raw parameters string:', parametersMatch[1]);

        // Try to extract parameters manually as fallback
        try {
          const action = actionMatch[1].trim();
          const rawParams = parametersMatch[1].trim();

          // Extract key-value pairs manually
          const paramPairs = rawParams.match(/"([^"]+)":\s*"([^"]+)"/g);
          if (paramPairs) {
            const parameters: Record<string, unknown> = {};
            paramPairs.forEach((pair) => {
              const match = pair.match(/"([^"]+)":\s*"([^"]+)"/);
              if (match) {
                parameters[match[1]] = match[2];
              }
            });
            console.log('✅ Fallback parsing successful:', parameters);
            return { response: cleanResponse, action, parameters };
          }
        } catch (fallbackError) {
          console.error('❌ Fallback parsing also failed:', fallbackError);
        }
      }
    } else {
      console.log('⚠️  No action detected in response');
      if (actionMatch) console.log('Action found:', actionMatch[1]);
      if (parametersMatch) console.log('Parameters found:', parametersMatch[1]);
    }

    return { response: cleanResponse || response };
  }

  // Sanitize metadata for ChromaDB compatibility
  private sanitizeMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, string | number | boolean | null> {
    const sanitized: Record<string, string | number | boolean | null> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        sanitized[key] = null;
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        sanitized[key] = JSON.stringify(value);
      } else {
        // Convert everything else to string (functions, symbols, etc.)
        if (typeof value === 'function') {
          sanitized[key] = '[Function]';
        } else if (typeof value === 'symbol') {
          sanitized[key] = '[Symbol]';
        } else if (typeof value === 'bigint') {
          sanitized[key] = value.toString();
        } else {
          // For any other type, use a safe string conversion
          sanitized[key] = '[Unknown Type]';
        }
      }
    }

    return sanitized;
  }
}
