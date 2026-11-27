import { z } from 'zod';

/** z.coerce.boolean() treats the string "false" as true, so parse the two strings explicitly. */
const boolString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGO_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// URI'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
    CORS_ORIGIN: z.url(),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),
    // Behind a reverse proxy (nginx), trust its X-Forwarded-For so req.ip is the real client.
    TRUST_PROXY: boolString.default(false),
    // Defaults to true in production. Set false only for a plain-http run: Safari drops Secure
    // cookies on http://localhost.
    COOKIE_SECURE: boolString.optional(),
  })
  .refine((env) => env.JWT_ACCESS_SECRET !== env.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ',
    path: ['JWT_REFRESH_SECRET'],
  })
  .transform((env) => ({ ...env, COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === 'production' }));

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: throws on invalid env so the app refuses to start. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
