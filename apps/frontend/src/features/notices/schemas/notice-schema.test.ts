import { describe, expect, test } from "vitest"
import {
	NOTICE_MESSAGE_MAX,
	NOTICE_TITLE_MAX,
	noticeSchema,
} from "./notice-schema"

const VALID = { title: "Manutenção", message: "Sistema fora do ar às 22h." }

describe("noticeSchema", () => {
	test("aceita título e mensagem válidos", () => {
		expect(noticeSchema.safeParse(VALID).success).toBe(true)
	})

	test("limites são 100 e 500", () => {
		expect(NOTICE_TITLE_MAX).toBe(100)
		expect(NOTICE_MESSAGE_MAX).toBe(500)
	})

	test("aceita título com exatamente 100 caracteres", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			title: "a".repeat(NOTICE_TITLE_MAX),
		})
		expect(result.success).toBe(true)
	})

	test("recusa título com 101 caracteres com mensagem clara", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			title: "a".repeat(NOTICE_TITLE_MAX + 1),
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"O título deve ter no máximo 100 caracteres.",
		)
	})

	test("aceita título com 1 caractere", () => {
		expect(noticeSchema.safeParse({ ...VALID, title: "a" }).success).toBe(true)
	})

	test("recusa título vazio com mensagem clara", () => {
		const result = noticeSchema.safeParse({ ...VALID, title: "" })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe("Informe o título do aviso.")
	})

	test("recusa título só com espaços", () => {
		const result = noticeSchema.safeParse({ ...VALID, title: "     " })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe("Informe o título do aviso.")
	})

	test("aceita mensagem com exatamente 500 caracteres", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			message: "a".repeat(NOTICE_MESSAGE_MAX),
		})
		expect(result.success).toBe(true)
	})

	test("recusa mensagem com 501 caracteres com mensagem clara", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			message: "a".repeat(NOTICE_MESSAGE_MAX + 1),
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"A mensagem deve ter no máximo 500 caracteres.",
		)
	})

	test("recusa mensagem vazia com mensagem clara", () => {
		const result = noticeSchema.safeParse({ ...VALID, message: "" })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"Informe a mensagem do aviso.",
		)
	})

	test("recusa mensagem só com espaços", () => {
		const result = noticeSchema.safeParse({ ...VALID, message: "   " })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"Informe a mensagem do aviso.",
		)
	})

	test("aplica trim nos valores aceitos", () => {
		const result = noticeSchema.parse({
			title: "  Aviso  ",
			message: "  Mensagem  ",
		})
		expect(result).toEqual({ title: "Aviso", message: "Mensagem" })
	})
})
