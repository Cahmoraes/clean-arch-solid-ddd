export const CheckInRoutes = {
	CREATE: "/check-ins",
	LIST: "/check-ins",
	HISTORY: "/check-ins/me",
	MY_STATS: "/check-ins/me/stats",
	STATS: "/check-ins/stats",
	METRICS: "/check-ins/metrics/:userId",
	VALIDATE: "/check-ins/validate",
	REJECT: "/check-ins/reject",
} as const

export type CheckInRoutesType =
	(typeof CheckInRoutes)[keyof typeof CheckInRoutes]
