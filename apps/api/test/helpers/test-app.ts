import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';

export interface TestApp {
  app: NestExpressApplication;
  close: () => Promise<void>;
}

// Every setting is explicit so a developer's local .env can never leak into the tests.
// These secrets are throw-away test values, not real ones.
const BASE_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef-aaaaaaaa',
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef-bbbbbbb',
  JWT_ACCESS_TTL_SECONDS: '900',
  JWT_REFRESH_TTL_SECONDS: '604800',
  RATE_LIMIT_PER_MINUTE: '1000',
  AUTH_RATE_LIMIT_PER_MINUTE: '1000',
};

/**
 * Boots the real AppModule against an in-memory MongoDB. The env is set before AppModule is
 * imported because ConfigModule reads it when the module is first loaded; each spec file gets a
 * fresh module graph, so files can use different `overrides`.
 */
export async function createTestApp(overrides: Record<string, string> = {}): Promise<TestApp> {
  const mongo = await MongoMemoryServer.create();
  Object.assign(process.env, BASE_ENV, { MONGO_URI: mongo.getUri('auth-e2e') }, overrides);

  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } = await import('../../src/app.setup.js');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return {
    app,
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}
