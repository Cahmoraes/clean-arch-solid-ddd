import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { SessionRoutes } from "./routes/session-routes.js"

describe("DevGoogleTokenController", () => {
	let fastifyServer: FastifyAdapter
	let googleAuthProvider: InMemoryGoogleAuthProvider

	beforeEach(async () => {
		container.snapshot()
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

	test("Deve registrar um token Google válido em ambiente não produtivo", async () => {
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.DEV_GOOGLE_TOKEN)
			.send({
				idToken: "seeded-google-token",
				sub: "google-sub-123",
				email: "google-only@example.com",
				name: "Google Only",
				emailVerified: true,
			})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ ok: true })
	})

	test("Deve permitir login com Google usando token previamente registrado", async () => {
		await request(fastifyServer.server)
			.post(SessionRoutes.DEV_GOOGLE_TOKEN)
			.send({
				idToken: "seeded-token",
				sub: "google-sub-456",
				email: "seeded@example.com",
				name: "Seeded User",
				emailVerified: true,
			})

		const loginResponse = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "seeded-token" })

		expect(loginResponse.status).toBe(HTTP_STATUS.OK)
		expect(loginResponse.body).toHaveProperty("token")
	})

	test("Deve retornar 400 quando body inválido", async () => {
		const response = await request(fastifyServer.server)
			.post(SessionRoutes.DEV_GOOGLE_TOKEN)
			.send({ idToken: "" })

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
	})
})
