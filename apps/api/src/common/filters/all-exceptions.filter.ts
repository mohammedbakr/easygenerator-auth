import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

/** Single error shape for every response; 5xx details are logged, never sent to the client. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      message: statusCode >= 500 ? 'Internal server error' : this.messageOf(exception),
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(body);
  }

  private messageOf(exception: unknown): string | string[] {
    if (!(exception instanceof HttpException)) return 'Internal server error';
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string' || Array.isArray(message)) return message as string | string[];
    return exception.message;
  }
}
