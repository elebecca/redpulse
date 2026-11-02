import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = 'http://localhost:8080/realms/red-pulse';

const jwks = createRemoteJWKSet(
  new URL(
    'http://keycloak:8080/realms/red-pulse/protocol/openid-connect/certs',
  ),
);

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authorization.substring(7);

    try {
      await jwtVerify(token, jwks, {
        issuer,
      });

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
