import { describe, expect, test } from "vitest"
import { InMemoryActiveRecipientsProvider } from "./in-memory-active-recipients.provider.js"

describe("InMemoryActiveRecipientsProvider", () => {
	test("comeca sem destinatarios", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		expect(await sut.listActiveUserIds()).toEqual([])
	})

	test("lista todos os ids semeados, incluindo o do administrador remetente", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["admin-1", "member-1"]
		expect(await sut.listActiveUserIds()).toEqual(["admin-1", "member-1"])
	})

	test("devolve copia: alterar o resultado nao altera o provider", async () => {
		const sut = new InMemoryActiveRecipientsProvider()
		sut.userIds = ["member-1"]
		const ids = await sut.listActiveUserIds()
		ids.push("intruso")
		expect(await sut.listActiveUserIds()).toEqual(["member-1"])
	})
})
