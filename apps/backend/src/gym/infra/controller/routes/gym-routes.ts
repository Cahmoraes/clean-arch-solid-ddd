export const GymRoutes = {
	CREATE: "/gyms",
	LIST: "/gyms",
	GET: "/gyms/:gymId",
	UPDATE: "/gyms/:gymId",
	UPLOAD_IMAGE: "/gyms/:gymId/image",
	SEARCH: "/gyms/search/:name",
} as const

export type GymRoutesTypes = (typeof GymRoutes)[keyof typeof GymRoutes]
