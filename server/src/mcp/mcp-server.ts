import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  BookAppointmentSchema,
  CancelAppointmentSchema,
  ListAppointmentsSchema,
} from './schemas/appointment.schema';
import { GetProfileSchema } from './schemas/user.schema';

// Define types for our healthcare data
interface Therapist {
  firstName: string;
  lastName: string;
  specialization: string;
  email: string;
}

interface Appointment {
  date: string;
  therapist: string;
  status: string;
}

interface PatientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

// Create MCP server instance
const server = new McpServer({
  name: 'healthcare-server',
  version: '1.0.0',
});

// Tool to list available therapists
server.registerTool(
  'list_therapists',
  {
    title: 'List Available Therapists',
    description:
      'Get a list of all available therapists with their specializations and contact information',
  },
  () => {
    // In a real implementation, this would connect to your database
    const therapists: Therapist[] = [
      {
        firstName: 'Dr. John',
        lastName: 'Smith',
        specialization: 'Psychotherapy',
        email: 'dr.smith@healthcare.com',
      },
      {
        firstName: 'Dr. Sarah',
        lastName: 'Johnson',
        specialization: 'Cognitive Behavioral Therapy',
        email: 'dr.johnson@healthcare.com',
      },
      {
        firstName: 'Dr. Michael',
        lastName: 'Williams',
        specialization: 'Family Therapy',
        email: 'dr.williams@healthcare.com',
      },
    ];

    const therapistList = therapists
      .map(
        (t) =>
          `Dr. ${t.firstName} ${t.lastName} - ${t.specialization} (${t.email})`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Available therapists:\n${therapistList}`,
        },
      ],
    };
  },
);

// Tool to book an appointment
server.registerTool(
  'book_appointment',
  {
    title: 'Book Appointment',
    description: 'Book a new appointment with a therapist',
    inputSchema: BookAppointmentSchema,
  },
  async (extra) => {
    const args = extra.params as {
      therapistId: string;
      appointmentDate: string;
      duration: number;
      notes?: string;
    };
    const { therapistId, appointmentDate, duration, notes } = args;
    // In a real implementation, this would create the appointment in your database
    const appointmentId = `apt_${Date.now()}`;

    return {
      content: [
        {
          type: 'text',
          text: `Appointment booked successfully!\n\nDetails:\n- Therapist ID: ${therapistId}\n- Date: ${appointmentDate}\n- Duration: ${duration} minutes\n- Appointment ID: ${appointmentId}\n- Notes: ${notes || 'None'}`,
        },
      ],
    };
  },
);

// Tool to list patient appointments
server.registerTool(
  'list_appointments',
  {
    title: 'List Patient Appointments',
    description: 'Get a list of all appointments for a specific patient',
    inputSchema: ListAppointmentsSchema,
  },
  async (extra) => {
    const args = extra.params as { patientId: string };
    const { patientId } = args;
    // In a real implementation, this would fetch from your database
    const appointments: Appointment[] = [
      {
        date: '2024-01-15T10:00:00Z',
        therapist: 'Dr. Smith',
        status: 'confirmed',
      },
      {
        date: '2024-01-20T14:00:00Z',
        therapist: 'Dr. Johnson',
        status: 'scheduled',
      },
    ];

    if (appointments.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'You have no upcoming appointments.',
          },
        ],
      };
    }

    const appointmentList = appointments
      .map(
        (apt) =>
          `- ${new Date(apt.date).toLocaleString()} with ${apt.therapist} (${apt.status})`,
      )
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Your upcoming appointments:\n${appointmentList}`,
        },
      ],
    };
  },
);

// Tool to cancel an appointment
server.registerTool(
  'cancel_appointment',
  {
    title: 'Cancel Appointment',
    description:
      'Cancel an existing appointment with optional cancellation reason',
    inputSchema: CancelAppointmentSchema,
  },
  async (extra) => {
    const args = extra.params as {
      appointmentId: string;
      cancellationReason?: string;
    };
    const { appointmentId, cancellationReason } = args;
    // In a real implementation, this would update your database
    return {
      content: [
        {
          type: 'text',
          text: `Appointment ${appointmentId} cancelled successfully.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
        },
      ],
    };
  },
);

// Tool to get patient profile
server.registerTool(
  'get_profile',
  {
    title: 'Get Patient Profile',
    description: 'Retrieve the profile information for a specific patient',
    inputSchema: GetProfileSchema,
  },
  async (extra) => {
    const args = extra.params as { patientId: string };
    const { patientId } = args;
    // In a real implementation, this would fetch from your database
    const profile: PatientProfile = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      address: '123 Main St, City, State',
    };

    return {
      content: [
        {
          type: 'text',
          text: `Patient Profile:\n- Name: ${profile.firstName} ${profile.lastName}\n- Email: ${profile.email}\n- Phone: ${profile.phone}\n- Address: ${profile.address}`,
        },
      ],
    };
  },
);

// Start the server
async function startServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.log('🚀 Healthcare MCP Server running...');
    console.log('Available tools:');
    console.log('- list_therapists');
    console.log('- book_appointment');
    console.log('- list_appointments');
    console.log('- cancel_appointment');
    console.log('- get_profile');
  } catch (error) {
    console.error('❌ Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  (async () => {
    console.log('\n🛑 Shutting down MCP server...');
    try {
      await server.close();
      console.log('✅ MCP server shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  })().catch((error) => {
    console.error('❌ Unhandled error during shutdown:', error);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  (async () => {
    console.log('\n🛑 Received SIGTERM, shutting down MCP server...');
    try {
      await server.close();
      console.log('✅ MCP server shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  })().catch((error) => {
    console.error('❌ Unhandled error during SIGTERM shutdown:', error);
    process.exit(1);
  });
});

// Start the server
startServer();
