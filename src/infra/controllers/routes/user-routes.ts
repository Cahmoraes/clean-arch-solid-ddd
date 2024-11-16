export const UserRoutes = {
  CREATE: '/users',
  AUTHENTICATE: '/sessions',
  PROFILE: '/users/:userId',
  ME: '/users/me',
  METRICS: '/users/me/metrics',
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
