export const UserRoutes = {
  CREATE: '/users',
  AUTHENTICATE: '/sessions',
  PROFILE: '/users/:userId',
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
