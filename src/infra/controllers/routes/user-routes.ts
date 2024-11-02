export const UserRoutes = {
  CREATE_USER: '/users',
  AUTHENTICATE: '/sessions',
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
