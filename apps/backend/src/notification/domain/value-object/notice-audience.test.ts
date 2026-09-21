import { describe, expect, test } from "vitest"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import { NoticeAudience, NoticeAudienceValues } from "./notice-audience.js"

describe("NoticeAudience", () => {
	test("os valores possiveis sao ALL, MEMBERS e ADMINS", () => {
		expect(NoticeAudienceValues).toEqual({
			ALL: "ALL",
			MEMBERS: "MEMBERS",
			ADMINS: "ADMINS",
		})
	})

	test("FR-015: all() representa o publico padrao ALL", () => {
		expect(NoticeAudience.all().value).toBe("ALL")
	})

	test.each([
		"ALL",
		"MEMBERS",
		"ADMINS",
	])("create(%s) retorna sucesso com o mesmo valor", (value) => {
		const result = NoticeAudience.create(value)

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value.value).toBe(value)
	})

	test.each([
		["minusculas", "all"],
		["nome em portugues", "todos"],
		["string vazia", ""],
		["capitalizado", "Members"],
		["com espaco", " ADMINS"],
		["papel do dominio user", "ADMIN"],
	])("create com valor invalido (%s) retorna InvalidNoticeError", (_, value) => {
		const result = NoticeAudience.create(value)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidNoticeError)
	})
})
