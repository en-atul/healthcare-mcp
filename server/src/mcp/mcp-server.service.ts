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
        id: t._id ? t._id.toString() : 'unknown',
        firstName: t.firstName,
        lastName: t.lastName,
        specialization: t.specialization,
        experience: t.experience,
        rating: t.rating,
        email: t.email,
      }));

      return {
        success: true,
        data: cleanTherapists,
        message: `Found ${therapists.length} therapists`,
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
        id: appointment._id ? appointment._id.toString() : 'unknown',
        date: appointment.appointmentDate,
        duration: appointment.duration,
        status: appointment.status,
        therapistName: therapist
          ? `Dr. ${therapist.firstName} ${therapist.lastName}`
          : 'Unknown Therapist',
        therapistId: therapistId,
        notes: appointment.notes,
      };

      return {
        success: true,
        data: cleanAppointment,
        message: 'Appointment booked successfully',
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
        };
      }

      const cleanAppointments = appointments.map((apt) => {
        const therapist = apt.therapistId as unknown as {
          firstName: string;
          lastName: string;
          [key: string]: unknown;
        };
        return {
          id: apt._id ? apt._id.toString() : 'unknown',
          date: apt.appointmentDate,
          duration: apt.duration,
          status: apt.status,
          therapistName: `Dr. ${therapist.firstName} ${therapist.lastName}`,
          therapistId: apt.therapistId,
          notes: apt.notes,
        };
      });

      return {
        success: true,
        data: cleanAppointments,
        message: `Found ${appointments.length} appointments`,
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

      if (
        appointment.patientId._id &&
        appointment.patientId._id.toString() !== patientId
      ) {
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

      const cancelledAppointment = {
        id: appointment._id ? appointment._id.toString() : 'unknown',
        date: appointment.appointmentDate,
        therapistName: `Dr. ${therapist.firstName} ${therapist.lastName}`,
        cancellationReason: cancellationReason || 'Cancelled by patient',
        status: 'cancelled',
      };

      return {
        success: true,
        data: cancelledAppointment,
        message: 'Appointment cancelled successfully',
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
        id: patient._id ? patient._id.toString() : 'unknown',
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        address: patient.address,
        dateOfBirth: patient.dateOfBirth,
      };

      return {
        success: true,
        data: cleanProfile,
        message: 'Profile retrieved successfully',
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
