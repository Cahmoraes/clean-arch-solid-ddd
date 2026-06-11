/**
 * US-002 Acceptance Test: Login rápido para usuário com Google anteriormente autenticado
 *
 * User Story: Como usuário que já me autentiquei com Google anteriormente, eu quero
 * clicar em 'Entrar com Google' e acessar minha conta imediatamente para que o login
 * seja rápido e sem fricção.
 *
 * Requirements: RF-001 (POST /sessions/google), RF-002 (retorna 200 com tokens),
 *               RF-005 (público), RF-007 (se google_id já existe, retorna tokens)
 */

import { parseSetCookie } from "set-cookie-parser"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

import { SessionRoutes } from "../routes/session-routes.js"

describe("US-002: Login rápido com Google para usuário existente", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let googleAuthProvider: InMemoryGoogleAuthProvider

	beforeEach(async () => {
		container.snapshot()
		const inMemoryUserRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(inMemoryUserRepository)
		userRepository = container.get<InMemoryUserRepository>(
			USER_TYPES.Repositories.User,
		)
		googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("RF-007: Usuário existente com googleId valida RF-007", async () => {
		// Arrange: Usuário já autenticado com Google anteriormente
		const existingUser = await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			googleId: "google-sub-123",
			name: "John Doe",
		})

		// Mock do Google Auth Provider com token válido
		googleAuthProvider.addValidToken("valid-google-token", {
			sub: "google-sub-123",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		})

		// Act: Clique em "Entrar com Google"
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "valid-google-token" })

		// Assert: Login rápido e sem fricção
		expect(response.status).toBe(HTTP_STATUS.OK) // RF-002: Retorna 200
		expect(response.body).toEqual({
			token: expect.any(String), // JWT Token
			refreshToken: expect.any(String), // JWT RefreshToken
		})

		// Verificar que o usuário não foi duplicado
		const savedUser = await userRepository.userOfGoogleId("google-sub-123")
		expect(savedUser?.id).toBe(existingUser.id)
		expect(savedUser?.email).toBe("john@doe.com")

		// Verificar RefreshToken como cookie seguro
		const parsedCookie = parseSetCookie(response.headers["set-cookie"], {
			map: true,
		})
		expect(parsedCookie.refreshToken?.name).toBe(env.REFRESH_TOKEN_NAME)
		expect(parsedCookie.refreshToken?.httpOnly).toBe(true)
		expect(parsedCookie.refreshToken?.secure).toBe(true)
		expect(parsedCookie.refreshToken?.sameSite).toBe("Strict")
	})

	test("RF-001 + RF-005: Endpoint POST /sessions/google é público", async () => {
		// Arrange: Usuário existente
		await createAndSaveUser({
			userRepository,
			email: "public@doe.com",
			googleId: "google-public",
		})

		googleAuthProvider.addValidToken("public-token", {
			sub: "google-public",
			email: "public@doe.com",
			name: "Public User",
			emailVerified: true,
		})

		// Act: Fazer requisição SEM token JWT (público)
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "public-token" })

		// Assert: Endpoint é público (sem exigir autenticação prévia)
		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.token).toBeDefined()
	})

	test("Login sem fricção: resposta imediata com tokens válidos", async () => {
		// Arrange
		const user = await createAndSaveUser({
			userRepository,
			email: "frictionless@doe.com",
			googleId: "google-friction",
		})

		googleAuthProvider.addValidToken("friction-token", {
			sub: "google-friction",
			email: "frictionless@doe.com",
			name: user.name,
			emailVerified: true,
		})

		// Act: Simula clique em "Entrar com Google"
		const startTime = Date.now()
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "friction-token" })
		const duration = Date.now() - startTime

		// Assert: Resposta rápida (em menos de 500ms)
		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(duration).toBeLessThan(500)
		expect(response.body.token).toMatch(
			/^[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*$/,
		) // JWT regex
	})
})
