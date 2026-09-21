# Task 1: Exclusão no domínio e no caso de uso [FR-004, FR-005, FR-006, FR-007]

**Status:** DONE
**PRD:** `../prd/prd-notification-delete.md`
**Spec:** `../specs/notification-delete-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Adiciona a exclusão lógica ao bounded context `notification` do backend: o método `softDelete()` na entidade `Notification` e o `DeleteNotificationUseCase`. O caso de uso carrega a notificação por `findById`, e devolve `NotificationNotFoundError` quando ela não existe, é de outro usuário ou já está excluída (o `findById` não filtra `deletedAt`, então a checagem de `isDeleted` é do caso de uso). Em sucesso aplica `softDelete()` e persiste com `save()`. O registro é preservado (só `deletedAt` é preenchido), o que atende à retenção. Não há mudança no repositório nem migration.

## Arquivos

- Modify: `apps/backend/src/notification/domain/notification.ts`
- Create: `apps/backend/src/notification/application/use-case/delete-notification.usecase.ts`
- Test: `apps/backend/src/notification/domain/notification.test.ts` (já existe; recebe um novo `describe`)
- Test: `apps/backend/src/notification/application/use-case/delete-notification.usecase.test.ts` (novo)

## Interfaces

- **Consome:** N/A
- **Produz:**
  - `Notification.softDelete(): void` (em `apps/backend/src/notification/domain/notification.ts`; preenche `deletedAt` e `updatedAt` com o mesmo `now`; no-op se `deletedAt` já estiver preenchido).
  - `export interface DeleteNotificationInput { notificationId: string; userId: string }`
  - `export type DeleteNotificationResponse = Either<NotificationNotFoundError, void>`
  - `DeleteNotificationUseCase.execute(input: DeleteNotificationInput): Promise<DeleteNotificationResponse>` (em `apps/backend/src/notification/application/use-case/delete-notification.usecase.ts`; classe `@injectable()` que recebe `NotificationRepository` via `@inject(NOTIFICATION_TYPES.Repositories.Notification)`).

### Conformidade com as Skills Padrão

- `no-workarounds`: correção pela causa raiz, sem supressões, sem type assertions; a checagem de `isDeleted` fica no caso de uso porque o `findById` não filtra excluídas
- `test-antipatterns`: os testes do caso de uso usam o `InMemoryNotificationRepository` real, sem mockar o que está sob teste
- `typescript-advanced`: tipos do `Either`, do input e da response do caso de uso

## Passos

- **Step 1: Confirmar o estado atual antes de escrever os testes**

Já existe um teste da entidade em `apps/backend/src/notification/domain/notification.test.ts` (com `describe("Notification.markAsRead()")`); confirme com:

Run: `ls apps/backend/src/notification/domain apps/backend/src/notification/application/use-case`
Expected: a listagem mostra `notification.test.ts` em `domain` e `mark-as-read.usecase.ts` em `use-case`, e NÃO mostra `delete-notification.usecase.ts`. Se `notification.test.ts` não existir, crie `apps/backend/src/notification/domain/notification.softdelete.test.ts` com o mesmo bloco `describe` abaixo (e seus imports) em vez de editar o arquivo existente. Confirme também que `Notification` não tem `softDelete` (`grep -n "softDelete" apps/backend/src/notification/domain/notification.ts` não retorna nada) e que os getters `deletedAt`, `updatedAt` e `isDeleted` existem.

- **Step 2: Write the failing test (entidade)**

Em `notification.test.ts`, troque a linha de import do vitest por:

```ts
import { afterEach, describe, expect, test, vi } from "vitest"
```

e acrescente ao final do arquivo:

```ts
describe("Notification.softDelete()", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	test("deve marcar a notificação como excluída sem alterar o restante [FR-004, FR-007]", () => {
		const notification = Notification.create({
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Aprovado",
		})

		expect(notification.isDeleted).toBe(false)
		notification.softDelete()

		expect(notification.isDeleted).toBe(true)
		expect(notification.deletedAt).toBeInstanceOf(Date)
		expect(notification.updatedAt).toEqual(notification.deletedAt)
		expect(notification.readAt).toBeUndefined()
		expect(notification.title).toBe("Check-in aprovado")
	})

	test("deve ser idempotente quando a notificação já está excluída", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T10:00:00Z"))
		const notification = Notification.create({
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Check-in aprovado",
			message: "Aprovado",
		})

		notification.softDelete()
		const firstDeletedAt = notification.deletedAt

		vi.setSystemTime(new Date("2026-01-01T11:00:00Z"))
		notification.softDelete()

		expect(notification.deletedAt).toEqual(firstDeletedAt)
		expect(notification.updatedAt).toEqual(firstDeletedAt)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/notification.test.ts`
Expected: FAIL nos dois testes de `Notification.softDelete()` com `TypeError: notification.softDelete is not a function`; os demais testes do arquivo continuam passando.

- **Step 4: Write minimal implementation (entidade)**

Em `notification.ts`, logo abaixo de `markAsRead()`:

```ts
	public softDelete(): void {
		if (this._props.deletedAt !== undefined) {
			return
		}

		const now = new Date()
		this._props.deletedAt = now
		this._props.updatedAt = now
	}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/domain/notification.test.ts`
Expected: PASS (todos os testes do arquivo).

- **Step 6: Write the failing test (caso de uso: sucesso, inexistente, de outro usuário)**

Crie `apps/backend/src/notification/application/use-case/delete-notification.usecase.test.ts`:

```ts
import { beforeEach, describe, expect, test } from "vitest"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error"
import { Notification } from "@/notification/domain/notification"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository"

import { DeleteNotificationUseCase } from "./delete-notification.usecase"

describe("DeleteNotificationUseCase", () => {
	let repository: InMemoryNotificationRepository
	let sut: DeleteNotificationUseCase

	beforeEach(() => {
		repository = new InMemoryNotificationRepository()
		sut = new DeleteNotificationUseCase(repository)
	})

	test("deve excluir a notificação do usuário e ela some da listagem, preservando o registro [FR-005, FR-007]", async () => {
		const notification = Notification.create({
			id: "notif-1",
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		})
		await repository.save(notification)

		const result = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})

		expect(result.isSuccess()).toBe(true)
		const stored = await repository.findById("notif-1")
		expect(stored).not.toBeNull()
		expect(stored?.isDeleted).toBe(true)
		const listed = await repository.findManyByUserId({
			userId: "user-1",
			page: 1,
		})
		expect(listed.items).toHaveLength(0)
		expect(listed.total).toBe(0)
	})

	test("deve retornar NotificationNotFoundError quando a notificação não existe [FR-006]", async () => {
		const result = await sut.execute({
			notificationId: "unknown",
			userId: "user-1",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotificationNotFoundError)
	})

	test("deve retornar NotificationNotFoundError e não alterar a notificação de outro usuário [FR-004, FR-006]", async () => {
		const notification = Notification.create({
			id: "notif-1",
			userId: "user-2",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		})
		await repository.save(notification)

		const result = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotificationNotFoundError)
		const stored = await repository.findById("notif-1")
		expect(stored?.isDeleted).toBe(false)
		const ownerList = await repository.findManyByUserId({
			userId: "user-2",
			page: 1,
		})
		expect(ownerList.items).toHaveLength(1)
	})
})
```

- **Step 7: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/delete-notification.usecase.test.ts`
Expected: FAIL com erro de resolução de import: `./delete-notification.usecase` não existe.

