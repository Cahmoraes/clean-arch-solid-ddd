import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import request from "supertest"

import { serverBuild } from "@/bootstrap/server-build"
import { env } from "@/shared/infra/env"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"

describe("Serving estático de uploads", () => {
	let fastifyServer: FastifyAdapter
	const fileName = "test-static.txt"
	const relativeKey = `gyms/${fileName}`
	const absoluteDir = path.join(path.resolve(env.UPLOAD_DIR), "gyms")

	beforeAll(async () => {
		fastifyServer = await serverBuild()
		await fastifyServer.ready()
	})

	afterAll(async () => {
		await fastifyServer.close()
	})

	beforeEach(async () => {
		await mkdir(absoluteDir, { recursive: true })
		await writeFile(
			path.join(absoluteDir, fileName),
			Buffer.from("imagem-fake"),
		)
	})

	afterEach(async () => {
		await rm(path.join(absoluteDir, fileName), { force: true })
	})

	test("serve um arquivo existente em /uploads", async () => {
		const response = await request(fastifyServer.server).get(
			`/uploads/${relativeKey}`,
		)
		expect(response.status).toBe(200)
		expect(response.text).toBe("imagem-fake")
	})

	test("retorna 404 para arquivo inexistente", async () => {
		const response = await request(fastifyServer.server).get(
			"/uploads/gyms/missing.webp",
		)
		expect(response.status).toBe(404)
	})
})
