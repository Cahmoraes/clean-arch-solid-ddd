export const RATE_LIMIT_CONFIG = {
	AUTH: {
		MAX_MEMBER: 20,
		MAX_ADMIN: 200,
		TIME_WINDOW: 15 * 60 * 1000, // 15 minutes in ms
	},
	GENERAL: {
		MAX_MEMBER: 100,
		MAX_ADMIN: 1000,
		TIME_WINDOW: 15 * 60 * 1000, // 15 minutes in ms
	},
	FORGOT_PASSWORD: {
		MAX: 5,
		TIME_WINDOW: 15 * 60 * 1000, // 15 minutes in ms
		EMAIL_MAX: 3,
		EMAIL_TIME_WINDOW_SECONDS: 60 * 60, // 1 hour in seconds for Redis TTL
	},
	// Per-route admin limit = route baseMax * ADMIN_MULTIPLIER.
	ADMIN_MULTIPLIER: 10,
	REDIS_NAMESPACE: "rl:",
} as const

export interface RateLimitRouteConfig {
	max?: number | ((request: any, key: string) => number)
	timeWindow?: string | number
}

export interface RateLimitExceededEvent {
	ip: string
	route: string
	method: string
	userId?: string
	role?: string
	timestamp: string
}
