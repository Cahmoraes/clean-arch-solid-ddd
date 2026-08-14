# Task 11: Modelo UserActivityEvent (Prisma + migration) + UserActivityRepository (interface + implementações) [FR-001]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Criar a tabela `user_activity_events` (modelo Prisma `UserActivityEvent`) que vai armazenar os eventos de atividade de conta gravados por `RecordUserActivitySubscriber` (task 12), e o par interface + implementações do lado de escrita: `UserActivityRepository` (interface, método `record`), `PrismaUserActivityRepository` (produção) e `InMemoryUserActivityRepository` (dev/test). Nota de correção de path: a spec de design sugeriu `user/infra/gateway/*.ts`, mas a convenção real do projeto (confirmada lendo `prisma-user-repository.ts`) é `shared/infra/database/repository/prisma/*.ts` — usar os caminhos abaixo, não os da spec (FR-001).

O par InMemory/Prisma segue exatamente o padrão já usado por `UserRepositoryProvider` (`shared/infra/ioc/module/user/user-repository-provider.ts`): em ambiente não-produção o container resolve a implementação in-memory; em produção, a implementação Prisma. A classe `UserActivityRepositoryProvider` e o bind no `user-module.ts` ficam a cargo da task 12 (que também cria o subscriber que consome este repositório) — esta task entrega apenas o modelo de dados e as duas implementações da interface.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: migration Prisma (gerada por `npx prisma migrate dev --name add_user_activity_event`)
- Create: `apps/backend/src/user/application/persistence/repository/user-activity-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-activity-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-activity-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-activity-repository.integration-test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: a interface `UserActivityRepository` e o DTO `RecordUserActivityInput` precisam tipar `metadata` como `Record<string, unknown>` opcional, compatível com o campo `Json?` do Prisma.
- `test-antipatterns`: o teste de integração usa o `prismaClient` real (não mocka o Prisma), seguindo o padrão já estabelecido em `prisma-subscription-repository.integration-test.ts` — cria e limpa dados reais no banco de teste.

## Passos

- **Step 1: Escrever o teste de integração falhando**

```typescript
// apps/backend/src/shared/infra/database/repository/prisma/prisma-user-activity-repository.integration-test.ts
import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaUserActivityRepository } from "@/shared/infra/database/repository/prisma/prisma-user-activity-repository"

async function createTestUser() {
	const userId = randomUUID()
	await prismaClient.user.create({
		data: {
			id: userId,
			name: "Test User",
			email: `test-${userId}@example.com`,
			password_hash: "hashed-password",
			role: "MEMBER",
			status: "activated",
		},
	})
	return userId
}

describe("PrismaUserActivityRepository", () => {
	let sut: PrismaUserActivityRepository
	let userId: string

	beforeEach(async () => {
		sut = new PrismaUserActivityRepository(prismaClient)
		userId = await createTestUser()
	})

	afterEach(async () => {
		await prismaClient.userActivityEvent.deleteMany({ where: { userId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	it("deve gravar um evento de atividade com metadata", async () => {
		const occurredAt = new Date()

		await sut.record({
			userId,
			type: "ROLE_CHANGED",
			description: "Role alterada para Administrador",
			metadata: { previousRole: "MEMBER", newRole: "ADMIN" },
			occurredAt,
		})

		const saved = await prismaClient.userActivityEvent.findFirst({
			where: { userId },
		})
		expect(saved).not.toBeNull()
		expect(saved?.type).toBe("ROLE_CHANGED")
		expect(saved?.description).toBe("Role alterada para Administrador")
		expect(saved?.metadata).toEqual({
			previousRole: "MEMBER",
			newRole: "ADMIN",
		})
	})

	it("deve gravar um evento de atividade sem metadata", async () => {
		await sut.record({
			userId,
			type: "LOGIN",
			description: "Login realizado",
			occurredAt: new Date(),
		})

		const saved = await prismaClient.userActivityEvent.findFirst({
			where: { userId },
		})
		expect(saved).not.toBeNull()
		expect(saved?.type).toBe("LOGIN")
		expect(saved?.metadata).toBeNull()
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-user-activity-repository.integration-test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `Cannot find module './prisma-user-activity-repository'` e/ou `prismaClient.userActivityEvent` não existe (modelo ainda não existe no schema/client gerado).

- **Step 3: Implementação mínima**

Em `apps/backend/prisma/schema.prisma`, adicionar `activityEvents UserActivityEvent[]` à lista de relations do `model User` (junto de `checkIns`, `subscription`, `userNotifications`, `notifications`) e adicionar o novo modelo:

```prisma
model UserActivityEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  type        String
  description String
  metadata    Json?
  occurredAt  DateTime @map("occurred_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, occurredAt])
  @@map("user_activity_events")
}
```

Rodar a migration (a partir de `apps/backend/`):

```bash
npx prisma migrate dev --name add_user_activity_event
```

Criar a interface:

```typescript
// apps/backend/src/user/application/persistence/repository/user-activity-repository.ts
export interface RecordUserActivityInput {
	userId: string
	type: string
	description: string
	metadata?: Record<string, unknown>
	occurredAt: Date
}

export interface UserActivityRepository {
	record(input: RecordUserActivityInput): Promise<void>
}
```

Criar a implementação Prisma:

```typescript
// apps/backend/src/shared/infra/database/repository/prisma/prisma-user-activity-repository.ts
import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"

@injectable()
export class PrismaUserActivityRepository implements UserActivityRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient | Prisma.TransactionClient,
	) {}

	public async record(input: RecordUserActivityInput): Promise<void> {
		await this.prisma.userActivityEvent.create({
			data: {
				userId: input.userId,
				type: input.type,
				description: input.description,
				metadata: input.metadata,
				occurredAt: input.occurredAt,
			},
		})
	}
}
```

Criar a implementação in-memory (usada em dev/test, seguindo o padrão de `InMemoryUserRepository`):

```typescript
// apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-activity-repository.ts
import { injectable } from "inversify"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"

@injectable()
export class InMemoryUserActivityRepository implements UserActivityRepository {
	public readonly records: RecordUserActivityInput[] = []

	public async record(input: RecordUserActivityInput): Promise<void> {
		this.records.push(input)
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-user-activity-repository.integration-test.ts` (a partir de `apps/backend/`)
Expected: PASS — os 2 testes de integração.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 1, execução paralela).

## Critérios de Sucesso

- A tabela `user_activity_events` existe no banco após a migration, com colunas `user_id`, `type`, `description`, `metadata` (nullable), `occurred_at`, `created_at`, e índice composto `(user_id, occurred_at)` (FR-001).
- `PrismaUserActivityRepository.record()` persiste um registro real, com e sem `metadata`, validado pelos 2 testes de integração.
- `InMemoryUserActivityRepository.record()` empilha o input em `records`, pronto para ser usado por `UserActivityRepositoryProvider` (task 12) em ambiente não-produção.
- Nenhuma use case ou subscriber consome este repositório ainda — isso é feito na task 12, que depende desta.
