# Task 3: Provider Prisma filtra destinatários por papel [FR-007, FR-008, FR-009, FR-011]

**Status:** DONE
**Verified:** `bash -c cd apps/backend && DATABASE_URL='postgresql://docker:docker@localhost:5432/test?schema=public' npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts` → exit 0
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-01, task-02

## Visão Geral

`PrismaActiveRecipientsProvider.listActiveUserIds(audience)` passa a filtrar na query: sempre `status: "activated"` e `deleted_at: null`, mais `role: "MEMBER"` para `MEMBERS`, `role: "ADMIN"` para `ADMINS` e nenhum filtro de papel para `ALL`. A tradução de público para papel vive só nesta classe (decisão D1 do spec), pois o domínio `notification` não conhece `Role`. O enum do Prisma é `Role { ADMIN MEMBER }`. O teste de integração passa a criar usuários de cada papel e de cada estado (ativo, suspenso, bloqueado, removido) e prova, para cada público, o conjunto exato de destinatários.

## Arquivos

- Modify: `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.ts`
- Test: `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: o filtro por papel acontece na query do Prisma (não carregar usuários para descartar em memória) e o teste roda contra o banco real; nada de mock do `PrismaClient`.
- `test-antipatterns`: cada teste cria explicitamente os usuários de cada papel e estado que precisa (o risco "seed com poucos admins mascara erro de filtro" do spec) e limpa o que criou; asserções por `toContain`/`not.toContain` porque o banco pode ter outras linhas.

## Passos

- **Step 1: Confirmar que o banco está disponível**

O teste de integração exige PostgreSQL. Run: `pnpm --filter backend docker:up`
Expected: os serviços (PostgreSQL, Redis, RabbitMQ) sobem sem erro. Se o Docker estiver indisponível neste ambiente, registrar a limitação no relatório da task, escrever o código e o teste normalmente e deixar os passos 2 e 4 marcados como pendentes de execução, sem substituir o teste por um mock. Se o banco já estiver ativo e a migration aplicada, seguir adiante.

- **Step 2: Write the failing test**

Review Focus: usuário suspenso, bloqueado ou removido com o papel do público escolhido não recebe o aviso

Substituir o conteúdo de `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import { afterAll, afterEach, describe, expect, test } from "vitest"
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience"
import { PrismaActiveRecipientsProvider } from "@/notification/infra/provider/prisma/prisma-active-recipients.provider"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"

type UserStatusValue = "activated" | "suspended" | "locked"
type UserRoleValue = "ADMIN" | "MEMBER"

interface CreateUserProps {
	role: UserRoleValue
	status: UserStatusValue
	deletedAt?: Date
}

const createdUserIds: string[] = []

async function createUser({ role, status, deletedAt }: CreateUserProps) {
	const id = randomUUID()
	createdUserIds.push(id)
	await prismaClient.user.create({
		data: {
			id,
			name: `Usuario ${role} ${status}`,
			email: `recipients-${id}@example.com`,
			password_hash: "hashed-password",
			role,
			status,
			deleted_at: deletedAt ?? null,
		},
	})
	return id
}

function audience(value: string): NoticeAudience {
	return NoticeAudience.create(value).force.success().value
}

