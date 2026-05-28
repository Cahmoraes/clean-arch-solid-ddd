import { ContainerModule } from "inversify"
import { RefreshTokenController } from "@/session/infra/controller/refresh-token.controller"
import { PgUserRepository } from "@/shared/infra/database/repository/pg/pg-user-repository"
import { SQLiteUserRepository } from "@/shared/infra/database/repository/sqlite/sqlite-user-repository"
import { ActiveUserUseCase } from "@/user/application/use-case/active-user.usecase"
import { ChangePasswordUseCase } from "@/user/application/use-case/change-password.usecase"
import { CreatePasswordReauthGrantUseCase } from "@/user/application/use-case/create-password-reauth-grant.usecase"
import { CreateUserUseCase } from "@/user/application/use-case/create-user.usecase"
import { DefinePasswordUseCase } from "@/user/application/use-case/define-password.usecase"
import { DeleteUserUseCase } from "@/user/application/use-case/delete-user.usecase"
import { DemoteFromAdminUseCase } from "@/user/application/use-case/demote-from-admin.usecase"
import { FetchUsersUseCase } from "@/user/application/use-case/fetch-users.usecase"
import { ForgotPasswordUseCase } from "@/user/application/use-case/forgot-password.usecase"
import { GetUserStatsUseCase } from "@/user/application/use-case/get-user-stats.usecase"
import { PromoteToAdminUseCase } from "@/user/application/use-case/promote-to-admin.usecase"
import { ResetPasswordUseCase } from "@/user/application/use-case/reset-password.usecase"
import { SuspendUserUseCase } from "@/user/application/use-case/suspend-user.usecase"
import { UpdateMyProfileUseCase } from "@/user/application/use-case/update-my-profile.usecase"
import { UpdateUserProfileUseCase } from "@/user/application/use-case/update-user-profile.usecase"
import { UserMetricsUseCase } from "@/user/application/use-case/user-metrics.usecase"
import { UserProfileUseCase } from "@/user/application/use-case/user-profile.usecase"
import { ActivateUserController } from "@/user/infra/controller/activate-user.controller"
import { ChangePasswordController } from "@/user/infra/controller/change-password.controller"
import { CreatePasswordReauthGrantController } from "@/user/infra/controller/create-password-reauth-grant.controller"
import { CreateUserController } from "@/user/infra/controller/create-user.controller"
import { DefinePasswordController } from "@/user/infra/controller/define-password.controller"
import { DemoteFromAdminController } from "@/user/infra/controller/demote-from-admin.controller"
import { FetchUsersController } from "@/user/infra/controller/fetch-users.controller"
import { ForgotPasswordController } from "@/user/infra/controller/forgot-password.controller"
import { GetUserStatsController } from "@/user/infra/controller/get-user-stats.controller"
import { MyProfileController } from "@/user/infra/controller/my-profile.controller"
import { PromoteToAdminController } from "@/user/infra/controller/promote-to-admin.controller"
import { ResetPasswordController } from "@/user/infra/controller/reset-password.controller"
import { SuspendUserController } from "@/user/infra/controller/suspend-user.controller"
import { UpdateMyProfileController } from "@/user/infra/controller/update-my-profile.controller"
import { UpdateUserProfileController } from "@/user/infra/controller/update-user-profile.controller"
import { UserMetricsController } from "@/user/infra/controller/user-metrics.controller"
import { UserProfileController } from "@/user/infra/controller/user-profile.controller"
import { SendAccountLockedEmailNotification } from "@/user/infra/email/send-account-locked-email.notification"
import { SendPasswordAlertEmailNotification } from "@/user/infra/email/send-password-alert-email.notification"
import { SendPasswordResetEmailNotification } from "@/user/infra/email/send-password-reset-email.notification"
import { SendWelcomeEmailNotification } from "@/user/infra/email/send-welcome-email.notification"
import { RedisLoginAttemptStore } from "@/user/infra/gateway/redis-login-attempt-store"
import { RedisPasswordResetTokenStore } from "@/user/infra/gateway/redis-password-reset-token-store"
import { AUTH_TYPES, USER_TYPES } from "../../types"
import { UserDAOProvider } from "./user-dao-provider"
import { UserRepositoryProvider } from "./user-repository-provider"

