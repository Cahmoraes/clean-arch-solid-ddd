import { describe, expect, test } from "vitest"
import { DomainError } from "./domain-error"

class FakeConflictError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Resource already exists")
		this.name = "FakeConflictError"
	}
}

class FakeNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor() {
		super("Resource not found")
		this.name = "FakeNotFoundError"
	}
}

describe("DomainError", () => {
	test("Subclasse declara kind e herda de Error", () => {
		const error = new FakeConflictError()
		expect(error).toBeInstanceOf(DomainError)
		expect(error).toBeInstanceOf(Error)
		expect(error.kind).toBe("conflict")
		expect(error.message).toBe("Resource already exists")
		expect(error.name).toBe("FakeConflictError")
	})

	test("Kinds distintos são preservados por subclasse", () => {
		expect(new FakeConflictError().kind).toBe("conflict")
		expect(new FakeNotFoundError().kind).toBe("not-found")
	})

	test("instanceof DomainError distingue erros de negócio de erros técnicos", () => {
		const technical = new Error("connection refused")
		expect(technical).not.toBeInstanceOf(DomainError)
	})
})
