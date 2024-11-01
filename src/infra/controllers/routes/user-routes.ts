export const UserRoutes = {
  CREATE_USER: '/users',
  AUTHENTICATE: '/authenticate',
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
