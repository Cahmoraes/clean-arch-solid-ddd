import type { FastifyInstance, FastifyRequest } from "fastify"
import IORedis from "ioredis"

import { env } from "@/shared/infra/env/index.js"
import type { Logger } from "@/shared/infra/logger/logger.js"
import { EXCHANGES } from "@/shared/infra/queue/exchanges.js"
import type { Queue } from "@/shared/infra/queue/queue.js"

import {
	RATE_LIMIT_CONFIG,
	type RateLimitExceededEvent,
} from "./rate-limit-config.js"

export class RateLimitPlugin {
	private static redisClient: IORedis | null = null

	public static async register(
		server: FastifyInstance,
		logger: Logger,
		queue: Queue,
	): Promise<void> {
		const isTestEnv = env.NODE_ENV === "test"

		const { default: fastifyRateLimit } = await import("@fastify/rate-limit")

		const redisOptions = isTestEnv
			? undefined
			: (() => {
					RateLimitPlugin.redisClient = new IORedis({
						host: env.REDIS_HOST,
						port: env.REDIS_PORT,
						enableOfflineQueue: false,
						maxRetriesPerRequest: null,
					})
					return RateLimitPlugin.redisClient
				})()

		await server.register(fastifyRateLimit, {
			global: true,
			max: isTestEnv
				? Number.POSITIVE_INFINITY
				: RateLimitPlugin.createMaxFunction(),
			timeWindow: RATE_LIMIT_CONFIG.GENERAL.TIME_WINDOW,
			hook: "preHandler",
			keyGenerator: RateLimitPlugin.createKeyGenerator(),
			skipOnError: true,
			nameSpace: RATE_LIMIT_CONFIG.REDIS_NAMESPACE,
			...(redisOptions ? { redis: redisOptions } : {}),
			onExceeded: RateLimitPlugin.createOnExceededCallback(logger, queue),
		})
	}

	public static createKeyGenerator(): (request: FastifyRequest) => string {
		return (request: FastifyRequest): string => {
			try {
				if (request.user?.sub?.id) {
					return request.user.sub.id
				}
			} catch {
				// request.user may not exist for unauthenticated routes
			}
			return request.ip
		}
	}

	public static createMaxFunction(): (
		request: FastifyRequest,
		key: string,
	) => number {
		return (request: FastifyRequest, _key: string): number => {
			try {
				if (request.user?.sub?.role === "ADMIN") {
					return RATE_LIMIT_CONFIG.GENERAL.MAX_ADMIN
				}
			} catch {
				// request.user may not exist
			}
			return RATE_LIMIT_CONFIG.GENERAL.MAX_MEMBER
		}
	}

	public static createOnExceededCallback(
		logger: Logger,
		queue: Queue,
	): (request: FastifyRequest, key: string) => void {
		return (request: FastifyRequest, _key: string): void => {
			let userId: string | undefined
			let role: string | undefined
			try {
				userId = request.user?.sub?.id
				role = request.user?.sub?.role
			} catch {
				// may not exist
			}
			const event: RateLimitExceededEvent = {
				ip: request.ip,
				route: request.url,
				method: request.method,
				userId,
				role,
				timestamp: new Date().toISOString(),
			}
			logger.warn(RateLimitPlugin, event)
			queue.publish(EXCHANGES.RATE_LIMIT_EXCEEDED, event).catch(() => {
				// best-effort: silently ignore publish failures
			})
		}
	}

	public static async disconnect(): Promise<void> {
		if (RateLimitPlugin.redisClient) {
			try {
				await RateLimitPlugin.redisClient.quit()
			} catch {
				// ignore disconnect errors
			}
			RateLimitPlugin.redisClient = null
		}
	}
}
