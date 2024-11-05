export const GymRoutes = {
  CREATE: '/gyms',
  GET: '/gyms/:gymId',
} as const

export type GymRoutesTypes = (typeof GymRoutes)[keyof typeof GymRoutes]
