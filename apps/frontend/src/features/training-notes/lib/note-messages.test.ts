import { describe, expect, test } from "vitest"
import { ApiError } from "@/lib/errors"
import {
	diaDaSemana,
	ERRO_NAO_ENCONTRADA,
	ERRO_REDE,
	formatarDataCurta,
	mensagemDeFalha,
} from "./note-messages"

describe("note-messages", () => {
	test("formatarDataCurta devolve dia e mês por extenso em minúsculas", () => {
		expect(formatarDataCurta("2026-10-16")).toBe("16 de outubro")
		expect(formatarDataCurta("2026-03-01")).toBe("1 de março")
	})

	test("diaDaSemana devolve o dia da semana por extenso em minúsculas", () => {
		expect(diaDaSemana("2026-10-12")).toBe("segunda-feira")
		expect(diaDaSemana("2026-10-17")).toBe("sábado")
	})

	test("mensagemDeFalha devolve ERRO_NAO_ENCONTRADA para 404 e ERRO_REDE para o resto", () => {
		expect(mensagemDeFalha(new ApiError(404, "NOT_FOUND", "x"))).toBe(
			ERRO_NAO_ENCONTRADA,
		)
		expect(mensagemDeFalha(new ApiError(500, "ERRO", "x"))).toBe(ERRO_REDE)
		expect(mensagemDeFalha(new Error("rede"))).toBe(ERRO_REDE)
	})
})
