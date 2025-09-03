import { z } from 'zod';

export const BookAppointmentSchema = z.object({
  therapistId: z.string(),
  appointmentDate: z.string(),
  duration: z.number().min(15).max(180),
  notes: z.string().optional(),
});

export const ListAppointmentsSchema = z.object({
  patientId: z.string(),
});

export const CancelAppointmentSchema = z.object({
  appointmentId: z.string(),
  cancellationReason: z.string().optional(),
});
