import fastifyRateLimit from "@fastify/rate-limit"
import type { FastifyInstance, FastifyRequest } from "fastify"
import IORedis from "ioredis"
import { env, isDevelopment } from "@/shared/infra/env/index.js"
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
		await server.register(fastifyRateLimit, {
			global: true,
			max: isDevelopment()
				? Number.POSITIVE_INFINITY
				: RateLimitPlugin.createMaxFunction(),
			timeWindow: RATE_LIMIT_CONFIG.GENERAL.TIME_WINDOW,
			hook: "preHandler",
			keyGenerator: RateLimitPlugin.createKeyGenerator(),
			skipOnError: true,
			nameSpace: RATE_LIMIT_CONFIG.REDIS_NAMESPACE,
			redis: RateLimitPlugin.createRedisClientOrUndefined(),
			onExceeded: RateLimitPlugin.createOnExceededCallback(logger, queue),
		})
	}

	private static createRedisClientOrUndefined(): IORedis | undefined {
		if (isDevelopment()) return undefined
		RateLimitPlugin.redisClient = new IORedis({
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			enableOfflineQueue: false,
			maxRetriesPerRequest: null,
		})
		return RateLimitPlugin.redisClient
	}

	public static createKeyGenerator(): (request: FastifyRequest) => string {
		return (request: FastifyRequest): string => {
			if (request.user?.sub?.id) {
				return request.user.sub.id
			}
			return request.ip
		}
	}

	public static createMaxFunction(): (
		request: FastifyRequest,
		key: string,
	) => number {
		return (request: FastifyRequest, _key: string): number => {
			if (request.user?.sub?.role === "ADMIN") {
				return RATE_LIMIT_CONFIG.GENERAL.MAX_ADMIN
			}
			return RATE_LIMIT_CONFIG.GENERAL.MAX_MEMBER
		}
	}

	public static createOnExceededCallback(
		logger: Logger,
		queue: Queue,
	): (request: FastifyRequest, key: string) => void {
		return (request: FastifyRequest, _key: string): void => {
			const userId = request.user?.sub?.id
			const role = request.user?.sub?.role
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
