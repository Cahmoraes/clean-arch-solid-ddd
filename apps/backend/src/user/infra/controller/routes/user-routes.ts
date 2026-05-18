const PREFIX = "/users"

export const UserRoutes = {
	CREATE: PREFIX,
	FETCH: PREFIX,
	PROFILE: `${PREFIX}/:userId`,
	ME: `${PREFIX}/me`,
	METRICS: `${PREFIX}/me/metrics`,
	CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
	PASSWORD_REAUTH: `${PREFIX}/me/password/reauth`,
	PASSWORD: `${PREFIX}/me/password`,
	FORGOT_PASSWORD: "/password/forgot",
	RESET_PASSWORD: "/password/reset",
	ACTIVATE_USER: `${PREFIX}/activate`,
	SUSPEND_USER: `${PREFIX}/suspend`,
	PROMOTE_TO_ADMIN: `${PREFIX}/promote-admin`,
	DEMOTE_FROM_ADMIN: `${PREFIX}/demote-admin`,
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