export const userModule = new ContainerModule(({ bind }) => {
	bind(USER_TYPES.Repositories.User)
		.toDynamicValue(UserRepositoryProvider.provide)
		.inSingletonScope()
	bind(USER_TYPES.PG.User).to(PgUserRepository).inRequestScope()
	bind(USER_TYPES.DAO.User)
		.toDynamicValue(UserDAOProvider.provide)
		.inSingletonScope()
	bind(USER_TYPES.Gateways.PasswordResetTokenStore)
		.to(RedisPasswordResetTokenStore)
		.inSingletonScope()
	bind(USER_TYPES.Gateways.LoginAttemptStore)
		.to(RedisLoginAttemptStore)
		.inSingletonScope()
	bind(USER_TYPES.Controllers.CreateUser).to(CreateUserController)
	bind(USER_TYPES.Controllers.UserProfile).to(UserProfileController)
	bind(USER_TYPES.Controllers.MyProfile).to(MyProfileController)
	bind(USER_TYPES.Controllers.UpdateMyProfile).to(UpdateMyProfileController)
	bind(USER_TYPES.Controllers.UserMetrics).to(UserMetricsController)
	bind(AUTH_TYPES.Controllers.RefreshToken).to(RefreshTokenController)
	bind(USER_TYPES.Controllers.ChangePassword).to(ChangePasswordController)
	bind(USER_TYPES.Controllers.CreatePasswordReauthGrant).to(
		CreatePasswordReauthGrantController,
	)
	bind(USER_TYPES.Controllers.DefinePassword).to(DefinePasswordController)
	bind(USER_TYPES.Controllers.ForgotPassword).to(ForgotPasswordController)
	bind(USER_TYPES.Controllers.ResetPassword).to(ResetPasswordController)
	bind(USER_TYPES.Controllers.FetchUsers).to(FetchUsersController)
	bind(USER_TYPES.Controllers.GetUserStats).to(GetUserStatsController)
	bind(USER_TYPES.Controllers.UpdateUserProfile).to(UpdateUserProfileController)
	bind(USER_TYPES.UseCases.CreateUser).to(CreateUserUseCase)
	bind(USER_TYPES.UseCases.UserProfile).to(UserProfileUseCase)
	bind(USER_TYPES.UseCases.UserMetrics).to(UserMetricsUseCase)
	bind(USER_TYPES.UseCases.GetUserStats).to(GetUserStatsUseCase)
	bind(USER_TYPES.UseCases.ChangePassword).to(ChangePasswordUseCase)
	bind(USER_TYPES.UseCases.CreatePasswordReauthGrant).to(
		CreatePasswordReauthGrantUseCase,
	)
	bind(USER_TYPES.UseCases.DefinePassword).to(DefinePasswordUseCase)
	bind(USER_TYPES.UseCases.ForgotPassword).to(ForgotPasswordUseCase)
	bind(USER_TYPES.UseCases.ResetPassword).to(ResetPasswordUseCase)
	bind(USER_TYPES.UseCases.FetchUsers).to(FetchUsersUseCase)
	bind(USER_TYPES.UseCases.UpdateMyProfile).to(UpdateMyProfileUseCase)
	bind(USER_TYPES.UseCases.UpdateUserProfile).to(UpdateUserProfileUseCase)
	bind(USER_TYPES.UseCases.SuspendUser).to(SuspendUserUseCase)
	bind(USER_TYPES.UseCases.PromoteToAdmin).to(PromoteToAdminUseCase)
	bind(USER_TYPES.UseCases.DemoteFromAdmin).to(DemoteFromAdminUseCase)
	bind(USER_TYPES.UseCases.ActivateUser).to(ActiveUserUseCase)
	bind(USER_TYPES.Controllers.ActivateUser).to(ActivateUserController)
	bind(USER_TYPES.Controllers.SuspendUser).to(SuspendUserController)
	bind(USER_TYPES.Controllers.PromoteToAdmin).to(PromoteToAdminController)
	bind(USER_TYPES.Controllers.DemoteFromAdmin).to(DemoteFromAdminController)
	bind(USER_TYPES.UseCases.DeleteUser).to(DeleteUserUseCase)
	bind(SQLiteUserRepository).toSelf()
	bind(USER_TYPES.Notifications.SendWelcomeEmail)
		.to(SendWelcomeEmailNotification)
		.inSingletonScope()
	bind(USER_TYPES.Notifications.SendPasswordAlertEmail)
		.to(SendPasswordAlertEmailNotification)
		.inSingletonScope()
	bind(USER_TYPES.Notifications.SendPasswordResetEmail)
		.to(SendPasswordResetEmailNotification)
		.inSingletonScope()
	bind(USER_TYPES.Notifications.SendAccountLockedEmail)
		.to(SendAccountLockedEmailNotification)
		.inSingletonScope()
})
