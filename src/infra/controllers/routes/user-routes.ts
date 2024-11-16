export const UserRoutes = {
  CREATE: '/users',
  AUTHENTICATE: '/sessions',
  PROFILE: '/users/:userId',
  ME: '/users/me',
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
