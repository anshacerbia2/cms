import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    
    // 1. Primitive handling
    if (typeof data === 'bigint') return data.toString();
    if (typeof data === 'number') return data;
    if (typeof data === 'string') return data;
    if (typeof data === 'boolean') return data;

    // 2. Specialized Object handling
    if (data instanceof Date) return data.toISOString();
    
    // Prisma Decimal detection (Duck Typing / Structure Check)
    const isDecimal = data && typeof data === 'object' && 
      (typeof data.toNumber === 'function' || ('d' in data && 's' in data && 'e' in data));

    if (isDecimal) {
      if (typeof data.toFixed === 'function') {
        return data.toFixed(4);
      }
      if (typeof data.toString === 'function' && data.toString() !== '[object Object]') {
        return data.toString();
      }
      return String(data);
    }
    
    // 3. Recursive handling
    if (Array.isArray(data)) return data.map((item) => this.transformBigInt(item));
    
    if (typeof data === 'object') {
      // Don't recurse into specialized objects we don't know
      const constructorName = data.constructor?.name;
      if (constructorName && !['Object', 'Array'].includes(constructorName)) {
        return data;
      }

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
