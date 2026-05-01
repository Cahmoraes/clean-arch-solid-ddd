import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { container } from "@/shared/infra/ioc/container"
import { HEALTH_CHECK_TYPES } from "@/shared/infra/ioc/module/service-identifier/health-check-types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"

describe("Health Contract Tests", () => {
	let fastifyServer: FastifyAdapter

	beforeEach(async () => {
		container.snapshot()
		container.rebind(HEALTH_CHECK_TYPES.Providers.Database).toConstantValue({
			name: "database",
			check: async () => ({
				name: "database",
				status: "up",
				responseTime: 1,
				lastCheck: new Date().toISOString(),
			}),
		})
		container.rebind(HEALTH_CHECK_TYPES.Providers.Cache).toConstantValue({
			name: "cache",
			check: async () => ({
				name: "cache",
				status: "up",
				responseTime: 1,
				lastCheck: new Date().toISOString(),
			}),
		})
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("GET /health-check deve satisfazer a spec OpenAPI com status 200", async () => {
		const response = await request(fastifyServer.server).get("/health-check")

		expect(response.status).toBe(200)
		expect(response).toSatisfyApiSpec()
	})
})
