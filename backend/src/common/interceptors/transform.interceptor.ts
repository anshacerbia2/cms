import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const status = context.switchToHttp().getResponse().statusCode;
    return next.handle().pipe(
      map((data) => ({
        data: this.transformBigInt(data),
        statusCode: status,
      })),
    );
  }

  private transformBigInt(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data === 'bigint') return data.toString();
    if (Array.isArray(data)) return data.map((item) => this.transformBigInt(item));
    if (typeof data === 'object') {
      const obj: Record<string, any> = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          obj[key] = this.transformBigInt(data[key]);
        }
      }
      return obj;
    }
    return data;
  }
}
