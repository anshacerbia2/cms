import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const delay = Date.now() - now;
          this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms`);
          // Optionally log data in dev
          // console.log('Response Data:', JSON.stringify(data).substring(0, 500));
        },
        error: (err) => {
          const delay = Date.now() - now;
          this.logger.error(`${method} ${url} ${err.status || 500} - ${delay}ms`);
          this.logger.error(`Error details: ${err.message}`);
          if (err.stack) {
            // console.error(err.stack);
          }
        },
      }),
    );
  }
}
