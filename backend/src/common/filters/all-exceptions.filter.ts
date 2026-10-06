import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Kode error Prisma yang berarti input dari client salah, bukan server rusak.
 * https://www.prisma.io/docs/orm/reference/error-reference
 */
const PRISMA_CLIENT_ERRORS: Record<string, { status: number; message: string }> = {
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Record not found.' },
  P2001: { status: HttpStatus.NOT_FOUND, message: 'Record not found.' },
  P2002: { status: HttpStatus.CONFLICT, message: 'A record with this value already exists.' },
  P2003: { status: HttpStatus.CONFLICT, message: 'This record is linked to other data.' },
  P2014: { status: HttpStatus.CONFLICT, message: 'This record is linked to other data.' },
  P2000: { status: HttpStatus.BAD_REQUEST, message: 'A value is too long.' },
  P2005: { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' },
  P2006: { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' },
  P2007: { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' },
  P2009: { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' },
  P2011: { status: HttpStatus.BAD_REQUEST, message: 'A required value is missing.' },
  P2012: { status: HttpStatus.BAD_REQUEST, message: 'A required value is missing.' },
  P2019: { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' },
  P2020: { status: HttpStatus.BAD_REQUEST, message: 'A value is out of range.' },
  P2023: { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' },
};

/**
 * Error yang lahir dari input client yang salah bentuk (pentest, lampiran
 * A10): id bukan angka yang sampai ke BigInt(), tanggal atau angka yang tidak
 * valid sampai ke Prisma. Dulu semuanya jadi 500. Pesannya sengaja umum -
 * detail Prisma menyebut nama tabel dan kolom.
 */
function clientError(exception: unknown): { status: number; message: string } | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_CLIENT_ERRORS[exception.code] ?? null;
  }
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return { status: HttpStatus.BAD_REQUEST, message: 'Invalid input.' };
  }
  // BigInt('abc') -> SyntaxError, BigInt(NaN) -> RangeError.
  if ((exception instanceof SyntaxError || exception instanceof RangeError) && /BigInt/.test(exception.message)) {
    return { status: HttpStatus.BAD_REQUEST, message: 'Invalid id.' };
  }
  if (exception instanceof Error && /\[DecimalError\]/.test(exception.message)) {
    return { status: HttpStatus.BAD_REQUEST, message: 'Invalid number.' };
  }
  return null;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const mapped = exception instanceof HttpException ? null : clientError(exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (mapped?.status ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: mapped?.message ?? 'Internal server error' };

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? message : { message }),
    };

    // Stack trace hanya untuk error server; stack trace untuk 4xx hanya
    // menenggelamkan log (pentest N-04). Respons 4xx dari handler sudah dicatat
    // LoggingInterceptor; yang ditolak sebelum sampai ke sana - guard (401 sesi
    // habis, 403 permission), pipe, route tidak ada - dicatat di sini, satu baris.
    if (status >= 500) {
      console.error('--- EXCEPTION DETECTED ---');
      console.error(exception);
      console.error('--------------------------');
    } else if (!(request as any).httpLogged) {
      const reason = (exception as any)?.message ?? '';
      this.logger.warn(`${request.method} ${request.url} ${status} - ${String(reason).slice(0, 200)}`);
    }

    response.status(status).json(errorResponse);
  }
}
