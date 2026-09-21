import { beforeEach, describe, expect, test, vi } from "vitest"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import type { NoticeAudienceTypes } from "@/notification/domain/value-object/notice-audience.js"
import { InMemoryActiveRecipientsProvider } from "@/notification/infra/provider/in-memory/in-memory-active-recipients.provider.js"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository.js"
import { TestingLogger } from "@/shared/infra/logger/testing-logger.js"
import { EXCHANGES } from "@/shared/infra/queue/exchanges.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import {
	BROADCAST_CHUNK_SIZE,
	BroadcastNoticeUseCase,
} from "./broadcast-notice.usecase.js"

class FakeQueue implements Queue {
	public published: Array<{ exchange: string; data: unknown }> = []
	public failOnCalls = new Set<number>()
	private calls = 0

	public async connect(): Promise<void> {}

	public async publish<TData>(exchange: string, data: TData): Promise<void> {
		this.calls += 1
		if (this.failOnCalls.has(this.calls)) {
			throw new Error("broker indisponivel")
		}
		this.published.push({ exchange, data })
	}

	public async consume(): Promise<void> {}
}

function makeUserIds(total: number): string[] {
	return Array.from({ length: total }, (_, index) => `user-${index}`)
}

// Simula um valor que chegou de fora do dominio sem ter sido validado: o
// comportamento sob teste e justamente a validacao em runtime do use case.
function untrustedAudience(value: string): NoticeAudienceTypes {
	return value as NoticeAudienceTypes
}

