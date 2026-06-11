import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase.js"
import { SessionRoutes } from "@/session/infra/controller/routes/session-routes.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("Definir primeira senha", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let googleAuthProvider: InMemoryGoogleAuthProvider
	let authenticateWithGoogle: AuthenticateWithGoogleUseCase

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		authenticateWithGoogle = container.get<AuthenticateWithGoogleUseCase>(
			AUTH_TYPES.UseCases.AuthenticateWithGoogle,
		)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve definir a primeira senha e permitir login por email/senha na mesma conta", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-only@doe.com",
			googleId: "google-sub-123",
		})
		googleAuthProvider.addValidToken("reauth-token", {
			sub: "google-sub-123",
			email: user.email,
			name: user.name,
			emailVerified: true,
		})
		const googleToken = (
			await authenticateWithGoogle.execute({ idToken: "reauth-token" })
		).force.success().value.token
		const reauthResponse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD_REAUTH)
			.set("Authorization", `Bearer ${googleToken}`)
			.send({ provider: "google", idToken: "reauth-token" })

		const defineResponse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD)
			.set("Authorization", `Bearer ${googleToken}`)
			.send({
				provider: "google",
				reauthGrant: reauthResponse.body.reauthGrant,
				newRawPassword: "Senha123!",
			})

		const loginResponse = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE)
			.send({
				email: user.email,
				password: "Senha123!",
			})

		expect(defineResponse.status).toBe(HTTP_STATUS.NO_CONTENT)
		expect(loginResponse.status).toBe(HTTP_STATUS.OK)
		expect(loginResponse.body).toEqual({
			token: expect.any(String),
			refreshToken: expect.any(String),
		})
	})
})
