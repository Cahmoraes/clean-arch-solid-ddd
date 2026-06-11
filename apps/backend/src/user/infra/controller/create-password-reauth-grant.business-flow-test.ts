import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateWithGoogleUseCase } from "@/session/application/use-case/authenticate-with-google.usecase.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("Criar grant de reautenticação para primeira senha", () => {
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

	test("Deve retornar reauthGrant válido para conta Google sem senha local", async () => {
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
		const token = (
			await authenticateWithGoogle.execute({ idToken: "reauth-token" })
		).force.success().value.token

		const response = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD_REAUTH)
			.set("Authorization", `Bearer ${token}`)
			.send({ provider: "google", idToken: "reauth-token" })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			reauthGrant: expect.any(String),
			expiresInSeconds: 300,
		})
	})
})
