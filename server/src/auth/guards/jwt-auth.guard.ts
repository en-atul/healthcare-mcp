import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import {
  AuthenticatedUser,
  AuthenticatedRequest,
  JwtPayload,
} from '../../common/auth.utils';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Validate that the payload has the required structure
      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Ensure the payload has the required fields
      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException(
          'Invalid token: missing required fields',
        );
      }

      // Create the authenticated user object
      const user: AuthenticatedUser = {
        ...payload,
        userId: payload.sub, // For backward compatibility
      };

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
