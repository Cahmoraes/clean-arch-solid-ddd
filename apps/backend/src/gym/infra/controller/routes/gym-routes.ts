export const GymRoutes = {
	CREATE: "/gyms",
	LIST: "/gyms",
	GET: "/gyms/:gymId",
	SEARCH: "/gyms/search/:name",
} as const

export type GymRoutesTypes = (typeof GymRoutes)[keyof typeof GymRoutes]
