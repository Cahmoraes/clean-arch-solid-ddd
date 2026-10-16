import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase.js"
import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository.js"
import { container } from "@/shared/infra/ioc/container.js"
import {
	AUTH_TYPES,
	TRAINING_NOTE_TYPES,
	USER_TYPES,
} from "@/shared/infra/ioc/types.js"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter.js"
import { TrainingNoteRoutes } from "./routes/training-note-routes.js"

const TEST_USER = {
	email: "training.note.user@test.com",
	password: "any_password",
}

describe("TrainingNote business flow", () => {
	let app: FastifyAdapter
	let token: string

	beforeEach(async () => {
		container.snapshot()
		await container.unbind(TRAINING_NOTE_TYPES.Repositories.TrainingNote)
		container
			.bind(TRAINING_NOTE_TYPES.Repositories.TrainingNote)
			.toConstantValue(new InMemoryTrainingNoteRepository())
		app = await serverBuildForTest()
		await app.ready()
		await createAndSaveUser({
			userRepository: container.get(USER_TYPES.Repositories.User),
			email: TEST_USER.email,
			password: TEST_USER.password,
		})
		const authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		const authResult = await authenticate.execute({
			email: TEST_USER.email,
			password: TEST_USER.password,
		})
		token = authResult.forceSuccess().value.token
	})

	afterEach(async () => {
		container.restore()
		await app.close()
	})

	function auth() {
		return { Authorization: `Bearer ${token}` }
	}

	test("AC-07 POST duplica o dia e recebe 409 com orientação de editar", async () => {
		await request(app.server)
			.post(TrainingNoteRoutes.CREATE)
			.set(auth())
			.send({ data: "2026-10-16", texto: "Peito + tríceps 4x12" })
			.expect(201)
		const res = await request(app.server)
			.post(TrainingNoteRoutes.CREATE)
			.set(auth())
			.send({ data: "2026-10-16", texto: "outro" })
			.expect(409)
		expect(res.body.message).toMatch(/edite/i)
	})

	test("AC-08 PUT/DELETE em data inexistente recebe 404 sem efeito colateral", async () => {
		await request(app.server)
			.put("/training-notes/2026-10-17")
			.set(auth())
			.send({ texto: "novo" })
			.expect(404)
		await request(app.server)
			.delete("/training-notes/2026-10-17")
			.set(auth())
			.expect(404)
		const list = await request(app.server)
			.get(TrainingNoteRoutes.LIST)
			.set(auth())
			.query({ de: "2026-10-01", ate: "2026-10-31" })
			.expect(200)
		expect(list.body).toEqual([])
	})

	test("nota perto da meia-noite permanece no dia clicado sem deslocamento de fuso", async () => {
		await request(app.server)
			.post(TrainingNoteRoutes.CREATE)
			.set(auth())
			.send({ data: "2026-10-16", texto: "treino tardio" })
			.expect(201)
		const list = await request(app.server)
			.get(TrainingNoteRoutes.LIST)
			.set(auth())
			.query({ de: "2026-10-16", ate: "2026-10-16" })
			.expect(200)
		expect(list.body.map((r: { data: string }) => r.data)).toEqual([
			"2026-10-16",
		])
	})
})
