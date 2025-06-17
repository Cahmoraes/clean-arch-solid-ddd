const PREFIX = '/users'

export const UserRoutes = {
  CREATE: PREFIX,
  FETCH: PREFIX,
  PROFILE: `${PREFIX}/:userId`,
  ME: `${PREFIX}/me`,
  METRICS: `${PREFIX}/me/metrics`,
  CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
  ACTIVATE_USER: `${PREFIX}/activate`,
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
