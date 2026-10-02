import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? message : { message }),
    };

    // Stack trace hanya untuk error server. Respons 4xx (validasi, 401, 429
    // login) sudah dicatat oleh LoggingInterceptor dan kejadian login oleh
    // SecurityEvents; stack trace-nya hanya menenggelamkan log (pentest N-04).
    if (status >= 500) {
      console.error('--- EXCEPTION DETECTED ---');
      console.error(exception);
      console.error('--------------------------');
    }

    response.status(status).json(errorResponse);
  }
}
