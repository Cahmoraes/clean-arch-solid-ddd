import { config } from 'dotenv'
import { z } from 'zod'
import { fromError } from 'zod-validation-error'

const envObject = config({
  path: process.env.NODE_ENV === 'test' ? '.env.development' : '.env',
}).parsed

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number(),
  HOST: z.string().default('0.0.0.0'),
  USE_PRISMA: z.string().transform((v) => v === 'true'),
  PASSWORD_SALT: z.coerce.number().default(2),
  PRIVATE_KEY: z.string(),
  ITEMS_PER_PAGE: z.coerce.number().default(20),
  CHECK_IN_EXPIRATION_TIME: z.coerce.number().default(20),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().default('jwt-secret-example'),
  JWT_EXPIRES_IN: z.string().default('10m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_NAME: z.string().default('refresh_token'),
})

const _env = envSchema.safeParse(envObject)
if (!_env.success) {
  const validationError = fromError(_env.error)
  console.error(validationError.toString())
  throw new Error('Invalid environment variables ❌')
}

const env = _env.data

export { env }

export function isDevelopment() {
  return env.NODE_ENV === 'development'
}

export function isProduction() {
  return env.NODE_ENV === 'production'
}
