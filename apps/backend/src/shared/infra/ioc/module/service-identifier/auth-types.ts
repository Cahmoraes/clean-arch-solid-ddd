export const AUTH_TYPES = {
	UseCases: {
		Authenticate: Symbol.for("AuthenticateUseCase"),
		AuthenticateWithGoogle: Symbol.for("AuthenticateWithGoogleUseCase"),
		Logout: Symbol.for("LogoutUseCase"),
		RefreshToken: Symbol.for("RefreshTokenUseCase"),
	},
	Controllers: {
		Authenticate: Symbol.for("AuthenticateController"),
		AuthenticateWithGoogle: Symbol.for("AuthenticateWithGoogleController"),
		DevGoogleToken: Symbol.for("DevGoogleTokenController"),
		Logout: Symbol.for("LogoutController"),
		RefreshToken: Symbol.for("RefreshTokenController"),
	},
	Providers: {
		GoogleAuth: Symbol.for("GoogleAuthProvider"),
	},
	DAO: {
		RevokedToken: Symbol.for("RevokedTokenDAO"),
	},
} as const