- **Step 8: Write minimal implementation (caso de uso)**

Crie `apps/backend/src/notification/application/use-case/delete-notification.usecase.ts` (os imports são os mesmos de `mark-as-read.usecase.ts`):

```ts
import { inject, injectable } from "inversify"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { NotificationNotFoundError } from "@/notification/domain/errors/notification-not-found-error.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types.js"

export interface DeleteNotificationInput {
	notificationId: string
	userId: string
}

export type DeleteNotificationResponse = Either<
	NotificationNotFoundError,
	void
>

@injectable()
export class DeleteNotificationUseCase {
	constructor(
		@inject(NOTIFICATION_TYPES.Repositories.Notification)
		private readonly notificationRepository: NotificationRepository,
	) {}

	public async execute(
		input: DeleteNotificationInput,
	): Promise<DeleteNotificationResponse> {
		const notification = await this.notificationRepository.findById(
			input.notificationId,
		)
		if (!notification) {
			return failure(new NotificationNotFoundError())
		}
		if (notification.userId !== input.userId) {
			return failure(new NotificationNotFoundError())
		}
		notification.softDelete()
		await this.notificationRepository.save(notification)
		return success(undefined)
	}
}
```

- **Step 9: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/delete-notification.usecase.test.ts`
Expected: PASS (3 testes).

- **Step 10: Write the failing test (Review Focus: exclusão repetida)**

Review Focus: Excluir de novo uma notificação já excluída via API: 404, nunca 204

Acrescente dentro do `describe("DeleteNotificationUseCase")`, depois do último teste:

```ts
	test("Review Focus: excluir de novo uma notificação já excluída retorna NotificationNotFoundError, nunca sucesso [FR-006]", async () => {
		const notification = Notification.create({
			id: "notif-1",
			userId: "user-1",
			type: "CHECK_IN_APPROVED",
			title: "Aprovado",
			message: "Aprovado",
		})
		await repository.save(notification)
		const first = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})
		expect(first.isSuccess()).toBe(true)

		const second = await sut.execute({
			notificationId: "notif-1",
			userId: "user-1",
		})

		expect(second.isFailure()).toBe(true)
		expect(second.value).toBeInstanceOf(NotificationNotFoundError)
	})
