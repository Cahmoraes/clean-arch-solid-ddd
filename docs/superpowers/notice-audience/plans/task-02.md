# Task 2: Porta ActiveRecipientsProvider e provider in-memory filtram por público [FR-007, FR-008, FR-009, FR-011]

**Status:** DONE
**Verified:** `bash -c cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts` → exit 0
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

A porta `ActiveRecipientsProvider` passa a exigir o público: `listActiveUserIds(audience: NoticeAudience): Promise<string[]>`. O provider in-memory ganha o campo público `adminIds: string[] = []` (subconjunto de `userIds` que são administradores) e filtra: `ALL` devolve todos os `userIds`, `ADMINS` devolve os `userIds` que estão em `adminIds`, `MEMBERS` devolve os `userIds` que não estão em `adminIds`. Assim os testes existentes, que só preenchem `userIds`, continuam válidos (sem `adminIds` todo mundo é aluno). Como a assinatura da porta muda, a única chamada existente em `broadcast-notice.usecase.ts` passa a `listActiveUserIds(NoticeAudience.all())`, sem mudança de comportamento (apenas para compilar); o repasse real do público é a task-04. A implementação Prisma é a task-03 e continua sem compilar contra a nova porta até lá; esta task deixa limpos os arquivos que toca.

## Arquivos

- Modify: `apps/backend/src/notification/application/provider/active-recipients.provider.ts`
- Modify: `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.ts`
- Modify: `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts`
- Test: `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: o filtro por público é feito de fato no provider in-memory (não ignorar o parâmetro nem filtrar no teste); a chamada provisória do use case com `NoticeAudience.all()` é a semântica atual ("Todos"), não um atalho.
- `test-antipatterns`: os testes rodam o provider real com dados semeados de cada papel; nada de mock do próprio provider; o campo `adminIds` é público apenas porque `userIds` já é o ponto de semeadura do double (nenhum método só de teste é criado).
- `typescript-advanced`: o `switch` sobre `audience.value` é exaustivo sobre `NoticeAudienceTypes`, sem `default`, então um novo valor quebra a compilação em vez de cair em silêncio.

## Passos

- **Step 1: Write the failing test**

Substituir o conteúdo de `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts`:

```ts
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

		expect(await sut.listActiveUserIds(audience("ADMINS"))).toEqual([
			"admin-1",
		])
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
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts`
Expected: FAIL. O provider atual ignora o argumento e nao conhece `adminIds`: os testes de `MEMBERS` e `ADMINS` (e o de FR-011) falham com `expected [ ... ] to deeply equal [ ... ]` mostrando todos os ids; os testes de `ALL`, "comeca sem destinatarios" e as copias de `ALL` passam. O vitest não checa tipos, então a chamada com argumento não causa erro de execução.

- **Step 3: Write minimal implementation**

Substituir `apps/backend/src/notification/application/provider/active-recipients.provider.ts`:

```ts
import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"

export interface ActiveRecipientsProvider {
	listActiveUserIds(audience: NoticeAudience): Promise<string[]>
}
```

Substituir `apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.ts`:

```ts
import { injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"

@injectable()
export class InMemoryActiveRecipientsProvider
	implements ActiveRecipientsProvider
{
	public userIds: string[] = []
	public adminIds: string[] = []

	public async listActiveUserIds(audience: NoticeAudience): Promise<string[]> {
		switch (audience.value) {
			case "ADMINS":
				return this.userIds.filter((userId) => this.isAdmin(userId))
			case "MEMBERS":
				return this.userIds.filter((userId) => !this.isAdmin(userId))
			case "ALL":
				return [...this.userIds]
		}
	}

	private isAdmin(userId: string): boolean {
		return this.adminIds.includes(userId)
	}
}
```

Em `apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts`, adicionar o import e trocar a única chamada (comportamento inalterado; o repasse do público escolhido é a task-04):

```ts
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
```

```ts
		const userIds = await this.activeRecipientsProvider.listActiveUserIds(
			NoticeAudience.all(),
		)
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts`
Expected: PASS (11 testes).

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/broadcast-notice.usecase.test.ts`
Expected: PASS (17 testes, comportamento inalterado pois a chamada usa `NoticeAudience.all()`).

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/notification/application/provider/active-recipients.provider.ts apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.ts apps/backend/src/notification/infra/provider/in-memory/in-memory-active-recipients.provider.test.ts apps/backend/src/notification/application/use-case/broadcast-notice.usecase.ts
git commit -m "feat(notice-audience): porta e provider in-memory filtram por publico"
```

## Critérios de Sucesso

- A porta `ActiveRecipientsProvider.listActiveUserIds` exige um `NoticeAudience`.
- Provider in-memory: `ALL` devolve todos (FR-009), `MEMBERS` só os que não são administradores (FR-007), `ADMINS` só os administradores (FR-008), e um id em `adminIds` que não está em `userIds` nunca é listado (FR-011).
- Os testes existentes do use case e do provider, que só preenchem `userIds`, continuam passando sem alteração de semântica.
