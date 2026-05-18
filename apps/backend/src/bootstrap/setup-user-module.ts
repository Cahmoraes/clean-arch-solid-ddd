import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { SendPasswordAlertEmailNotification } from "@/user/infra/email/send-password-alert-email.notification"
import type { SendPasswordResetEmailNotification } from "@/user/infra/email/send-password-reset-email.notification"
import type { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification"

import { type ModuleControllers, resolve } from "./server-build"

/**
 * Setup User Module
 * Resolves and returns all user-related controllers
 */

export function setupUserModule(): ModuleControllers {
	const welcomeEmail = resolve<SendWelcomeEmailNotification>(
		USER_TYPES.Notifications.SendWelcomeEmail,
	)
	welcomeEmail.subscribe()

	const passwordAlertEmail = resolve<SendPasswordAlertEmailNotification>(
		USER_TYPES.Notifications.SendPasswordAlertEmail,
	)
	passwordAlertEmail.subscribe()

	const passwordResetEmail = resolve<SendPasswordResetEmailNotification>(
		USER_TYPES.Notifications.SendPasswordResetEmail,
	)
	passwordResetEmail.subscribe()

	const controllers = [
		resolve(USER_TYPES.Controllers.CreateUser),
		resolve(USER_TYPES.Controllers.UserProfile),
		resolve(USER_TYPES.Controllers.UpdateUserProfile),
		resolve(USER_TYPES.Controllers.MyProfile),
		resolve(USER_TYPES.Controllers.UserMetrics),
		resolve(AUTH_TYPES.Controllers.RefreshToken),
		resolve(USER_TYPES.Controllers.ChangePassword),
		resolve(USER_TYPES.Controllers.CreatePasswordReauthGrant),
		resolve(USER_TYPES.Controllers.DefinePassword),
		resolve(USER_TYPES.Controllers.ForgotPassword),
		resolve(USER_TYPES.Controllers.ResetPassword),
		resolve(USER_TYPES.Controllers.FetchUsers),
		resolve(USER_TYPES.Controllers.ActivateUser),
		resolve(USER_TYPES.Controllers.SuspendUser),
		resolve(USER_TYPES.Controllers.PromoteToAdmin),
		resolve(USER_TYPES.Controllers.DemoteFromAdmin),
	]
	return { controllers }
}
