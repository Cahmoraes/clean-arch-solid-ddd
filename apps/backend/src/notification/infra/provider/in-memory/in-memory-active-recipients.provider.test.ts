import { describe, expect, test } from "vitest"
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import { InMemoryActiveRecipientsProvider } from "./in-memory-active-recipients.provider.js"

function audience(value: string): NoticeAudience {
	return NoticeAudience.create(value).force.success().value
}

function makeSut(): InMemoryActiveRecipientsProvider {
	const sut = new InMemoryActiveRecipientsProvider()
	sut.userIds = ["admin-1", "member-1", "admin-2", "member-2"]
	sut.adminIds = ["admin-1", "admin-2"]
	return sut
}

describe("InMemoryActiveRecipientsProvider", () => {
	test("comeca sem destinatarios", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		expect(await sut.listActiveUserIds(NoticeAudience.all())).toEqual([])
	})

	test("lista todos os ids semeados, incluindo o do administrador remetente", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["admin-1", "member-1"]
		expect(await sut.listActiveUserIds(NoticeAudience.all())).toEqual([
			"admin-1",
			"member-1",
		])
	})

	test("devolve copia: alterar o resultado nao altera o provider", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["member-1"]
		const ids = await sut.listActiveUserIds(NoticeAudience.all())
		ids.push("intruso")
		expect(await sut.listActiveUserIds(NoticeAudience.all())).toEqual([
			"member-1",
		])
	})

	test("FR-009: ALL devolve administradores e alunos", async () => {
		const sut = makeSut()

		expect(await sut.listActiveUserIds(audience("ALL"))).toEqual([
			"admin-1",
			"member-1",
			"admin-2",
			"member-2",
		])
	})

	test("FR-007: MEMBERS devolve so os alunos e exclui os administradores", async () => {
		const sut = makeSut()

		expect(await sut.listActiveUserIds(audience("MEMBERS"))).toEqual([
			"member-1",
			"member-2",
		])
	})

	test("FR-008: ADMINS devolve so os administradores e exclui os alunos", async () => {
		const sut = makeSut()

		expect(await sut.listActiveUserIds(audience("ADMINS"))).toEqual([
			"admin-1",
			"admin-2",
		])
	})

	test("ADMINS sem nenhum administrador semeado devolve lista vazia", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["member-1", "member-2"]

		expect(await sut.listActiveUserIds(audience("ADMINS"))).toEqual([])
	})

	test("MEMBERS sem nenhum administrador semeado devolve todos os ids", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["member-1", "member-2"]

		expect(await sut.listActiveUserIds(audience("MEMBERS"))).toEqual([
			"member-1",
			"member-2",
		])
	})

	test("MEMBERS sem nenhum aluno semeado devolve lista vazia", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["admin-1"]
		sut.adminIds = ["admin-1"]

		expect(await sut.listActiveUserIds(audience("MEMBERS"))).toEqual([])
	})

	test("FR-011: um administrador que nao esta entre os usuarios ativos nunca e listado", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["admin-1", "member-1"]
		sut.adminIds = ["admin-1", "admin-inativo"]

		expect(await sut.listActiveUserIds(audience("ADMINS"))).toEqual(["admin-1"])
		expect(await sut.listActiveUserIds(audience("ALL"))).not.toContain(
			"admin-inativo",
		)
	})

	test("os resultados filtrados tambem sao copias independentes", async () => {
		const sut = makeSut()
		const admins = await sut.listActiveUserIds(audience("ADMINS"))
		admins.push("intruso")

		expect(await sut.listActiveUserIds(audience("ADMINS"))).toEqual([
			"admin-1",
			"admin-2",
		])
	})
})
