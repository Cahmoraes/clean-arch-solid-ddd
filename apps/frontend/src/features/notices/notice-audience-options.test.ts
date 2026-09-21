import { describe, expect, test } from "vitest"
import {
	NOTICE_AUDIENCE_OPTIONS,
	noticeAudienceLabel,
} from "./notice-audience-options"

describe("NOTICE_AUDIENCE_OPTIONS", () => {
	test("exporta as três opções na ordem Todos, Alunos, Administradores", () => {
		expect(NOTICE_AUDIENCE_OPTIONS.map((option) => option.value)).toEqual([
			"ALL",
			"MEMBERS",
			"ADMINS",
		])
		expect(NOTICE_AUDIENCE_OPTIONS.map((option) => option.label)).toEqual([
			"Todos",
			"Alunos",
			"Administradores",
		])
	})

	test("cada opção descreve o grupo que alcança", () => {
		expect(NOTICE_AUDIENCE_OPTIONS.map((option) => option.description)).toEqual(
			[
				"Alunos e administradores ativos",
				"Somente alunos ativos",
				"Somente administradores ativos",
			],
		)
	})

	test.each([
		["ALL", "Todos"],
		["MEMBERS", "Alunos"],
		["ADMINS", "Administradores"],
	] as const)("noticeAudienceLabel(%s) devolve %s", (audience, label) => {
		expect(noticeAudienceLabel(audience)).toBe(label)
	})
})
