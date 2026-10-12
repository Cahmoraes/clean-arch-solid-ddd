import { z } from "zod"

export const envSchema = z
	.object({
		NODE_ENV: z.enum(["test", "production"]).default("production"),
		PORT: z.coerce.number(),
		HOST: z.string().default("0.0.0.0"),
		PASSWORD_SALT: z.coerce.number().min(10).default(12),
		PRIVATE_KEY: z.string().min(32),
		ITEMS_PER_PAGE: z.coerce.number().default(20),
		CHECK_IN_EXPIRATION_TIME: z.coerce.number().default(20),
		DATABASE_URL: z.string(),
		JWT_EXPIRES_IN: z.string().default("10Min"),
		JWT_REFRESH_EXPIRES_IN: z.string().default("7D"),
		REFRESH_TOKEN_NAME: z.string().default("refreshToken"),
		AMQP_URL: z.url().default("amqp://localhost"),
		REDIS_HOST: z.string().default("127.0.0.1"),
		REDIS_PORT: z.coerce.number().default(6379),
		TTL: z.coerce.number().default(60),
		DIRECT_URL: z.string().optional(),
		GOOGLE_CLIENT_ID: z.string().optional(),
		GOOGLE_CLIENT_SECRET: z.string().optional(),
		GOOGLE_REDIRECT_URI: z.string().optional(),
		CORS_ORIGINS: z.string().optional(),
		FRONTEND_URL: z.url().default("http://localhost:3000"),
		UPLOAD_DIR: z.string().default("uploads"),
		CRON_TIME_TO_UPDATE_CACHE: z.string().default("0 * * * *"),
		STRIPE_PUBLIC_KEY: z.string(),
		STRIPE_PRIVATE_KEY: z.string(),
		STRIPE_PRICE_ID: z.string(),
		STRIPE_WEBHOOK_SECRET: z.string(),
		DATABASE_PROVIDER: z.enum(["prisma", "sqlite", "mongo"]).default("prisma"),
		DATABASE_URL_MONGO: z.string().optional(),
		SUBSCRIPTION_GATEWAY: z.enum(["stripe", "testing"]).default("stripe"),
		GOOGLE_AUTH_PROVIDER: z.enum(["google", "in-memory"]).default("google"),
	})
	.superRefine((value, ctx) => {
		if (value.DATABASE_PROVIDER === "mongo" && !value.DATABASE_URL_MONGO) {
			ctx.addIssue({
				code: "custom",
				path: ["DATABASE_URL_MONGO"],
				message:
					"DATABASE_URL_MONGO é obrigatório quando DATABASE_PROVIDER=mongo",
			})
		}
	})