describe("BroadcastNoticeUseCase", () => {
	let repository: InMemoryNotificationRepository
	let recipients: InMemoryActiveRecipientsProvider
	let queue: FakeQueue
	let logger: TestingLogger
	let sut: BroadcastNoticeUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		recipients = new InMemoryActiveRecipientsProvider()
		queue = new FakeQueue()
		logger = new TestingLogger()
		sut = new BroadcastNoticeUseCase(repository, recipients, queue, logger)
	})

	test("cria uma notificacao NOTICE por destinatario com titulo e mensagem", async () => {
		recipients.userIds = ["user-1", "user-2", "user-3"]

		const result = await sut.execute({
			title: "Manutencao programada",
			message: "O sistema ficara fora do ar as 22h.",
		})

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({ recipients: 3 })
		const saved = repository.notifications.toArray()
		expect(saved).toHaveLength(3)
		expect(saved.map((n) => n.userId).sort()).toEqual([
			"user-1",
			"user-2",
			"user-3",
		])
		for (const notification of saved) {
			expect(notification.type).toBe("NOTICE")
			expect(notification.title).toBe("Manutencao programada")
			expect(notification.message).toBe("O sistema ficara fora do ar as 22h.")
			expect(notification.gymName).toBeUndefined()
			expect(notification.reason).toBeUndefined()
		}
	})

	test("FR-012: o administrador remetente, por ser usuario ativo, tambem recebe o aviso", async () => {
		recipients.userIds = ["admin-1", "member-1"]

		await sut.execute({ title: "Aviso", message: "Mensagem" })

		const receivers = repository.notifications.toArray().map((n) => n.userId)
		expect(receivers).toContain("admin-1")
	})

	test("publica cada notificacao em notificationCreated com o payload do pipeline existente", async () => {
		recipients.userIds = ["user-1", "user-2"]

		await sut.execute({ title: "Aviso", message: "Mensagem" })

		expect(queue.published).toHaveLength(2)
		for (const { exchange, data } of queue.published) {
			expect(exchange).toBe(EXCHANGES.NOTIFICATION_CREATED)
			expect(data).toEqual({
				notificationId: expect.any(String),
				userId: expect.stringMatching(/^user-/),
				type: "NOTICE",
				title: "Aviso",
				message: "Mensagem",
			})
		}
		const saved = repository.notifications.toArray()
		expect(queue.published.map(({ data }) => data)).toEqual(
			expect.arrayContaining(
				saved.map((n) =>
					expect.objectContaining({ notificationId: n.id, userId: n.userId }),
				),
			),
		)
	})

	test("BROADCAST_CHUNK_SIZE e 500", () => {
		expect(BROADCAST_CHUNK_SIZE).toBe(500)
	})

	test("500 destinatarios sao persistidos em um unico bloco", async () => {
		recipients.userIds = makeUserIds(500)
		const saveMany = vi.spyOn(repository, "saveMany")

		const result = await sut.execute({ title: "Aviso", message: "Mensagem" })

		expect(saveMany.mock.calls.map(([batch]) => batch.length)).toEqual([500])
		expect(result.force.success().value).toEqual({ recipients: 500 })
	})

	test("501 destinatarios sao persistidos em dois blocos (500 e 1)", async () => {
		recipients.userIds = makeUserIds(501)
		const saveMany = vi.spyOn(repository, "saveMany")

		const result = await sut.execute({ title: "Aviso", message: "Mensagem" })

		expect(saveMany.mock.calls.map(([batch]) => batch.length)).toEqual([500, 1])
		expect(repository.notifications.size).toBe(501)
		expect(queue.published).toHaveLength(501)
		expect(result.force.success().value).toEqual({ recipients: 501 })
	})

	test("aplica trim em titulo e mensagem antes de persistir", async () => {
		recipients.userIds = ["user-1"]

		await sut.execute({ title: "  Aviso  ", message: "  Mensagem  " })

		const [notification] = repository.notifications.toArray()
		expect(notification?.title).toBe("Aviso")
		expect(notification?.message).toBe("Mensagem")
	})

	test.each([
		["titulo vazio", { title: "", message: "Mensagem" }],
		["titulo so com espacos", { title: "   ", message: "Mensagem" }],
		[
			"titulo com 101 caracteres",
			{ title: "a".repeat(101), message: "Mensagem" },
		],
		["mensagem vazia", { title: "Aviso", message: "" }],
		["mensagem so com espacos", { title: "Aviso", message: "   " }],
		[
			"mensagem com 501 caracteres",
			{ title: "Aviso", message: "a".repeat(501) },
		],
	])("entrada invalida (%s) retorna InvalidNoticeError e nao cria nada", async (_, input) => {
		recipients.userIds = ["user-1"]

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidNoticeError)
		expect(repository.notifications.size).toBe(0)
		expect(queue.published).toHaveLength(0)
	})

	test("aceita titulo com 100 e mensagem com 500 caracteres", async () => {
		recipients.userIds = ["user-1"]

		const result = await sut.execute({
			title: "a".repeat(100),
			message: "b".repeat(500),
		})

		expect(result.isSuccess()).toBe(true)
	})

	test("Review Focus: nenhum usuario ativo retorna sucesso com recipients 0, sem erro e sem publicar", async () => {
		recipients.userIds = []
		const saveMany = vi.spyOn(repository, "saveMany")

		const result = await sut.execute({ title: "Aviso", message: "Mensagem" })

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({ recipients: 0 })
		expect(repository.notifications.size).toBe(0)
		expect(saveMany).not.toHaveBeenCalled()
		expect(queue.published).toHaveLength(0)
		expect(logger.detecteErrorMethod).toBe(false)
	})

	test("Review Focus: falha ao publicar para alguns usuarios mantem sucesso e as notificacoes persistidas", async () => {
		recipients.userIds = ["user-1", "user-2", "user-3", "user-4"]
		queue.failOnCalls = new Set([2, 4])

		const result = await sut.execute({ title: "Aviso", message: "Mensagem" })

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({ recipients: 4 })
		expect(repository.notifications.size).toBe(4)
		expect(queue.published).toHaveLength(2)
		expect(logger.detecteErrorMethod).toBe(true)
	})

	test("falha de publicacao em um bloco nao impede a persistencia dos blocos seguintes", async () => {
		recipients.userIds = makeUserIds(501)
		queue.failOnCalls = new Set([1])

		const result = await sut.execute({ title: "Aviso", message: "Mensagem" })

		expect(result.isSuccess()).toBe(true)
		expect(repository.notifications.size).toBe(501)
	})

	describe("publico-alvo", () => {
		beforeEach(() => {
			recipients.userIds = ["admin-1", "member-1", "member-2"]
			recipients.adminIds = ["admin-1"]
		})

		function receivers(): string[] {
			return repository.notifications
				.toArray()
				.map((notification) => notification.userId)
				.sort()
		}

		test("MEMBERS cria notificacoes so para os alunos e chama o provider com o publico MEMBERS", async () => {
			const listActiveUserIds = vi.spyOn(recipients, "listActiveUserIds")

			const result = await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: "MEMBERS",
			})

			expect(result.isSuccess()).toBe(true)
			expect(result.force.success().value).toEqual({ recipients: 2 })
			expect(receivers()).toEqual(["member-1", "member-2"])
			expect(listActiveUserIds).toHaveBeenCalledTimes(1)
			expect(listActiveUserIds.mock.calls[0]?.[0].value).toBe("MEMBERS")
			expect(queue.published).toHaveLength(2)
		})

		test("ADMINS cria notificacoes so para os administradores", async () => {
			const result = await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: "ADMINS",
			})

			expect(result.force.success().value).toEqual({ recipients: 1 })
			expect(receivers()).toEqual(["admin-1"])
			expect(queue.published).toHaveLength(1)
		})

		test("ALL explicito cria notificacoes para administradores e alunos", async () => {
			const result = await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: "ALL",
			})

			expect(result.force.success().value).toEqual({ recipients: 3 })
			expect(receivers()).toEqual(["admin-1", "member-1", "member-2"])
		})

		test("audience omitido equivale a ALL", async () => {
			const listActiveUserIds = vi.spyOn(recipients, "listActiveUserIds")

			const result = await sut.execute({ title: "Aviso", message: "Mensagem" })

			expect(result.force.success().value).toEqual({ recipients: 3 })
			expect(receivers()).toEqual(["admin-1", "member-1", "member-2"])
			expect(listActiveUserIds.mock.calls[0]?.[0].value).toBe("ALL")
		})

		test.each([
			["minusculas", "all"],
			["nome em portugues", "todos"],
			["string vazia", ""],
			["papel do dominio user", "ADMIN"],
		])("audience invalido (%s) retorna InvalidNoticeError e nao cria nada", async (_, value) => {
			const listActiveUserIds = vi.spyOn(recipients, "listActiveUserIds")

			const result = await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: untrustedAudience(value),
			})

			expect(result.isFailure()).toBe(true)
			expect(result.value).toBeInstanceOf(InvalidNoticeError)
			expect(repository.notifications.size).toBe(0)
			expect(queue.published).toHaveLength(0)
			expect(listActiveUserIds).not.toHaveBeenCalled()
		})

		test("FR-012: o administrador remetente fora do publico MEMBERS nao recebe o aviso", async () => {
			const result = await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: "MEMBERS",
			})

			expect(result.isSuccess()).toBe(true)
			expect(receivers()).not.toContain("admin-1")
			expect(queue.published.map(({ data }) => data)).not.toContainEqual(
				expect.objectContaining({ userId: "admin-1" }),
			)
		})

		test("FR-010: usuarios fora do publico nao recebem notificacao persistida nem evento", async () => {
			await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: "ADMINS",
			})

			expect(receivers()).toEqual(["admin-1"])
			expect(queue.published.map(({ data }) => data)).toEqual([
				expect.objectContaining({ userId: "admin-1" }),
			])
		})

		test.each([
			{
				audience: "ADMINS",
				userIds: ["member-1", "member-2"],
				adminIds: [] as string[],
			},
			{
				audience: "MEMBERS",
				userIds: ["admin-1"],
				adminIds: ["admin-1"],
			},
		])("Review Focus: publico $audience sem nenhum usuario ativo conclui com 0 destinatarios, sem erro e sem notificacao", async ({
			audience,
			userIds,
			adminIds,
		}) => {
			recipients.userIds = userIds
			recipients.adminIds = adminIds
			const saveMany = vi.spyOn(repository, "saveMany")

			const result = await sut.execute({
				title: "Aviso",
				message: "Mensagem",
				audience: untrustedAudience(audience),
			})

			expect(result.isSuccess()).toBe(true)
			expect(result.force.success().value).toEqual({ recipients: 0 })
			expect(repository.notifications.size).toBe(0)
			expect(saveMany).not.toHaveBeenCalled()
			expect(queue.published).toHaveLength(0)
			expect(logger.detecteErrorMethod).toBe(false)
		})
	})
})
