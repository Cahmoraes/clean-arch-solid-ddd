import { describe, expect, test } from "vitest"
import { ZodError, z } from "zod"
import { failure } from "@/shared/domain/value-object/either"
import { UserAlreadyExistsError } from "@/user/application/error/user-already-exists-error"
import { BaseController } from "./base-controller"

class TestBaseController extends BaseController {
	public initialized = false

	public parse<T>(schema: z.ZodType<T>, data: unknown) {
		return this.parseRequest(schema, data)
	}

	public respond(result: ReturnType<typeof failure<Error, unknown>>) {
		return this.createResponseError(result)
	}

	public async init(): Promise<void> {
		this.initialized = true
	}
}

describe("BaseController", () => {
	test("parseRequest() deve retornar success(data) quando schema é válido", () => {
		const sut = new TestBaseController()
		const schema = z.object({ email: z.string().email() })

		const result = sut.parse(schema, { email: "john@example.com" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({ email: "john@example.com" })
	})

	test("parseRequest() deve retornar failure(ZodError) quando schema é inválido", () => {
		const sut = new TestBaseController()
		const schema = z.object({ email: z.string().email() })

		const result = sut.parse(schema, { email: "invalid-email" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(ZodError)
	})

	test("createResponseError() deve mapear KnownError para resposta HTTP", () => {
		const sut = new TestBaseController()

		const response = sut.respond(failure(new UserAlreadyExistsError()))

		expect(response.status).toBe(409)
		expect(response.body).toEqual({ message: "User already exists" })
	})

	test("controller concreto estendendo BaseController deve executar init() normalmente", async () => {
		const sut = new TestBaseController()

		await sut.init()

		expect(sut.initialized).toBe(true)
	})
})
