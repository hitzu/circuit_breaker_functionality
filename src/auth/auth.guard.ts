import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokenService } from '../token/token.service';
import { DecodedTokenDto } from '../token/dto/decode-token.dto';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

interface AuthenticatedRequest extends Request {
  user: DecodedTokenDto;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector,
  ) {}

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      const token = this.extractTokenFromHeader(request);
      if (!token) {
        throw new UnauthorizedException();
      }
      await this.tokenService.verifyToken(token);

      request.user = this.tokenService.decodeToken(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