describe("PrismaActiveRecipientsProvider", () => {
	const sut = new PrismaActiveRecipientsProvider(prismaClient)

	afterEach(async () => {
		await prismaClient.user.deleteMany({
			where: { id: { in: createdUserIds } },
		})
		createdUserIds.length = 0
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	test("lista apenas usuarios activated e exclui suspended e locked", async () => {
		const activatedId = await createUser({
			role: "MEMBER",
			status: "activated",
		})
		const suspendedId = await createUser({
			role: "MEMBER",
			status: "suspended",
		})
		const lockedId = await createUser({ role: "MEMBER", status: "locked" })

		const ids = await sut.listActiveUserIds(NoticeAudience.all())

		expect(ids).toContain(activatedId)
		expect(ids).not.toContain(suspendedId)
		expect(ids).not.toContain(lockedId)
	})

	test("usuario activated com deleted_at preenchido nao recebe o aviso", async () => {
		const activeId = await createUser({ role: "MEMBER", status: "activated" })
		const removedId = await createUser({
			role: "MEMBER",
			status: "activated",
			deletedAt: new Date(),
		})

		const ids = await sut.listActiveUserIds(NoticeAudience.all())

		expect(ids).toContain(activeId)
		expect(ids).not.toContain(removedId)
	})

	test("FR-009: ALL traz os ativos de ambos os papeis", async () => {
		const memberId = await createUser({ role: "MEMBER", status: "activated" })
		const adminId = await createUser({ role: "ADMIN", status: "activated" })

		const ids = await sut.listActiveUserIds(audience("ALL"))

		expect(ids).toContain(memberId)
		expect(ids).toContain(adminId)
	})

	test("FR-007: MEMBERS traz so os ativos com papel MEMBER", async () => {
		const memberId = await createUser({ role: "MEMBER", status: "activated" })
		const adminId = await createUser({ role: "ADMIN", status: "activated" })

		const ids = await sut.listActiveUserIds(audience("MEMBERS"))

		expect(ids).toContain(memberId)
		expect(ids).not.toContain(adminId)
	})

	test("FR-008: ADMINS traz so os ativos com papel ADMIN", async () => {
		const memberId = await createUser({ role: "MEMBER", status: "activated" })
		const adminId = await createUser({ role: "ADMIN", status: "activated" })

		const ids = await sut.listActiveUserIds(audience("ADMINS"))

		expect(ids).toContain(adminId)
		expect(ids).not.toContain(memberId)
	})

	test.each([
		["MEMBERS", "MEMBER"],
		["ADMINS", "ADMIN"],
	] as const)("Review Focus: com o publico %s, usuario %s suspenso, bloqueado ou removido nao recebe o aviso", async (audienceValue, role) => {
		const activeId = await createUser({ role, status: "activated" })
		const suspendedId = await createUser({ role, status: "suspended" })
		const lockedId = await createUser({ role, status: "locked" })
		const removedId = await createUser({
			role,
			status: "activated",
			deletedAt: new Date(),
		})

		const ids = await sut.listActiveUserIds(audience(audienceValue))

		expect(ids).toContain(activeId)
		expect(ids).not.toContain(suspendedId)
		expect(ids).not.toContain(lockedId)
		expect(ids).not.toContain(removedId)
	})

	test("FR-011: com ALL, administradores suspensos, bloqueados ou removidos tambem ficam de fora", async () => {
		const activeAdminId = await createUser({
			role: "ADMIN",
			status: "activated",
		})
		const suspendedAdminId = await createUser({
			role: "ADMIN",
			status: "suspended",
		})
		const removedAdminId = await createUser({
			role: "ADMIN",
			status: "activated",
			deletedAt: new Date(),
		})

		const ids = await sut.listActiveUserIds(audience("ALL"))

		expect(ids).toContain(activeAdminId)
		expect(ids).not.toContain(suspendedAdminId)
		expect(ids).not.toContain(removedAdminId)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
Expected: FAIL com exatamente 2 falhas. O provider atual ignora o argumento, então o teste `FR-007` falha em `expect(ids).not.toContain(adminId)` e o teste `FR-008` falha em `expect(ids).not.toContain(memberId)`. Os demais testes (inclusive os dois do `Review Focus`, que criam só usuários do papel alvo e já são excluídos pelo filtro de status e de `deleted_at` existente) passam: eles fixam o comportamento que o novo filtro por papel não pode quebrar.

- **Step 4: Write minimal implementation**

Substituir `apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.ts`:

```ts
import { inject, injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class PrismaActiveRecipientsProvider
	implements ActiveRecipientsProvider
{
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient,
	) {}

	public async listActiveUserIds(audience: NoticeAudience): Promise<string[]> {
		const users = await this.prismaClient.user.findMany({
			where: {
				status: "activated",
				deleted_at: null,
				...this.roleFilter(audience),
			},
			select: { id: true },
		})
		return users.map((user) => user.id)
	}

	private roleFilter(
		audience: NoticeAudience,
	): { role: "MEMBER" | "ADMIN" } | undefined {
		switch (audience.value) {
			case "MEMBERS":
				return { role: "MEMBER" }
			case "ADMINS":
				return { role: "ADMIN" }
			case "ALL":
				return undefined
		}
	}
}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts`
Expected: PASS (8 testes: 2 existentes + FR-009 + FR-007 + FR-008 + 2 do Review Focus + FR-011).

- **Step 6: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.ts apps/backend/src/notification/infra/provider/prisma/prisma-active-recipients.provider.integration-test.ts
git commit -m "feat(notice-audience): provider Prisma filtra destinatarios por papel"
```

## Critérios de Sucesso

- `ALL` lista os usuários ativos e não removidos dos dois papéis (FR-009); `MEMBERS` só os de papel `MEMBER` (FR-007); `ADMINS` só os de papel `ADMIN` (FR-008).
- Em qualquer público, usuário suspenso, bloqueado ou removido (`deleted_at` preenchido) não aparece (FR-011), inclusive quando tem o papel do público escolhido.
- O tipo `Role` do contexto `user` não é importado no domínio `notification`; a tradução público para papel vive apenas em `PrismaActiveRecipientsProvider`.
