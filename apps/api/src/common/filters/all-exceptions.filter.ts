import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { FieldError } from '../errors/validation-exception.factory.js';

export interface ErrorResponseBody {
  statusCode: number;
  /** Always one human-readable string. */
  message: string;
  /** Per-field details (validation, duplicate email). Absent for 401/429 and 5xx. */
  errors?: FieldError[];
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

    const errors = statusCode >= 500 ? undefined : this.fieldErrorsOf(exception);
    const body: ErrorResponseBody = {
      statusCode,
      message: statusCode >= 500 ? 'Internal server error' : this.messageOf(exception),
      ...(errors && { errors }),
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(body);
  }

  private messageOf(exception: unknown): string {
    if (!(exception instanceof HttpException)) return 'Internal server error';
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('. ');
    return exception.message;
  }

  private fieldErrorsOf(exception: unknown): FieldError[] | undefined {
    if (!(exception instanceof HttpException)) return undefined;
    const response = exception.getResponse();
    if (typeof response === 'string') return undefined;
    const { errors } = response as { errors?: unknown };
    return Array.isArray(errors) ? (errors as FieldError[]) : undefined;
  }
}
