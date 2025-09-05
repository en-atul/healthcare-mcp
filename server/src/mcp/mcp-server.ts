import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';

// Configuration
const NESTJS_BASE_URL = process.env.NESTJS_BASE_URL || 'http://localhost:3000';
const MCP_API_KEY =
  process.env.MCP_API_KEY || 'your-secret-mcp-api-key-change-in-production';

// Create MCP server
const server = new McpServer({
  name: 'healthcare-mcp-server',
  version: '1.0.0',
});

// Define response types
interface McpResponse {
  success: boolean;
  error?: string;
  message?: string;
  data?: unknown[];
  formattedResponse?: string;
}

// Helper function to make HTTP calls to NestJS backend
async function callNestjsEndpoint(
  endpoint: string,
  data: Record<string, unknown> = {},
  headers: Record<string, unknown> = {},
): Promise<McpResponse> {
  try {
    const response = await axios.post(
      `${NESTJS_BASE_URL}/mcp/${endpoint}`,
      data,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-MCP-API-Key': MCP_API_KEY,
          ...headers,
        },
      },
    );

    return response.data as McpResponse;
  } catch (error) {
    console.error(
      `Error calling ${endpoint}:`,
      error instanceof Error ? error.message : 'Unknown error',
    );
    throw new Error(
      `Failed to call ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// Helper function to validate API key
function validateApiKey(apiKey: string): boolean {
  return apiKey === MCP_API_KEY;
}

// Register tools
server.registerTool(
  'list-therapists',
  {
    title: 'List Available Therapists',
    description:
      'Get a list of all available therapists with their specializations and contact information',
    inputSchema: z.object({
      apiKey: z.string().describe('API key for authentication'),
    }).shape,
  },
  async (args) => {
    try {
      // Validate API key
      if (!validateApiKey(args.apiKey)) {
        throw new Error('Invalid API key');
      }

      // Call NestJS endpoint
      const result = await callNestjsEndpoint('list-therapists');

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text:
                result.formattedResponse ||
                `Found ${result.data?.length || 0} therapists`,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to list therapists');
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

server.registerTool(
  'book-appointment',
  {
    title: 'Book Appointment',
    description: 'Book an appointment with a therapist',
    inputSchema: z.object({
      apiKey: z.string().describe('API key for authentication'),
      jwtToken: z.string().describe('JWT token for patient authentication'),
      therapistId: z.string().describe('ID of the therapist'),
      appointmentDate: z
        .string()
        .describe('Date and time for the appointment (ISO format)'),
      duration: z
        .number()
        .min(15)
        .max(180)
        .describe('Duration in minutes (15-180)'),
      notes: z
        .string()
        .optional()
        .describe('Optional notes for the appointment'),
    }).shape,
  },
  async (args) => {
    try {
      // Validate API key
      if (!validateApiKey(args.apiKey)) {
        throw new Error('Invalid API key');
      }

      // Call NestJS endpoint
      const result = await callNestjsEndpoint(
        'book-appointment',
        {
          therapistId: args.therapistId,
          appointmentDate: args.appointmentDate,
          duration: args.duration,
          notes: args.notes,
        },
        {
          Authorization: `Bearer ${args.jwtToken}`,
        },
      );

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text:
                result.formattedResponse || 'Appointment booked successfully!',
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to book appointment');
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

server.registerTool(
  'list-appointments',
  {
    title: 'List Patient Appointments',
    description:
      'Get a list of all upcoming appointments for the authenticated patient',
    inputSchema: z.object({
      apiKey: z.string().describe('API key for authentication'),
      jwtToken: z.string().describe('JWT token for patient authentication'),
    }).shape,
  },
  async (args) => {
    try {
      // Validate API key
      if (!validateApiKey(args.apiKey)) {
        throw new Error('Invalid API key');
      }

      // Call NestJS endpoint
      const result = await callNestjsEndpoint(
        'list-appointments',
        {},
        {
          Authorization: `Bearer ${args.jwtToken}`,
        },
      );

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text:
                result.formattedResponse ||
                `Found ${result.data?.length || 0} appointments`,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to list appointments');
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

server.registerTool(
  'cancel-appointment',
  {
    title: 'Cancel Appointment',
    description: 'Cancel an existing appointment',
    inputSchema: z.object({
      apiKey: z.string().describe('API key for authentication'),
      jwtToken: z.string().describe('JWT token for patient authentication'),
      appointmentId: z.string().describe('ID of the appointment to cancel'),
      cancellationReason: z
        .string()
        .optional()
        .describe('Optional reason for cancellation'),
    }).shape,
  },
  async (args) => {
    try {
      // Validate API key
      if (!validateApiKey(args.apiKey)) {
        throw new Error('Invalid API key');
      }

      // Call NestJS endpoint
      const result = await callNestjsEndpoint(
        'cancel-appointment',
        {
          appointmentId: args.appointmentId,
          cancellationReason: args.cancellationReason,
        },
        {
          Authorization: `Bearer ${args.jwtToken}`,
        },
      );

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text:
                result.formattedResponse ||
                'Appointment cancelled successfully!',
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

server.registerTool(
  'get-profile',
  {
    title: 'Get Patient Profile',
    description: 'Get the authenticated patient profile information',
    inputSchema: z.object({
      apiKey: z.string().describe('API key for authentication'),
      jwtToken: z.string().describe('JWT token for patient authentication'),
    }).shape,
  },
  async (args) => {
    try {
      // Validate API key
      if (!validateApiKey(args.apiKey)) {
        throw new Error('Invalid API key');
      }

      // Call NestJS endpoint
      const result = await callNestjsEndpoint(
        'get-profile',
        {},
        {
          Authorization: `Bearer ${args.jwtToken}`,
        },
      );

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text:
                result.formattedResponse || 'Profile retrieved successfully!',
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to get profile');
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  },
);

// Start the server
async function main() {
  try {
    console.log('Starting Healthcare MCP Server...');
    console.log(`NestJS Backend URL: ${NESTJS_BASE_URL}`);
    console.log('Available tools:');
    console.log('- list-therapists');
    console.log('- book-appointment');
    console.log('- list-appointments');
    console.log('- cancel-appointment');
    console.log('- get-profile');

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('MCP Server started successfully!');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main().catch(console.error);
