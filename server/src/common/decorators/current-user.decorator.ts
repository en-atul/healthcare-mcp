import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser, AuthenticatedRequest } from '../auth.utils';

/**
 * Custom decorator to extract the current authenticated user
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);

/**
 * Custom decorator to extract the patient ID from the current user
 * Usage: @CurrentPatientId() patientId: string
 */
export const CurrentPatientId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    const patientId = user.sub || user.userId;

    if (!patientId) {
      throw new Error('Patient ID not found in token');
    }

    return patientId;
  },
);
