# Task 4: Caso de uso de broadcast do aviso [FR-006, FR-010, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** task-01, task-02, task-03

## Visão Geral

`BroadcastNoticeUseCase` valida o comando (título e mensagem com `trim`, 1-100 e 1-500 caracteres; inválido retorna `failure(InvalidNoticeError)`), obtém os ids de usuários ativos por `ActiveRecipientsProvider`, divide em blocos de 500, cria uma `Notification` de tipo `NOTICE` por destinatário, persiste com `saveMany` e publica cada uma em `EXCHANGES.NOTIFICATION_CREATED`. A publicação é best-effort: falhas são logadas com `logger.error` e nunca falham o caso de uso nem apagam o que já foi persistido (FR-010). Retorna `success({ recipients })`. Como o `@inject` do use case precisa de identificadores do container, esta task acrescenta `Providers.ActiveRecipients` e `UseCases.BroadcastNotice` a `NOTIFICATION_TYPES`; os bindings ficam na task 5.

## Arquivos

- Create: `apps/backend/src/notification/domain/errors/invalid-notice-error.ts`
- Create: `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`
- Test: `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a falha de publicação é tratada com captura explícita e log de erro, sem `catch` vazio; a validação retorna `Either` em vez de lançar exceção.
- `test-antipatterns`: repositório e provider são os in-memory reais; a fila é um fake com contrato completo (`Queue`), e as asserções recaem sobre estado observável (notificações persistidas, payloads publicados), não sobre chamadas internas.
- `typescript-advanced`: o retorno é `Either<InvalidNoticeError, { recipients: number }>` e o fake de fila implementa `Queue` sem casts.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/backend/src/notification/application/use-case/broadcast-notice.usecase.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
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
		["titulo com 101 caracteres", { title: "a".repeat(101), message: "Mensagem" }],
		["mensagem vazia", { title: "Aviso", message: "" }],
		["mensagem so com espacos", { title: "Aviso", message: "   " }],
		["mensagem com 501 caracteres", { title: "Aviso", message: "a".repeat(501) }],
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
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts`
Expected: FAIL - não foi possível resolver `invalid-notice-error.js` e `broadcast-notice.usecase.js` (módulos inexistentes).

- **Step 3: Write minimal implementation**

3a. Identificadores no container:

```ts
// apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts
// em UseCases, acrescentar:
		BroadcastNotice: Symbol.for("BroadcastNoticeUseCase"),
// e criar o grupo novo, ao lado de Repositories:
	Providers: {
		ActiveRecipients: Symbol.for("ActiveRecipientsProvider"),
	},
```

3b. Erro de domínio:

```ts
// apps/backend/src/notification/domain/errors/invalid-notice-error.ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidNoticeError extends DomainError {
	public readonly kind = "validation" as const

	constructor(message: string) {
		super(message)
		this.name = "InvalidNoticeError"
	}
}
```

3c. Caso de uso. Nesta versão mínima a publicação ainda NÃO tem tratamento de falha (o passo 7 adiciona, guiado por teste):

```ts
// apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts
import { inject, injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import { Notification } from "@/notification/domain/notification.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { Logger } from "@/shared/infra/logger/logger.js"
import { EXCHANGES } from "@/shared/infra/queue/exchanges.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import type { NotificationCreatedPayload } from "../event-handler/create-notification-on-check-in-event.handler.js"

export const BROADCAST_CHUNK_SIZE = 500
export const NOTICE_TITLE_MAX = 100
export const NOTICE_MESSAGE_MAX = 500

export interface BroadcastNoticeInput {
	title: string
	message: string
}

export interface BroadcastNoticeOutput {
	recipients: number
}

export type BroadcastNoticeResponse = Either<
	InvalidNoticeError,
	BroadcastNoticeOutput
>

@injectable()
export class BroadcastNoticeUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
		@inject(NOTIFICATION_TYPES.Providers.ActiveRecipients)
		private readonly activeRecipientsProvider: ActiveRecipientsProvider,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async execute(
		input: BroadcastNoticeInput,
	): Promise<BroadcastNoticeResponse> {
		const title = input.title.trim()
		const message = input.message.trim()
		const invalid = this.validate(title, message)
		if (invalid) return failure(invalid)
		const userIds = await this.activeRecipientsProvider.listActiveUserIds()
		for (const block of this.toBlocks(userIds)) {
			const notifications = block.map((userId) =>
				Notification.create({ userId, type: "NOTICE", title, message }),
			)
			await this.notificationRepository.saveMany(notifications)
			await this.publishAll(notifications)
		}
		return success({ recipients: userIds.length })
	}

	private validate(title: string, message: string): InvalidNoticeError | null {
		if (title.length < 1 || title.length > NOTICE_TITLE_MAX) {
			return new InvalidNoticeError(
				`Title must have between 1 and ${NOTICE_TITLE_MAX} characters`,
			)
		}
		if (message.length < 1 || message.length > NOTICE_MESSAGE_MAX) {
			return new InvalidNoticeError(
				`Message must have between 1 and ${NOTICE_MESSAGE_MAX} characters`,
			)
		}
		return null
	}

	private toBlocks(userIds: string[]): string[][] {
		const blocks: string[][] = []
		for (let start = 0; start < userIds.length; start += BROADCAST_CHUNK_SIZE) {
			blocks.push(userIds.slice(start, start + BROADCAST_CHUNK_SIZE))
		}
		return blocks
	}

	private async publishAll(notifications: Notification[]): Promise<void> {
		for (const notification of notifications) {
			await this.queue.publish<NotificationCreatedPayload>(
				EXCHANGES.NOTIFICATION_CREATED,
				{
					notificationId: notification.id,
					userId: notification.userId,
					type: notification.type,
					title: notification.title,
					message: notification.message,
				},
			)
		}
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts`
Expected: PASS (todos os casos do passo 1).

