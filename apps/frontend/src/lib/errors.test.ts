import { describe, expect, it } from "vitest"
import { ApiError, mapStatusToMessage } from "./errors"

describe("mapStatusToMessage", () => {
	it.each([
		[401, "expirou"],
		[403, "permissão"],
		[404, "não encontrado"],
		[422, "Dados inválidos"],
		[500, "Erro interno"],
	])("returns friendly message for %i", (status, expected) => {
		expect(mapStatusToMessage(status)).toContain(expected)
	})

	it("falls back to a generic message", () => {
		expect(mapStatusToMessage(418)).toMatch(/Não foi possível/)
	})
})

describe("ApiError", () => {
	it("captures status, code and userMessage", () => {
		const err = new ApiError(422, "validation", "Falhou", { fields: ["email"] })
		expect(err.status).toBe(422)
		expect(err.code).toBe("validation")
		expect(err.userMessage).toBe("Falhou")
		expect(err.message).toBe("Falhou")
	})

	it("fromStatus uses mapStatusToMessage", () => {
		const err = ApiError.fromStatus(401, "auth")
		expect(err.userMessage).toBe(mapStatusToMessage(401))
	})
})
