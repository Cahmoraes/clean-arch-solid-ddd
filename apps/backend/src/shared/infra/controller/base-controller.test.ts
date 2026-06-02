import { describe, expect, test } from "vitest"
import { ZodError, z } from "zod"
import { DomainError } from "@/shared/domain/error/domain-error"
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

	describe("mapeamento por DomainError.kind", () => {
		class KindConflictError extends DomainError {
			public readonly kind = "conflict" as const

			constructor() {
				super("Already exists")
				this.name = "KindConflictError"
			}
		}

		class KindForbiddenError extends DomainError {
			public readonly kind = "forbidden" as const

			constructor() {
				super("Not allowed")
				this.name = "KindForbiddenError"
			}
		}

		class KindNotFoundDomainError extends DomainError {
			public readonly kind = "not-found" as const

			constructor() {
				super("Missing resource")
				this.name = "KindNotFoundDomainError"
			}
		}

		test("Erro com kind conflict gera 409", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new KindConflictError()))
			expect(response.status).toBe(409)
			expect(response.body).toEqual({ message: "Already exists" })
		})

		test("Erro com kind forbidden gera 403", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new KindForbiddenError()))
			expect(response.status).toBe(403)
			expect(response.body).toEqual({ message: "Not allowed" })
		})

		test("Erro com kind not-found gera 404", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new KindNotFoundDomainError()))
			expect(response.status).toBe(404)
			expect(response.body).toEqual({ message: "Missing resource" })
		})

		test("Erro fora da hierarquia DomainError mantém fallback legado (heurística por nome)", () => {
			const sut = new TestBaseController()
			// UserAlreadyExistsError ainda não migrou para DomainError nesta task
			const response = sut.respond(failure(new UserAlreadyExistsError()))
			expect(response.status).toBe(409)
		})

		test("Erro técnico desconhecido gera 500", () => {
			const sut = new TestBaseController()
			const response = sut.respond(failure(new Error("boom")))
			expect(response.status).toBe(500)
		})
	})
})
