const PREFIX = "/sessions"

export const SessionRoutes = {
	AUTHENTICATE: PREFIX,
	AUTHENTICATE_GOOGLE: `${PREFIX}/google`,
	DEV_GOOGLE_TOKEN: `${PREFIX}/google/dev-token`,
	REFRESH: `${PREFIX}/refresh`,
	LOGOUT: `${PREFIX}/logout`,
} as const

export type SessionRoutes = (typeof SessionRoutes)[keyof typeof SessionRoutes]
