# Task 4: Caso de uso repassa o público e trata público sem usuários [FR-010, FR-012, FR-013]

**Status:** DONE
**Verified:** `bash -c cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts` → exit 0
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-01, task-02

## Visão Geral

`BroadcastNoticeUseCase` passa a receber `audience?: NoticeAudienceTypes` em `BroadcastNoticeInput`. O `execute` faz `NoticeAudience.create(input.audience ?? "ALL")`, devolve `failure` se o valor for inválido (sem criar nada) e chama `listActiveUserIds(audience)` com o value object, no lugar da chamada provisória `NoticeAudience.all()` deixada pela task-02. O fan-out em blocos de 500, `saveMany` e a publicação em `notificationCreated` não mudam. O remetente não tem tratamento especial (FR-012): recebe o aviso só se o público incluir administradores. Um público sem nenhum usuário ativo conclui com `success({ recipients: 0 })`, sem notificação e sem publicação (FR-013). A ordem de validação é: título e mensagem primeiro (como hoje), depois o público, e só então a consulta ao provider.

## Arquivos

- Modify: `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts`
- Test: `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: o valor de público inválido é recusado pelo `NoticeAudience.create` no use case e vira `failure`, sem `try/catch` engolindo nada e sem cair em `ALL` por fallback; o caso sem usuários é tratado pelo fluxo normal (lista vazia gera zero blocos), sem `if` especial.
- `test-antipatterns`: o teste roda o use case com o provider in-memory real semeando `userIds` e `adminIds`; as asserções são sobre o resultado observável (quem recebeu notificação, o que foi publicado). O único espião é `vi.spyOn(repository, "saveMany")`, padrão já usado neste arquivo, para provar que nada é persistido no caso vazio.
- `typescript-advanced`: `BroadcastNoticeInput.audience` é tipado por `NoticeAudienceTypes`; a asserção de tipo do teste de valor inválido fica isolada em um único helper, com comentário do motivo.

## Passos

- **Step 1: Write the failing test**

Review Focus: público sem nenhum usuário ativo (por exemplo, só Administradores e nenhum admin ativo) conclui com 0 destinatários, sem erro e sem notificação criada

Em `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.test.ts`, adicionar o import (junto dos demais):

```ts
import type { NoticeAudienceTypes } from "@/notification/domain/value-object/notice-audience.js"
```

Adicionar o helper logo abaixo de `makeUserIds`:

```ts
// Simula um valor que chegou de fora do dominio sem ter sido validado: o
// comportamento sob teste e justamente a validacao em runtime do use case.
function untrustedAudience(value: string): NoticeAudienceTypes {
	return value as NoticeAudienceTypes
}
```

Adicionar, ao final do `describe("BroadcastNoticeUseCase", ...)` (antes do `})` de fechamento):

```ts
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
		])("Review Focus: publico $audience sem nenhum usuario ativo conclui com 0 destinatarios, sem erro e sem notificacao", async ({ audience, userIds, adminIds }) => {
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
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts`
Expected: FAIL. O use case atual ignora `audience` e usa sempre `NoticeAudience.all()`: falham `MEMBERS` (recebeu 3, esperado 2), `ADMINS`, os 4 casos de `audience invalido` (`result.isFailure()` é `false`), `FR-012`, `FR-010` e os 2 do `Review Focus` (`recipients` 3 e 1 em vez de 0). Passam: `ALL explicito` e `audience omitido equivale a ALL`, além dos 17 testes anteriores.

- **Step 3: Write minimal implementation**

Em `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts`, trocar o import do value object para:

```ts
import {
	NoticeAudience,
	NoticeAudienceValues,
	type NoticeAudienceTypes,
} from "@/notification/domain/value-object/notice-audience.js"
```

Atualizar o input:

```ts
export interface BroadcastNoticeInput {
	title: string
	message: string
	audience?: NoticeAudienceTypes
}
```

Atualizar o `execute` (o restante do arquivo permanece igual):

```ts
	public async execute(
		input: BroadcastNoticeInput,
	): Promise<BroadcastNoticeResponse> {
		const title = input.title.trim()
		const message = input.message.trim()
		const invalid = this.validate(title, message)
		if (invalid) return failure(invalid)
		const audience = NoticeAudience.create(
			input.audience ?? NoticeAudienceValues.ALL,
		)
		if (audience.isFailure()) return failure(audience.value)
		const userIds = await this.activeRecipientsProvider.listActiveUserIds(
			audience.value,
		)
		for (const block of this.toBlocks(userIds)) {
			const notifications = block.map((userId) =>
				Notification.create({ userId, type: "NOTICE", title, message }),
			)
			await this.notificationRepository.saveMany(notifications)
			await this.publishAll(notifications)
		}
		return success({ recipients: userIds.length })
	}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts`
Expected: PASS (17 testes existentes + 12 novos = 29).

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts apps/backend/src/notification/application/use-case/broadcast-notice.usecase.test.ts
git commit -m "feat(notice-audience): caso de uso repassa o publico ao provider"
```

## Critérios de Sucesso

- `audience` `MEMBERS` e `ADMINS` criam notificações e publicações só para os IDs devolvidos pelo provider para aquele público (FR-010); `ALL` e `audience` omitido alcançam todos (público omitido equivale a ALL, coberto na task 5).
- O administrador remetente é tratado como qualquer usuário: com `MEMBERS` ele não recebe (FR-012).
- Um público sem nenhum usuário ativo devolve `success({ recipients: 0 })`, sem `saveMany`, sem publicação e sem log de erro (FR-013).
- Um `audience` fora dos três valores devolve `failure(InvalidNoticeError)`, sem consultar o provider e sem criar notificação.
