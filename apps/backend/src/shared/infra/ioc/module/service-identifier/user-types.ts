export const USER_TYPES = {
	Repositories: {
		User: Symbol.for("UserRepository"),
	},
	PG: {
		User: Symbol.for("PgUserRepository"),
	},
	UseCases: {
		CreateUser: Symbol.for("CreateUserUseCase"),
		UpdateUser: Symbol.for("UpdateUserUseCase"),
		DeleteUser: Symbol.for("DeleteUserUseCase"),
		FetchUsers: Symbol.for("FetchUsersUseCase"),
		UserProfile: Symbol.for("UserProfileUseCase"),
		ChangePassword: Symbol.for("ChangePasswordUseCase"),
		CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantUseCase"),
		DefinePassword: Symbol.for("DefinePasswordUseCase"),
		ActivateUser: Symbol.for("ActivateUserUseCase"),
		UpdateUserProfile: Symbol.for("UpdateUserProfileUseCase"),
		SuspendUser: Symbol.for("SuspendUserUseCase"),
		UserMetrics: Symbol.for("UserMetricsUseCase"),
	},
	Controllers: {
		CreateUser: Symbol.for("UserController"),
		UserProfile: Symbol.for("UserProfileController"),
		ChangePassword: Symbol.for("ChangePasswordController"),
		CreatePasswordReauthGrant: Symbol.for(
			"CreatePasswordReauthGrantController",
		),
		DefinePassword: Symbol.for("DefinePasswordController"),
		FetchUsers: Symbol.for("FetchUsersController"),
		UpdateUserProfile: Symbol.for("UpdateUserProfileController"),
		ActivateUser: Symbol.for("ActivateUserController"),
		SuspendUser: Symbol.for("SuspendUserController"),
		MyProfile: Symbol.for("MyProfileController"),
		UserMetrics: Symbol.for("UserMetricsController"),
	},
	DAO: {
		User: Symbol.for("UserDAO"),
	},
} as const
