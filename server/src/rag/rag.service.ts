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
      // Initialize ChromaDB client
      this.chromaClient = new ChromaClient({
        host: 'localhost',
        port: 8001,
      });

      // Initialize OpenAI embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.openaiApiKey,
        modelName: 'text-embedding-3-small',
      });

      // Initialize ChatOpenAI
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
      console.log('⚠️  RAG service will continue without ChromaDB. Start ChromaDB with: docker-compose up chroma');
    }
  }

  private async initializeCollection() {
    try {
      // Try to get existing collection
      this.collection = await this.chromaClient.getCollection({
        name: 'healthcare_conversations',
      });
    } catch (error) {
      // Create new collection if it doesn't exist
      this.collection = await this.chromaClient.createCollection({
        name: 'healthcare_conversations',
        metadata: {
          description: 'Healthcare conversation context and user data',
        },
      });
    }
  }

  // Extract patient ID from JWT token
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
    } catch (error: any) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  // Store conversation context in ChromaDB
  async storeConversationContext(
    patientId: string,
    message: string,
    response: string,
    metadata: Record<string, any> = {},
  ) {
    try {
      if (!this.collection) {
        console.log('⚠️  ChromaDB not available, skipping conversation storage');
        return;
      }

      const document = new Document({
        pageContent: `User: ${message}\nAssistant: ${response}`,
        metadata: {
          patientId,
          timestamp: new Date().toISOString(),
          ...this.sanitizeMetadata(metadata),
        },
      });

      // Generate embedding
      const embedding = await this.embeddings.embedQuery(document.pageContent);

      // Store in ChromaDB
      await this.collection.add({
        ids: [`${patientId}_${Date.now()}`],
        embeddings: [embedding],
        documents: [document.pageContent],
        metadatas: [document.metadata],
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
    result: any,
    metadata: Record<string, any> = {},
  ) {
    try {
      if (!this.collection) {
        console.log('⚠️  ChromaDB not available, skipping MCP operation storage');
        return;
      }
      let documentContent = '';
      let operationMetadata = { ...metadata };

      switch (operation) {
        case 'list_therapists':
          documentContent = `Available therapists:\n${
            result.data
              ?.map(
                (t: any) =>
                  `- Dr. ${t.firstName} ${t.lastName} (ID: ${t._id}) - ${t.specialization} - ${t.email}`,
              )
              .join('\n') || 'No therapists found'
          }`;
          operationMetadata.operationType = 'therapist_list';
          operationMetadata.therapistCount = result.data?.length || 0;
          operationMetadata.therapistIds = result.data?.map((t: any) => t._id?.toString()).join(',');
          break;

        case 'list_appointments':
          documentContent = `Current appointments:\n${
            result.data
              ?.map(
                (apt: any) =>
                  `- ID: ${apt._id}, Date: ${new Date(apt.appointmentDate).toLocaleString()}, Status: ${apt.status}, Duration: ${apt.duration}min, Therapist: ${apt.therapistId?.firstName} ${apt.therapistId?.lastName}`,
              )
              .join('\n') || 'No appointments found'
          }`;
          operationMetadata.operationType = 'appointment_list';
          operationMetadata.appointmentCount = result.data?.length || 0;
          operationMetadata.appointmentIds = result.data?.map((apt: any) => apt._id?.toString()).join(',');
          break;

        case 'book_appointment':
          documentContent = `Appointment booked successfully:\n- ID: ${result.data?._id}\n- Date: ${new Date(result.data?.appointmentDate).toLocaleString()}\n- Duration: ${result.data?.duration}min\n- Therapist: ${result.data?.therapistId?.firstName} ${result.data?.therapistId?.lastName}`;
          operationMetadata.operationType = 'appointment_booked';
          operationMetadata.appointmentId = result.data?._id?.toString();
          operationMetadata.appointmentDate = result.data?.appointmentDate?.toISOString();
          operationMetadata.duration = result.data?.duration;
          break;

        case 'cancel_appointment':
          documentContent = `Appointment cancelled successfully:\n- ID: ${metadata.appointmentId}\n- Date: ${metadata.appointmentDate || 'Unknown'}\n- Therapist: ${metadata.therapistName || 'Unknown'}`;
          operationMetadata.operationType = 'appointment_cancelled';
          operationMetadata.appointmentId = metadata.appointmentId;
          break;

        case 'get_profile':
          documentContent = `Patient profile:\n- Name: ${result.data?.firstName} ${result.data?.lastName}\n- Email: ${result.data?.email}\n- Phone: ${result.data?.phone || 'Not provided'}\n- Address: ${result.data?.address || 'Not provided'}`;
          operationMetadata.operationType = 'profile_viewed';
          break;

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

      // Generate embedding
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

      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Search in ChromaDB
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
        id: apt._id.toString(),
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

  // Get conversation history for frontend display
  async getConversationHistory(
    patientId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      id: string;
      timestamp: string;
      type: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: Record<string, any>;
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

      if (!results.documents || results.documents.length === 0) {
        return [];
      }

              // Parse and format conversation history
        const history = results.documents
          .map((doc, index) => {
            const metadata = results.metadatas?.[index] || {};
            const id = results.ids?.[index] || `msg_${index}`;
            const timestamp = (metadata.timestamp as string) || new Date().toISOString();

            // Parse the document content to extract user and assistant messages
            const lines = doc?.split('\n') || [];
          const messages: Array<{
            id: string;
            timestamp: string;
            type: 'user' | 'assistant' | 'system';
            content: string;
            metadata?: Record<string, any>;
          }> = [];

          let currentMessage = '';
          let currentType: 'user' | 'assistant' | 'system' = 'user';

          for (const line of lines) {
            if (line.startsWith('User: ')) {
              // Save previous message if exists
              if (currentMessage.trim()) {
                messages.push({
                  id: `${id}_${messages.length}`,
                                     timestamp: timestamp as string,
                  type: currentType,
                  content: currentMessage.trim(),
                  metadata,
                });
              }
              // Start new user message
              currentMessage = line.replace('User: ', '');
              currentType = 'user';
            } else if (line.startsWith('Assistant: ')) {
              // Save previous message if exists
              if (currentMessage.trim()) {
                messages.push({
                  id: `${id}_${messages.length}`,
                                     timestamp: timestamp as string,
                  type: currentType,
                  content: currentMessage.trim(),
                  metadata,
                });
              }
              // Start new assistant message
              currentMessage = line.replace('Assistant: ', '');
              currentType = 'assistant';
            } else if (line.trim()) {
              // Continue current message
              currentMessage += (currentMessage ? '\n' : '') + line;
            }
          }

          // Add the last message
          if (currentMessage.trim()) {
            messages.push({
              id: `${id}_${messages.length}`,
                                 timestamp: timestamp as string,
              type: currentType,
              content: currentMessage.trim(),
              metadata,
            });
          }

          return messages;
        })
        .flat();

      // Sort by timestamp (newest first)
      history.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      console.log(
        `📜 Retrieved ${history.length} conversation messages for patient ${patientId}`,
      );
      return history;
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      return [];
    }
  }

  // Get available therapists for context
  async getAvailableTherapists() {
    try {
      const therapists = await this.therapistsService.findAll();
      return therapists.map((t) => ({
        id: t._id.toString(),
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
    parameters?: Record<string, any>;
    context?: any;
  }> {
    try {
      const patientId = this.extractPatientIdFromToken(jwtToken);

      // Retrieve relevant conversation context
      const contextDocs = await this.retrieveConversationContext(
        patientId,
        message,
      );

      // Get current patient data for context
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

      // Parse response for actions
      const parsedResponse = this.parseResponse(response.content as string);

      // Store conversation context
      await this.storeConversationContext(
        patientId,
        message,
        parsedResponse.response,
        {
          action: parsedResponse.action,
          parameters: parsedResponse.parameters,
        },
      );

      return parsedResponse;
    } catch (error) {
      console.error('❌ RAG processing error:', error);
      return {
        response:
          'I apologize, but I encountered an error processing your request. Please try again.',
        context: { error: error.message },
      };
    }
  }

  private buildContextString(
    contextDocs: Document[],
    appointments: any[],
    therapists: any[],
    patient: any,
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

ALWAYS respond with action format when you need to fetch data:
ACTION: [action_name]
PARAMETERS: {"key": "value", "key2": "value2"}

IMPORTANT: Parameters must be valid JSON on a single line. Example:
ACTION: book_appointment
PARAMETERS: {"therapistId": "507f1f77bcf86cd799439011", "appointmentDate": "2024-01-15T10:00:00", "duration": 60}

The MCP tools return structured JSON data that should be passed through to the user.`;
  }

  private parseResponse(response: string): {
    response: string;
    action?: string;
    parameters?: Record<string, any>;
  } {
    console.log('🔍 Parsing LLM response:', response);
    
    const actionMatch = response.match(/ACTION:\s*(.+)/i);
    const parametersMatch = response.match(/PARAMETERS:\s*([\s\S]+?)(?=\n\n|\n[A-Z]|$)/i);

    let cleanResponse = response
      .replace(/ACTION:\s*.+/gi, '')
      .replace(/PARAMETERS:\s*.+/gi, '')
      .trim();

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
        const parameters = JSON.parse(parametersString);
        console.log('✅ Parsed action:', action, 'with parameters:', parameters);
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
            const parameters: Record<string, any> = {};
            paramPairs.forEach(pair => {
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
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, string | number | boolean | null> {
    const sanitized: Record<string, string | number | boolean | null> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        sanitized[key] = null;
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value instanceof Date) {
        sanitized[key] = value.toISOString();
      } else if (typeof value === 'object') {
        // Convert objects to JSON strings
        sanitized[key] = JSON.stringify(value);
      } else {
        // Convert everything else to string
        sanitized[key] = String(value);
      }
    }
    
    return sanitized;
  }
}
