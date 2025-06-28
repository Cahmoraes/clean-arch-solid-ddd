import 'dotenv/config'

import { z } from 'zod'
import { fromError } from 'zod-validation-error'

const envSchema = z.object({
  NODE_ENV: z.enum(['test', 'production']).default('production'),
  PORT: z.coerce.number(),
  HOST: z.string().default('0.0.0.0'),
  USE_PRISMA: z.string().transform((v) => v === 'true'),
  PASSWORD_SALT: z.coerce.number().default(2),
  PRIVATE_KEY: z.string().default('private-key-example'),
  ITEMS_PER_PAGE: z.coerce.number().default(20),
  CHECK_IN_EXPIRATION_TIME: z.coerce.number().default(20),
  DATABASE_URL: z.string(),
  JWT_EXPIRES_IN: z.string().default('10Min'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7D'),
  REFRESH_TOKEN_NAME: z.string().default('refreshToken'),
  AMQP_URL: z.string().url().default('amqp://localhost'),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  TTL: z.coerce.number().default(60),
  DIRECT_URL: z.string().optional(),
  CRON_TIME_TO_UPDATE_CACHE: z.string(),
})

const _env = envSchema.safeParse(process.env)
if (!_env.success) {
  const validationError = fromError(_env.error)
  console.error(validationError.toString())
  throw new Error('Invalid environment variables ❌')
}

const env = _env.data

export { env }

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'test'
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}
