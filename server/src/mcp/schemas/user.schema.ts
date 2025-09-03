import { z } from 'zod';

export const GetProfileSchema = z.object({
  patientId: z.string(),
});
