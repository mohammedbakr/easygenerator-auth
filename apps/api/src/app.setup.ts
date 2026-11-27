import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/errors/validation-exception.factory.js';
import { AppConfigService } from './config/app-config.service.js';

/** HTTP setup shared by `main.ts` and the e2e tests, so tests exercise the real pipeline. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfigService);

  // Without this, behind nginx every request looks like it comes from nginx's IP, and the rate
  // limiter would count all users as one client. `1` = trust exactly one proxy hop.
  if (config.get('TRUST_PROXY')) {
    app.set('trust proxy', 1);
  }

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGIN'), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableShutdownHooks();
}
