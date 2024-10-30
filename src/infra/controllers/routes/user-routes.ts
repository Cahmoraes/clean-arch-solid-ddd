export const UserRoutes = {
  CREATE_USER: '/users',
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
