import { ContainerModule } from "inversify"

import { RefreshTokenController } from "@/session/infra/controller/refresh-token.controller"
import { PgUserRepository } from "@/shared/infra/database/repository/pg/pg-user-repository"
import { SQLiteUserRepository } from "@/shared/infra/database/repository/sqlite/sqlite-user-repository"
import { ActiveUserUseCase } from "@/user/application/use-case/active-user.usecase"
import { ChangePasswordUseCase } from "@/user/application/use-case/change-password.usecase"
import { CreateUserUseCase } from "@/user/application/use-case/create-user.usecase"
import { DeleteUserUseCase } from "@/user/application/use-case/delete-user.usecase"
import { FetchUsersUseCase } from "@/user/application/use-case/fetch-users.usecase"
import { SuspendUserUseCase } from "@/user/application/use-case/suspend-user.usecase"
import { UserMetricsUseCase } from "@/user/application/use-case/user-metrics.usecase"
import { UserProfileUseCase } from "@/user/application/use-case/user-profile.usecase"
import { ActivateUserController } from "@/user/infra/controller/activate-user.controller"
import { ChangePasswordController } from "@/user/infra/controller/change-password.controller"
import { CreateUserController } from "@/user/infra/controller/create-user.controller"
import { FetchUsersController } from "@/user/infra/controller/fetch-users.controller"
import { MyProfileController } from "@/user/infra/controller/my-profile.controller"
import { UserMetricsController } from "@/user/infra/controller/user-metrics.controller"
import { UserProfileController } from "@/user/infra/controller/user-profile.controller"
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
	bind(USER_TYPES.Controllers.CreateUser).to(CreateUserController)
	bind(USER_TYPES.Controllers.UserProfile).to(UserProfileController)
	bind(USER_TYPES.Controllers.MyProfile).to(MyProfileController)
	bind(USER_TYPES.Controllers.UserMetrics).to(UserMetricsController)
	bind(AUTH_TYPES.Controllers.RefreshToken).to(RefreshTokenController)
	bind(USER_TYPES.Controllers.ChangePassword).to(ChangePasswordController)
	bind(USER_TYPES.Controllers.FetchUsers).to(FetchUsersController)
	bind(USER_TYPES.Controllers.UpdateUserProfile).to(UserProfileController)
	bind(USER_TYPES.UseCases.CreateUser).to(CreateUserUseCase)
	bind(USER_TYPES.UseCases.UserProfile).to(UserProfileUseCase)
	bind(USER_TYPES.UseCases.UserMetrics).to(UserMetricsUseCase)
	bind(USER_TYPES.UseCases.ChangePassword).to(ChangePasswordUseCase)
	bind(USER_TYPES.UseCases.FetchUsers).to(FetchUsersUseCase)
	bind(USER_TYPES.UseCases.UpdateUserProfile).to(UserProfileUseCase)
	bind(USER_TYPES.UseCases.SuspendUser).to(SuspendUserUseCase)
	bind(USER_TYPES.UseCases.ActivateUser).to(ActiveUserUseCase)
	bind(USER_TYPES.Controllers.ActivateUser).to(ActivateUserController)
	bind(USER_TYPES.UseCases.DeleteUser).to(DeleteUserUseCase)
	bind(SQLiteUserRepository).toSelf()
})
