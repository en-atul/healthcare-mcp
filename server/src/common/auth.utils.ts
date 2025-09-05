import { Request } from 'express';

/**
 * Interface for the JWT payload structure
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Interface for the user object in the request
 */
export interface AuthenticatedUser extends JwtPayload {
  userId?: string;
  [key: string]: unknown;
}

/**
 * Interface for request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
