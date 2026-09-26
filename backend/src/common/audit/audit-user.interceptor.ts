import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext } from './audit-context';

/**
 * Melengkapi konteks activity log dengan user yang login. Interceptor berjalan
 * sesudah guard, jadi di sini `req.user` sudah diisi oleh strategi JWT.
 */
@Injectable()
export class AuditUserInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const store = auditContext.getStore();
    const user = context.switchToHttp().getRequest()?.user;
    if (store && user) {
      store.userId = user.userId;
      store.email = user.email;
    }
    return next.handle();
  }
}
