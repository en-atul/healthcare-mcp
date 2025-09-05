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

  async listTherapists() {
    try {
      const therapists = await this.therapistsService.findAll();

      const cleanTherapists = therapists.map((t) => ({
        firstName: t.firstName,
        lastName: t.lastName,
        specialization: t.specialization,
        experience: t.experience,
        rating: t.rating,
        email: t.email,
      }));

      const htmlResponse = `
        <h3>Available Therapists</h3>
        <ul>
          ${therapists
            .map(
              (t) => `
            <li>
              <strong>Dr. ${t.firstName} ${t.lastName}</strong><br>
              <em>${t.specialization}</em><br>
              ${t.experience} years experience • ⭐ ${t.rating}/5<br>
              📧 ${t.email}
            </li>
          `,
            )
            .join('')}
        </ul>
      `;

      return {
        success: true,
        data: cleanTherapists,
        message: `Found ${therapists.length} therapists`,
        formattedResponse: htmlResponse,
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
      const patientId = this.extractPatientIdFromToken(jwtToken);

      const appointment = await this.appointmentsService.create(
        {
          therapistId,
          appointmentDate,
          duration,
          notes,
        },
        patientId,
      );

      const therapist = await this.therapistsService.findById(therapistId);

      const cleanAppointment = {
        date: appointment.appointmentDate,
        duration: appointment.duration,
        status: appointment.status,
        therapistName: therapist
          ? `Dr. ${therapist.firstName} ${therapist.lastName}`
          : 'Unknown Therapist',
        notes: appointment.notes,
      };

      const htmlResponse = `
        <div class="appointment-confirmation">
          <h3>✅ Appointment Booked Successfully!</h3>
          <div class="appointment-details">
            <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Therapist:</strong> ${therapist ? `Dr. ${therapist.firstName} ${therapist.lastName}` : 'Unknown'}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
          </div>
        </div>
      `;

      return {
        success: true,
        data: cleanAppointment,
        message: 'Appointment booked successfully',
        formattedResponse: htmlResponse,
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
      const patientId = this.extractPatientIdFromToken(jwtToken);

      const appointments =
        await this.appointmentsService.findByPatientId(patientId);

      if (appointments.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No appointments found',
          formattedResponse: '<p>You have no upcoming appointments.</p>',
        };
      }

      const cleanAppointments = appointments.map((apt) => {
        const therapist = apt.therapistId as unknown as {
          firstName: string;
          lastName: string;
          [key: string]: unknown;
        };
        return {
          date: apt.appointmentDate,
          duration: apt.duration,
          status: apt.status,
          therapistName: `Dr. ${therapist.firstName} ${therapist.lastName}`,
          notes: apt.notes,
        };
      });

      const htmlResponse = `
        <h3>Your Appointments</h3>
        <div class="appointments-list">
          ${appointments
            .map((apt, index) => {
              const therapist = apt.therapistId as unknown as {
                firstName: string;
                lastName: string;
                [key: string]: unknown;
              };
              const statusClass =
                apt.status === 'scheduled'
                  ? 'status-scheduled'
                  : apt.status === 'cancelled'
                    ? 'status-cancelled'
                    : apt.status === 'completed'
                      ? 'status-completed'
                      : 'status-default';
              return `
              <div class="appointment-item">
                <h4>Appointment ${index + 1}</h4>
                <p><strong>Date:</strong> ${new Date(apt.appointmentDate).toLocaleString()}</p>
                <p><strong>Therapist:</strong> Dr. ${therapist.firstName} ${therapist.lastName}</p>
                <p><strong>Duration:</strong> ${apt.duration} minutes</p>
                <p><strong>Status:</strong> <span class="${statusClass}">${apt.status}</span></p>
                ${apt.notes ? `<p><strong>Notes:</strong> ${apt.notes}</p>` : ''}
              </div>
            `;
            })
            .join('')}
        </div>
      `;

      return {
        success: true,
        data: cleanAppointments,
        message: `Found ${appointments.length} appointments`,
        formattedResponse: htmlResponse,
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
      const patientId = this.extractPatientIdFromToken(jwtToken);

      const appointment = await this.appointmentsService.findOne(appointmentId);

      if (appointment.patientId._id.toString() !== patientId) {
        throw new Error('You can only cancel your own appointments');
      }

      await this.appointmentsService.update(appointmentId, {
        status: 'cancelled',
        cancellationReason: cancellationReason || 'Cancelled by patient',
      });

      const therapist = appointment.therapistId as unknown as {
        firstName: string;
        lastName: string;
        [key: string]: unknown;
      };

      const htmlResponse = `
        <div class="cancellation-confirmation">
          <h3>❌ Appointment Cancelled Successfully</h3>
          <div class="cancelled-appointment-details">
            <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleString()}</p>
            <p><strong>Therapist:</strong> Dr. ${therapist.firstName} ${therapist.lastName}</p>
            <p><strong>Reason:</strong> ${cancellationReason || 'Cancelled by patient'}</p>
          </div>
        </div>
      `;

      return {
        success: true,
        message: 'Appointment cancelled successfully',
        formattedResponse: htmlResponse,
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
      const patientId = this.extractPatientIdFromToken(jwtToken);

      const patient = await this.patientsService.findById(patientId);

      const cleanProfile = {
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        dateOfBirth: patient.dateOfBirth,
      };

      const htmlResponse = `
        <div class="patient-profile">
          <h3>👤 Patient Profile</h3>
          <div class="profile-details">
            <p><strong>Name:</strong> ${patient.firstName} ${patient.lastName}</p>
            <p><strong>Email:</strong> ${patient.email}</p>
            <p><strong>Phone:</strong> ${patient.phone || 'Not provided'}</p>
            <p><strong>Address:</strong> ${patient.address || 'Not provided'}</p>
            ${patient.dateOfBirth ? `<p><strong>Date of Birth:</strong> ${new Date(patient.dateOfBirth).toLocaleDateString()}</p>` : ''}
          </div>
        </div>
      `;

      return {
        success: true,
        data: cleanProfile,
        message: 'Profile retrieved successfully',
        formattedResponse: htmlResponse,
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
