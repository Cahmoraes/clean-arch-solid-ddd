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
		googleAuthProvider.addValidCode("reauth-code", {
			sub: "google-sub-123",
			email: user.email,
			name: user.name,
			emailVerified: true,
		})
		const token = (
			await authenticateWithGoogle.execute({ code: "reauth-code" })
		).force.success().value.token

		const response = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD_REAUTH)
			.set("Authorization", `Bearer ${token}`)
			.send({ provider: "google", code: "reauth-code" })

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			reauthGrant: expect.any(String),
			expiresInSeconds: 300,
		})
	})

	test("Deve recusar o reuso do grant de reautenticação", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-reuse@doe.com",
			googleId: "google-sub-reuse",
		})
		googleAuthProvider.addValidCode("reauth-code", {
			sub: "google-sub-reuse",
			email: user.email,
			name: user.name,
			emailVerified: true,
		})
		const token = (
			await authenticateWithGoogle.execute({ code: "reauth-code" })
		).force.success().value.token

		const reauthResponse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD_REAUTH)
			.set("Authorization", `Bearer ${token}`)
			.send({ provider: "google", code: "reauth-code" })

		const firstUse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				provider: "google",
				reauthGrant: reauthResponse.body.reauthGrant,
				newRawPassword: "Senha123!",
			})
		const secondUse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				provider: "google",
				reauthGrant: reauthResponse.body.reauthGrant,
				newRawPassword: "Senha456!",
			})

		expect(reauthResponse.status).toBe(HTTP_STATUS.OK)
		expect(reauthResponse.body).toEqual({
			reauthGrant: expect.any(String),
			expiresInSeconds: 300,
		})
		expect(firstUse.status).toBe(HTTP_STATUS.NO_CONTENT)
		// A segunda apresentação é recusada com 409. Em DefinePasswordUseCase o
		// guard de senha já definida (PasswordAlreadySetError) roda antes do consumo
		// do grant, então é ele — não ReauthGrantInvalidError — que responde.
		expect(secondUse.status).toBe(HTTP_STATUS.CONFLICT)
		expect(secondUse.body).toMatchObject({ code: "password_already_set" })
	})
})
