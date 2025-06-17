const PREFIX = '/sessions'

export const SessionRoutes = {
  AUTHENTICATE: PREFIX,
  REFRESH: `${PREFIX}/refresh`,
} as const

export type SessionRoutes = (typeof SessionRoutes)[keyof typeof SessionRoutes]
