import 'dotenv/config'

import { z } from 'zod'
import { fromError } from 'zod-validation-error'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number(),
  HOST: z.string().default('0.0.0.0'),
  USE_PRISMA: z.string().transform((v) => v === 'true'),
})

const _env = envSchema.safeParse(process.env)

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