```

- **Step 11: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/delete-notification.usecase.test.ts`
Expected: FAIL no teste de exclusão repetida (`expected false to be true` em `second.isFailure()`), porque o `findById` do repositório em memória não filtra excluídas e o caso de uso ainda não checa `isDeleted`; os 3 testes anteriores passam.

- **Step 12: Write minimal implementation (checagem de isDeleted)**

Em `delete-notification.usecase.ts`, troque o segundo `if` de posse por uma checagem que também cobre a notificação já excluída:

```ts
		if (notification.userId !== input.userId || notification.isDeleted) {
			return failure(new NotificationNotFoundError())
		}
```

(remova o `if (notification.userId !== input.userId)` isolado; o primeiro `if (!notification)` continua.)

- **Step 13: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/delete-notification.usecase.test.ts`
Expected: PASS (4 testes).

- **Step 14: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário pule este passo e reporte os arquivos)*

```bash
git add apps/backend/src/notification/domain/notification.ts apps/backend/src/notification/domain/notification.test.ts apps/backend/src/notification/application/use-case/delete-notification.usecase.ts apps/backend/src/notification/application/use-case/delete-notification.usecase.test.ts
git commit -m "feat(notification-delete): adiciona exclusao logica no dominio e no caso de uso" -m "Claude-Session: https://claude.ai/code/session_01PgFG13SHLTeWfds7Pinf2j"
```

## Critérios de Sucesso

- `Notification.softDelete()` preenche `deletedAt` e `updatedAt`, não altera `readAt` nem os demais campos, e é idempotente [FR-007].
- Excluir uma notificação do próprio usuário devolve sucesso, persiste `deletedAt` e a notificação deixa de aparecer em `findManyByUserId`, mas o registro continua existindo em `findById` [FR-005, FR-007].
- Notificação inexistente, de outro usuário ou já excluída devolve `NotificationNotFoundError`; a notificação de outro usuário permanece intacta na caixa do dono [FR-004, FR-006].
