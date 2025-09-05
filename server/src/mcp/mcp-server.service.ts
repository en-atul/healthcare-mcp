/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppointmentsService } from '../appointments/appointments.service';
import { TherapistsService } from '../therapists/therapists.service';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class McpServerService {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly therapistsService: TherapistsService,
    private readonly patientsService: PatientsService,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    console.log('MCP Server service initialized');
    console.log('Available tools for LLM integration:');
    console.log('- list-therapists: List all available therapists');
    console.log(
      '- book-appointment: Book an appointment with a therapist (requires JWT)',
    );
    console.log(
      '- list-appointments: List patient appointments (requires JWT)',
    );
    console.log('- cancel-appointment: Cancel an appointment (requires JWT)');
    console.log('- get-profile: Get patient profile (requires JWT)');
  }

  // Helper method to extract patient ID from JWT token
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: any) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  // Tool methods that can be called by LLM through NestJS backend
  async listTherapists() {
    try {
      const therapists = await this.therapistsService.findAll();
      return {
        success: true,
        data: therapists,
        message: `Found ${therapists.length} therapists`,
        formattedResponse: therapists
          .map(
            (t) =>
              `Dr. ${t.firstName} ${t.lastName} - ${t.specialization} (${t.email})`,
          )
          .join('\n'),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async bookAppointment(
    jwtToken: string,
    therapistId: string,
    appointmentDate: string,
    duration: number,
    notes?: string,
  ) {
    try {
      // Extract patient ID from JWT token
      const patientId = this.extractPatientIdFromToken(jwtToken);

      // Create the appointment
      const appointment = await this.appointmentsService.create(
        {
          therapistId,
          appointmentDate,
          duration,
          notes,
        },
        patientId,
      );

      return {
        success: true,
        data: appointment,
        message: 'Appointment booked successfully',
        formattedResponse: `Appointment booked successfully!\n\nDetails:\n- Date: ${new Date(appointmentDate).toLocaleString()}\n- Duration: ${duration} minutes\n- Appointment ID: ${appointment._id?.toString() || 'N/A'}`,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          error: 'Authentication invalid: ' + error.message,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async listAppointments(jwtToken: string) {
    try {
      // Extract patient ID from JWT token
      const patientId = this.extractPatientIdFromToken(jwtToken);

      // Get patient's appointments
      const appointments =
        await this.appointmentsService.findByPatientId(patientId);

      if (appointments.length === 0) {
        return {
          success: true,
          data: appointments,
          message: 'No appointments found',
          formattedResponse: 'You have no upcoming appointments.',
        };
      }

      const appointmentsList = appointments
        .map((apt) => {
          const therapist = apt.therapistId as unknown as {
            firstName: string;
            lastName: string;
            [key: string]: unknown;
          };
          return `- ${new Date(apt.appointmentDate).toLocaleString()} with Dr. ${therapist.firstName} ${therapist.lastName} (${apt.status})`;
        })
        .join('\n');

      return {
        success: true,
        data: appointments,
        message: `Found ${appointments.length} appointments`,
        formattedResponse: `Your upcoming appointments:\n${appointmentsList}`,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          error: 'Authentication invalid: ' + error.message,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cancelAppointment(
    jwtToken: string,
    appointmentId: string,
    cancellationReason?: string,
  ) {
    try {
      // Extract patient ID from JWT token
      const patientId = this.extractPatientIdFromToken(jwtToken);

      // Get the appointment to verify ownership
      const appointment = await this.appointmentsService.findOne(appointmentId);

      if (appointment.patientId._id.toString() !== patientId) {
        throw new Error('You can only cancel your own appointments');
      }

      // Update appointment status to cancelled
      await this.appointmentsService.update(appointmentId, {
        status: 'cancelled',
        cancellationReason: cancellationReason || 'Cancelled by patient',
      });

      return {
        success: true,
        message: 'Appointment cancelled successfully',
        formattedResponse: `Appointment cancelled successfully. Appointment ID: ${appointmentId}`,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          error: 'Authentication invalid: ' + error.message,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getProfile(jwtToken: string) {
    try {
      // Extract patient ID from JWT token
      const patientId = this.extractPatientIdFromToken(jwtToken);

      // Get patient profile
      const patient = await this.patientsService.findById(patientId);

      return {
        success: true,
        data: patient,
        message: 'Profile retrieved successfully',
        formattedResponse: `Patient Profile:\n- Name: ${patient.firstName} ${patient.lastName}\n- Email: ${patient.email}\n- Phone: ${patient.phone || 'Not provided'}\n- Address: ${patient.address || 'Not provided'}`,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          error: 'Authentication invalid: ' + error.message,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Method to get available tools for LLM
  getAvailableTools() {
    return [
      {
        name: 'list-therapists',
        description:
          'List all available therapists with their specializations and contact information',
        parameters: {},
      },
      {
        name: 'book-appointment',
        description: 'Book an appointment with a therapist',
        parameters: {
          therapistId: 'string - ID of the therapist',
          appointmentDate: 'string - Date and time (ISO format)',
          duration: 'number - Duration in minutes (15-180)',
          notes: 'string (optional) - Notes for the appointment',
        },
      },
      {
        name: 'list-appointments',
        description:
          'List all upcoming appointments for the authenticated patient',
        parameters: {},
      },
      {
        name: 'cancel-appointment',
        description: 'Cancel an existing appointment',
        parameters: {
          appointmentId: 'string - ID of the appointment to cancel',
          cancellationReason: 'string (optional) - Reason for cancellation',
        },
      },
      {
        name: 'get-profile',
        description: 'Get the authenticated patient profile information',
        parameters: {},
      },
    ];
  }
}