- **Step 5: Review Focus: Nenhum usuário ativo → 201 com `recipients: 0`, sem erro e sem publicar na fila. Write the test**

Review Focus: Nenhum usuário ativo → 201 com `recipients: 0`, sem erro e sem publicar na fila

Adicionar ao `describe`:

```ts
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
```

- **Step 6: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts -t "Review Focus: nenhum usuario ativo"`
Expected: PASS. É um teste de caracterização: `toBlocks([])` devolve zero blocos, então o laço não chama `saveMany` nem publica. Se falhar, corrigir o caso de uso (não o teste).

- **Step 7: Review Focus: Falha ao publicar na fila para alguns usuários → resposta de sucesso e notificações persistidas. Write the failing test**

Review Focus: Falha ao publicar na fila para alguns usuários → resposta de sucesso e notificações persistidas

Adicionar ao `describe`:

```ts
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
```

- **Step 8: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts -t "falha"`
Expected: FAIL - a rejeição `broker indisponivel` propaga de `execute` (`Error: broker indisponivel`), porque `publishAll` não trata falhas.

- **Step 9: Tornar a publicação best-effort**

```ts
// broadcast-notice.usecase.ts: substituir publishAll por
	private async publishAll(notifications: Notification[]): Promise<void> {
		const outcomes = await Promise.allSettled(
			notifications.map((notification) => this.publish(notification)),
		)
		for (const outcome of outcomes) {
			if (outcome.status === "rejected") {
				this.logger.error(
					this,
					`Falha ao publicar aviso em ${EXCHANGES.NOTIFICATION_CREATED}: ${String(outcome.reason)}`,
				)
			}
		}
	}

	private publish(notification: Notification): Promise<void> {
		return this.queue.publish<NotificationCreatedPayload>(
			EXCHANGES.NOTIFICATION_CREATED,
			{
				notificationId: notification.id,
				userId: notification.userId,
				type: notification.type,
				title: notification.title,
				message: notification.message,
			},
		)
	}
```

O Postgres é a fonte de verdade: `saveMany` roda antes da publicação e nada apaga o persistido.

- **Step 10: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts`
Expected: PASS (arquivo inteiro).

- **Step 11: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/backend/src/notification/domain/errors/invalid-notice-error.ts apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts apps/backend/src/notification/application/use-case/broadcast-notice.usecase.test.ts apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts
git commit -m "feat(notification): adiciona caso de uso de broadcast de aviso"
```

## Critérios de Sucesso

- Uma notificação `NOTICE` por destinatário ativo, com título e mensagem informados, incluindo o administrador remetente; `recipients` bate com o número criado (FR-006, FR-012).
- Blocos de 500: 500 destinatários geram uma chamada a `saveMany`, 501 geram duas (500 e 1).
- Sem destinatários: `success({ recipients: 0 })`, sem `saveMany` e sem publicar.
- Falha de publicação é logada com `logger.error` e não falha o caso de uso nem remove notificações persistidas (FR-010).
- Título ou mensagem fora de 1-100 / 1-500 (após `trim`) retornam `InvalidNoticeError` e não criam nada.
