import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppConfigService } from '../config/app-config.service.js';

const REQUEST_ID_HEADER = 'x-request-id';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const env = config.get('NODE_ENV');
        return {
          pinoHttp: {
            level: env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug',
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const incoming = req.headers[REQUEST_ID_HEADER];
              const id = typeof incoming === 'string' && incoming ? incoming : randomUUID();
              res.setHeader(REQUEST_ID_HEADER, id);
              return id;
            },
            redact: {
              paths: [
                'req.headers.cookie',
                'req.headers.authorization',
                'res.headers["set-cookie"]',
                '*.password',
                '*.passwordHash',
                '*.refreshTokenHash',
              ],
              censor: '[REDACTED]',
            },
            // Keep request logs short: who/what/result. Headers stay out of logs entirely.
            serializers: {
              req: (req: { id: string; method: string; url: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
              }),
              res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
            },
            autoLogging: { ignore: (req: IncomingMessage) => req.url === '/api/health' },
            transport:
              env === 'development'
                ? {
                    target: 'pino-pretty',
                    options: {
                      singleLine: true,
                      translateTime: 'SYS:HH:MM:ss',
                      ignore: 'pid,hostname',
                    },
                  }
                : undefined,
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
