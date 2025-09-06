import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { TherapistsService } from '../therapists/therapists.service';
import { PatientsService } from '../patients/patients.service';
import { JwtService } from '@nestjs/jwt';
import { ChromaService } from '../chroma/chroma.service';
import { OpenAIEmbeddings, ChatOpenAI } from '@langchain/openai';
import { Document } from 'langchain/document';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class RagService implements OnModuleInit {
  private embeddings: OpenAIEmbeddings;
  private llm: ChatOpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly appointmentsService: AppointmentsService,
    private readonly therapistsService: TherapistsService,
    private readonly patientsService: PatientsService,
    private readonly jwtService: JwtService,
    private readonly chromaService: ChromaService,
  ) {}

  async onModuleInit() {
    try {
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

      // Initialize ChromaDB service
      await this.chromaService.initialize();

      console.log('✅ RAG Service initialized with ChromaDB');
    } catch (error) {
      console.error('❌ Failed to initialize RAG service:', error);
      console.log(
        '⚠️  RAG service will continue without ChromaDB. Start ChromaDB with: docker-compose up chroma',
      );
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
      if (!this.chromaService.collection) {
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

      // const userEmbedding = await this.embeddings.embedQuery(
      //   userDocument.pageContent,
      // );

      try {
        console.log('ids:', [`${patientId}_user_${Date.now()}`]);
        // console.log('embedding length:', userEmbedding.length);
        console.log('documents:', [userDocument.pageContent]);
        console.log('metadatas:', [userDocument.metadata]);

        await this.chromaService.addDocuments(
          [`${patientId}_user_${Date.now()}`],
          [userDocument.pageContent],
          [userDocument.metadata],
        );
      } catch (addError) {
        console.error('❌ Failed to add user message to ChromaDB:', addError);
        console.log('⚠️  Continuing without storing user message');
        return; // Exit early if we can't store the user message
      }

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

      // const assistantEmbedding = await this.embeddings.embedQuery(
      //   assistantDocument.pageContent,
      // );

      try {
        await this.chromaService.addDocuments(
          [`${patientId}_assistant_${Date.now() + 1}`],
          [assistantDocument.pageContent],
          [assistantDocument.metadata],
        );
      } catch (addError) {
        console.error(
          '❌ Failed to add assistant message to ChromaDB:',
          addError,
        );
        console.log('⚠️  Continuing without storing assistant message');
        return; // Exit early if we can't store the assistant message
      }

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
      if (!this.chromaService.collection) {
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

      // const embedding = await this.embeddings.embedQuery(document.pageContent);

      // Store in ChromaDB with a special prefix for MCP results
      await this.chromaService.addDocuments(
        [`mcp_${patientId}_${operation}_${Date.now()}`],
        [document.pageContent],
        [document.metadata],
      );

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
      if (!this.chromaService.collection) {
        console.log('⚠️  ChromaDB not available, returning empty context');
        return [];
      }

      // const queryEmbedding = await this.embeddings.embedQuery(query);

      const results = await this.chromaService.collection.query({
        // queryEmbeddings: [queryEmbedding],
        queryTexts: [query],
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
      if (!this.chromaService.collection) {
        console.log('⚠️  ChromaDB not available, returning empty history');
        return [];
      }

      console.log(
        '🔍 ChromaDB collection available, querying for patient:',
        patientId,
      );

      // Get all conversation entries for this patient
      // Note: ChromaDB's get() method doesn't guarantee order, so we'll sort by timestamp after retrieval
      const results = await this.chromaService.collection.get({
        where: { patientId },
        limit: limit * 2, // Get more than needed to ensure we have enough after sorting
      });

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

      // Sort by timestamp to ensure chronological order (oldest first)
      const sortedHistory = history.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Apply limit after sorting to ensure we get the most recent messages
      return sortedHistory.slice(-limit);
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      return [];
    }
  }

  // Clear conversation history for a patient (useful for testing)
  async clearConversationHistory(patientId: string) {
    try {
      if (!this.chromaService.collection) {
        console.log('⚠️  ChromaDB not available, cannot clear history');
        return;
      }

      // Delete all documents for this patient
      const results = await this.chromaService.collection.get({
        where: { patientId },
      });

      if (results.ids && results.ids.length > 0) {
        await this.chromaService.deleteDocuments(results.ids);
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
    conversationHistory?: Array<{
      type: string;
      answer: string;
      action?: string | null;
      parameters?: Record<string, unknown> | null;
      actionResult?: Record<string, unknown> | null;
      rawData?: unknown;
      timestamp: string;
    }>,
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

      // Build conversation messages for LLM
      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history if available
      if (conversationHistory && conversationHistory.length > 0) {
        console.log(
          '📚 Conversation history for context:',
          JSON.stringify(conversationHistory.slice(-5), null, 2),
        );
        // Add last 5 messages for context (to avoid token limits)
        const recentHistory = conversationHistory.slice(-5);
        for (const msg of recentHistory) {
          if (msg.type === 'user') {
            messages.push({ role: 'user', content: msg.answer });
          } else if (msg.type === 'assistant') {
            // Include action and parameters in assistant messages for better context
            let assistantContent = msg.answer;
            if (msg.action) {
              assistantContent += `\n[Previous action: ${msg.action}]`;
              if (msg.parameters) {
                assistantContent += `\n[Previous parameters: ${JSON.stringify(msg.parameters)}]`;
              }
            }
            messages.push({ role: 'assistant', content: assistantContent });
          }
        }
      } else {
        console.log('📚 No conversation history available for context');
      }

      // Add current user message
      messages.push({ role: 'user', content: message });

      // Generate response using LLM
      const response = await this.llm.invoke(messages);

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
- Book an appointment: ONLY call book_appointment if you have ALL required information (therapistId, appointmentDate, duration). If missing any info, ask the user for it.
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

- For "book appointment" (ONLY if you have all required info):
ACTION: book_appointment
PARAMETERS: {"therapistId": "actual_therapist_id", "appointmentDate": "2024-01-15T10:00:00", "duration": 60}

- For "my appointments":
ACTION: list_appointments
PARAMETERS: {}

- For "my profile":
ACTION: get_profile
PARAMETERS: {}

CONTEXT EXAMPLE:
If the conversation flow is:
1. User: "Book appointment with Dr. David Davis"
2. Assistant: "Please provide date, time, and duration"
3. User: "book on 15th September at 5:00 PM for 30 minutes"

Then the assistant should immediately book the appointment with:
ACTION: book_appointment
PARAMETERS: {"therapistId": "david_davis_id", "appointmentDate": "2024-09-15T17:00:00", "duration": 30}

ANOTHER EXAMPLE:
If the conversation flow is:
1. User: "Book appointment"
2. Assistant: "Which therapist would you like to book with? Here are available therapists: Dr. David Davis, Dr. Emily Brown..."
3. User: "Dr. David Davis"
4. Assistant: "What date and time would you prefer? How long should the appointment be?"
5. User: "tomorrow at 2 PM for 60 minutes"

Then the assistant should immediately book the appointment with:
ACTION: book_appointment
PARAMETERS: {"therapistId": "david_davis_id", "appointmentDate": "2024-09-16T14:00:00", "duration": 60}

CONTEXT DATA EXAMPLE:
If conversation history contains:
- actionResult.data: [{"id": "68bbe9a467aead836a2c21e9", "firstName": "David", "lastName": "Davis", ...}]
- User says: "book with Dr. David Davis"

Then use the ID from context:
ACTION: book_appointment
PARAMETERS: {"therapistId": "68bbe9a467aead836a2c21e9", "appointmentDate": "...", "duration": ...}

CONTEXT USAGE EXAMPLE:
If conversation history shows therapist data was retrieved and user says "book appointment":
- DO NOT respond with: "Which therapist would you like to book with? Here are the available therapists: Dr. John Smith, Dr. Sarah Johnson..."
- DO respond with: "Which therapist would you like to book with? I can see the available therapists from our previous conversation."

CRITICAL: When a user provides information in response to your questions, you MUST:
1. Connect their response with the previous context
2. Use the information they provided
3. Proceed with the action if you have all required information
4. DO NOT ask for the same information again

CONTEXT CONNECTION RULES:
- If you asked "Which therapist would you like to book with?" and user responds with a therapist name, use that therapist
- If you asked "What date and time would you prefer?" and user responds with date/time, use that date/time
- If you asked "How long should the appointment be?" and user responds with duration, use that duration
- ALWAYS combine information from multiple messages in the conversation
- NEVER ask for information that has already been provided in the conversation

IMPORTANT: For appointment booking, you MUST have:
- therapistId: The exact ID of the therapist
- appointmentDate: Date and time in ISO format (e.g., "2024-01-15T10:00:00")
- duration: Duration in minutes (15-180)

CONTEXT AWARENESS: 
- ALWAYS review the conversation history to understand what information has already been provided
- If the user has already provided some information in previous messages, use that information
- If the user mentions a therapist name, look for their ID in the context
- If the user provides a date/time, convert it to ISO format (e.g., "15th September at 5:00 PM" → "2024-09-15T17:00:00")
- Only ask for information that is still missing
- If you have all required information, proceed with booking
- When a user responds to your questions, connect their response with the previous context
- For appointment booking, if you asked for details and the user provided them, use those details immediately
- NEVER ask for the same information twice in the same conversation

CONTEXT DATA USAGE:
- If conversation history contains therapist data in actionResult/rawData, use those therapist IDs directly
- If user says "book with Dr. David Davis", find his ID from the context data
- If user says "book appointment" after therapist list was shown, ask which specific therapist from the list
- Use the exact therapist IDs from the context data, not generic names

CRITICAL CONTEXT RULES:
- If conversation history shows therapist data was already retrieved (actionResult.data contains therapist list), DO NOT ask for therapist list again
- If user says "book appointment" and therapist data exists in context, ask which specific therapist from the existing list
- If user mentions a therapist name, immediately look up their ID from the context data
- NEVER repeat information that's already in the conversation history

If the user says "book appointment" without providing these details, ask them:
1. Which therapist would you like to book with? (provide therapist list if needed)
2. What date and time would you prefer?
3. How long should the appointment be? (15-180 minutes)

SPECIAL CASE: If conversation history contains therapist data (actionResult.data with therapist list):
- DO NOT ask for therapist list again
- Instead ask: "Which therapist would you like to book with? I can see the available therapists from our previous conversation."
- Then ask for date/time and duration

BOOKING FLOW WITH CONTEXT:
1. If user says "book appointment" and therapist data exists in context:
   - Ask: "Which therapist would you like to book with? I can see the available therapists from our previous conversation."
   - DO NOT repeat the therapist list
2. If user mentions a specific therapist name:
   - Look up their ID from the context data
   - Ask for date/time and duration
3. If user provides all details:
   - Use the therapist ID from context
   - Proceed with booking

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

    // Check if the response is asking for more information (no action provided)
    const lowerResponse = response.toLowerCase();
    const isAskingForInfo =
      lowerResponse.includes('which therapist') ||
      lowerResponse.includes('what date') ||
      lowerResponse.includes('what time') ||
      lowerResponse.includes('how long') ||
      lowerResponse.includes('please provide') ||
      lowerResponse.includes('i need') ||
      lowerResponse.includes('missing') ||
      lowerResponse.includes('required') ||
      lowerResponse.includes('need more details') ||
      lowerResponse.includes('few more details') ||
      lowerResponse.includes('provide the following details');

    // Check if the response is repeating therapist list when it should use context
    const isRepeatingTherapistList =
      lowerResponse.includes('here are the available therapists') ||
      lowerResponse.includes('available therapists:') ||
      (lowerResponse.includes('dr.') &&
        lowerResponse.includes('specialization'));

    if (isAskingForInfo && !isRepeatingTherapistList) {
      console.log(
        '✅ LLM is asking for more information, returning response without action',
      );
      return {
        response: cleanResponse,
        action: undefined,
        parameters: undefined,
      };
    }

    if (isRepeatingTherapistList) {
      console.log(
        '⚠️  LLM is repeating therapist list instead of using context, returning response without action',
      );
      return {
        response: cleanResponse,
        action: undefined,
        parameters: undefined,
      };
    }

    // Fallback: Try to detect common phrases and map them to actions
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
  ): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Skip null and undefined values entirely
      if (value === null || value === undefined) {
        continue;
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
