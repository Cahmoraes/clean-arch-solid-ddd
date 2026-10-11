import { config } from "dotenv"
import { fromError } from "zod-validation-error"
import { envSchema } from "./env-schema"

config({
	quiet: true,
})

const _env = envSchema.safeParse(process.env)
if (!_env.success) {
	const validationError = fromError(_env.error)
	console.error(validationError.toString())
	throw new Error("Invalid environment variables ❌")
}

const env = _env.data

export { env }

export function isDevelopment(): boolean {
	return env.NODE_ENV === "test"
}

export function isProduction(): boolean {
	return env.NODE_ENV === "production"
}

export function isMongoEnabled(): boolean {
	return isProduction() && env.DATABASE_PROVIDER === "mongo"
}
