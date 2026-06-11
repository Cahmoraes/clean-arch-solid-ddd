import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { UserRoutes } from "./routes/user-routes"

describe("Alterar Senha", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let authenticate: AuthenticateUseCase
	let authToken: AuthToken

	beforeEach(async () => {
		userRepository = new InMemoryUserRepository()
		container.snapshot()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)

		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		authToken = container.get<AuthToken>(SHARED_TYPES.Tokens.Auth)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("Deve alterar a senha de um usuário", async () => {
		const oldPassword = "old_password"
		const newPassword = "new_password"
		const input = {
			name: "any_name",
			email: "any@email.com",
			password: oldPassword,
		}
		const user = await createAndSaveUser({
			userRepository,
			...input,
		})

		const result = await authenticate.execute({
			email: input.email,
			password: input.password,
		})
		const token = result.force.success().value.token
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.CHANGE_PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				currentRawPassword: oldPassword,
				newRawPassword: newPassword,
			})

		expect(response.status).toBe(HTTP_STATUS.NO_CONTENT)
		await expect(user.checkPassword(newPassword)).resolves.toBeTruthy()
		await expect(user.checkPassword(oldPassword)).resolves.toBeFalsy()
		expect(response.body).toEqual({})
	})

	test("Não deve alterar a senha de um usuário para uma senha inválida", async () => {
		const oldPassword = "old_password"
		const newPassword = "123"
		const input = {
			name: "any_name",
			email: "any@email.com",
			password: oldPassword,
		}
		const user = await createAndSaveUser({
			userRepository,
			...input,
		})

		const result = await authenticate.execute({
			email: input.email,
			password: input.password,
		})
		const token = result.force.success().value.token
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.CHANGE_PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				currentRawPassword: oldPassword,
				newRawPassword: newPassword,
			})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		await expect(user.checkPassword(newPassword)).resolves.toBeFalsy()
		await expect(user.checkPassword(oldPassword)).resolves.toBeTruthy()
		expect(response.body).toMatchObject({
			message:
				'Validation error: Too small: expected string to have >=8 characters at "newRawPassword"',
		})
	})

	test("Não deve alterar a senha de um usuário para uma senha igual a anterior", async () => {
		const oldPassword = "same_password"
		const newPassword = "same_password"
		const input = {
			name: "any_name",
			email: "any@email.com",
			password: oldPassword,
		}
		const user = await createAndSaveUser({
			userRepository,
			...input,
		})

		const result = await authenticate.execute({
			email: input.email,
			password: input.password,
		})
		const token = result.force.success().value.token
		const response = await request(fastifyServer.server)
			.patch(UserRoutes.CHANGE_PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				currentRawPassword: oldPassword,
				newRawPassword: newPassword,
			})

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
		await expect(user.checkPassword(newPassword)).resolves.toBeTruthy()
		await expect(user.checkPassword(oldPassword)).resolves.toBeTruthy()
		expect(response.body).toMatchObject({
			message: "The new password must be different from the old password.",
		})
	})

	test("Deve retornar 401 quando a senha atual estiver incorreta", async () => {
		const oldPassword = "old_password"
		const user = await createAndSaveUser({
			userRepository,
			name: "any_name",
			email: "any@email.com",
			password: oldPassword,
		})
		const token = (
			await authenticate.execute({
				email: user.email,
				password: oldPassword,
			})
		).force.success().value.token

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.CHANGE_PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				currentRawPassword: "wrong_password",
				newRawPassword: "new_password",
			})

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(response.body).toEqual({
			code: "current_password_invalid",
			message: "Current password is invalid",
		})
	})

	test("Deve retornar 409 quando a conta não possui senha local", async () => {
		const user = await createAndSaveUser({
			userRepository,
			name: "google_only",
			email: "google-only@email.com",
			googleId: "google-sub-123",
		})
		const token = authToken.sign(
			{
				sub: {
					id: user.id,
					email: user.email,
					role: user.role,
					jwi: "jwi-google-only",
				},
			},
			env.PRIVATE_KEY,
		)

		const response = await request(fastifyServer.server)
			.patch(UserRoutes.CHANGE_PASSWORD)
			.set("Authorization", `Bearer ${token}`)
			.send({
				currentRawPassword: "wrong_password",
				newRawPassword: "new_password",
			})

		expect(response.status).toBe(HTTP_STATUS.CONFLICT)
		expect(response.body).toEqual({
			code: "password_not_set",
			message: "Password not set for this account",
		})
	})
})
