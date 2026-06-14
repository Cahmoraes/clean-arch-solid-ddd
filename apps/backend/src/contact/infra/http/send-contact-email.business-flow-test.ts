import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { container } from "@/shared/infra/ioc/container.js"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { ContactRoutes } from "./contact-routes.js"

describe("POST /contact", () => {
	let fastifyServer: FastifyAdapter

	beforeEach(async () => {
		container.snapshot()
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("retorna 200 ao receber payload válido", async () => {
		const response = await request(fastifyServer.server)
			.post(ContactRoutes.SEND)
			.send({
				nome: "João Silva",
				email: "joao@example.com",
				mensagem: "Tenho uma dúvida sobre os planos.",
			})

		expect(response.statusCode).toBe(HTTP_STATUS.OK)
		const body = response.body as { message: string }
		expect(body.message).toBe("Mensagem enviada com sucesso.")
	})

	test("retorna 400 quando nome está ausente", async () => {
		const response = await request(fastifyServer.server)
			.post(ContactRoutes.SEND)
			.send({ email: "joao@example.com", mensagem: "Olá." })

		expect(response.statusCode).toBe(HTTP_STATUS.BAD_REQUEST)
	})

	test("retorna 400 quando e-mail é inválido", async () => {
		const response = await request(fastifyServer.server)
			.post(ContactRoutes.SEND)
			.send({
				nome: "João",
				email: "nao-e-email",
				mensagem: "Olá.",
			})

		expect(response.statusCode).toBe(HTTP_STATUS.BAD_REQUEST)
	})
})
