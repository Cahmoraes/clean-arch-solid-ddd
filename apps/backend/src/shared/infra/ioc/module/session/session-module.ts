import { ContainerModule } from "inversify"
import type { GoogleAuthProvider } from "@/session/application/provider/google-auth-provider.js"
import { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase.js"
import { LogoutUseCase } from "@/session/application/use-case/logout.usecase"
import { AuthenticateController } from "@/session/infra/controller/authenticate.controller"
import { AuthenticateWithGoogleController } from "@/session/infra/controller/authenticate-with-google.controller.js"
import { LogoutController } from "@/session/infra/controller/logout.controller"
import { AUTH_TYPES } from "../../types"
import { GoogleAuthProviderProvider } from "./google-auth-provider-provider"
import { RevokedTokenDAOProvider } from "./revoked-token-dao-provider"

export const sessionModule = new ContainerModule(({ bind }) => {
	bind(AUTH_TYPES.Controllers.Authenticate).to(AuthenticateController)
	bind(AUTH_TYPES.Controllers.AuthenticateWithGoogle).to(
		AuthenticateWithGoogleController,
	)
	bind(AUTH_TYPES.Controllers.Logout).to(LogoutController)
	bind(AUTH_TYPES.UseCases.Authenticate).to(AuthenticateUseCase)
	bind(AUTH_TYPES.UseCases.AuthenticateWithGoogle).to(
		AuthenticateWithGoogleUseCase,
	)
	bind(AUTH_TYPES.UseCases.Logout).to(LogoutUseCase)
	bind<GoogleAuthProvider>(AUTH_TYPES.Providers.GoogleAuth)
		.toDynamicValue(GoogleAuthProviderProvider.provide)
		.inSingletonScope()
	bind(AUTH_TYPES.DAO.RevokedToken)
		.toDynamicValue(RevokedTokenDAOProvider.provide)
		.inSingletonScope()
})
