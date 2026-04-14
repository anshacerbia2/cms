import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    // User object in request comes from JwtStrategy.validate()
    // We need to ensure the user has the required permissions.
    // Note: In a real world expert app, we might want to re-fetch permissions from DB or cache (Redis)
    // but for now we assume they are injected or we'll add a database check here.

    const userPermissions = user.permissions || []; // This needs to be populated by the Auth middleware/strategy
    
    const hasPermission = requiredPermissions.some((permission) => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
