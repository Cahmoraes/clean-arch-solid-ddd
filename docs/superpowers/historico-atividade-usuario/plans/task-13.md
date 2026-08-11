# Task 13: UserActivityDao — merge UserActivityEvent + CheckIn, ordena desc, limita 20 [FR-001, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** standard
**Depends on:** task-11

## Visão Geral

Criar o DAO de leitura `UserActivityDao`, que mescla os eventos gravados em `UserActivityEvent` (task 11) com os `CheckIn` do usuário (FR-012), ordena por `occurredAt` decrescente e limita ao total pedido pelo chamador. Segue o mesmo padrão de `UserDAO`/`PrismaUserDAO` (`user/application/persistence/dao/user-dao.ts` + `shared/infra/database/dao/prisma/prisma-user-dao.ts`): interface + implementação Prisma, com par in-memory para dev/test (`InMemoryUserActivityDao`) resolvido por um provider que segue o padrão de `UserDAOProvider`. O modelo `Gym` do Prisma usa o campo `title` (não `name`) para exibir a descrição do check-in mesclado (FR-001).

A implementação in-memory usada em dev/test não tenta refletir dados reais do repositório (o mesmo já acontece hoje em `UserDAOMemory`, que gera dados aleatórios desconectados do estado salvo) — ela aceita uma lista inicial via construtor, o que permite que testes de integração HTTP (task 15) semeiem cenários determinísticos fazendo `container.rebind(USER_TYPES.DAO.UserActivity).toConstantValue(new InMemoryUserActivityDao([...]))`, sem expor nenhum método test-only na classe.

## Arquivos

- Create: `apps/backend/src/user/application/persistence/dao/user-activity-dao.ts`
- Create: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts`
- Create: `apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/user/user-activity-dao-provider.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Test: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.integration-test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: `UserActivityItemType` é uma union literal (`"LOGIN" | "PASSWORD_CHANGED" | ... | "CHECK_IN"`) que precisa cobrir tanto os `type` gravados por `RecordUserActivitySubscriber` (task 12) quanto o valor sintético `"CHECK_IN"` atribuído no merge.
- `no-workarounds`: o merge e o limite são feitos buscando `limit` itens de cada fonte (eventos e check-ins) e cortando o resultado combinado — não um `take: limit` ingênuo em uma única fonte, que perderia itens se a outra fonte tivesse itens mais recentes.
- `test-antipatterns`: o teste de integração cria dados reais (`UserActivityEvent` e `CheckIn`) via `prismaClient` direto, sem mockar o Prisma.

## Passos

- **Step 1: Escrever o teste de integração falhando**

```typescript
// apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.integration-test.ts
import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaUserActivityDao } from "@/shared/infra/database/dao/prisma/prisma-user-activity-dao"

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

async function createTestGym() {
	const gymId = randomUUID()
	await prismaClient.gym.create({
		data: {
			id: gymId,
			cnpj: `cnpj-${gymId}`,
			title: "Academia Central",
			latitude: 0,
			longitude: 0,
		},
	})
	return gymId
}

describe("PrismaUserActivityDao", () => {
	let sut: PrismaUserActivityDao
	let userId: string
	let gymId: string

	beforeEach(async () => {
		sut = new PrismaUserActivityDao(prismaClient)
		userId = await createTestUser()
		gymId = await createTestGym()
	})

	afterEach(async () => {
		await prismaClient.checkIn.deleteMany({ where: { user_id: userId } })
		await prismaClient.userActivityEvent.deleteMany({ where: { userId } })
		await prismaClient.gym.delete({ where: { id: gymId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	it("deve mesclar UserActivityEvent e CheckIn ordenados por data decrescente", async () => {
		const now = Date.now()
		await prismaClient.userActivityEvent.create({
			data: {
				userId,
				type: "LOGIN",
				description: "Login realizado",
				occurredAt: new Date(now - 1000),
			},
		})
		await prismaClient.checkIn.create({
			data: {
				user_id: userId,
				gym_id: gymId,
				latitude: 0,
				longitude: 0,
				created_at: new Date(now),
			},
		})

		const result = await sut.findRecentActivity(userId, 20)

		expect(result).toHaveLength(2)
		expect(result[0].type).toBe("CHECK_IN")
		expect(result[0].description).toBe("Check-in — Academia Central")
		expect(result[1].type).toBe("LOGIN")
	})

	it("deve limitar o resultado combinado ao limite pedido", async () => {
		const now = Date.now()
		await Promise.all(
			Array.from({ length: 25 }, (_, index) =>
				prismaClient.userActivityEvent.create({
					data: {
						userId,
						type: "LOGIN",
						description: "Login realizado",
						occurredAt: new Date(now - index * 1000),
					},
				}),
			),
		)

		const result = await sut.findRecentActivity(userId, 20)

		expect(result).toHaveLength(20)
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/prisma/prisma-user-activity-dao.integration-test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `Cannot find module './prisma-user-activity-dao'` (o DAO ainda não existe).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/persistence/dao/user-activity-dao.ts
export type UserActivityItemType =
	| "LOGIN"
	| "PASSWORD_CHANGED"
	| "ACCOUNT_LOCKED"
	| "GOOGLE_LINKED"
	| "PROFILE_UPDATED"
	| "ROLE_CHANGED"
	| "STATUS_CHANGED"
	| "CHECK_IN"

export interface UserActivityItem {
	id: string
	type: UserActivityItemType
	description: string
	occurredAt: Date
}

export interface UserActivityDao {
	findRecentActivity(userId: string, limit: number): Promise<UserActivityItem[]>
}
```

```typescript
// apps/backend/src/shared/infra/database/dao/prisma/prisma-user-activity-dao.ts
import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItem,
	UserActivityItemType,
} from "@/user/application/persistence/dao/user-activity-dao"

@injectable()
export class PrismaUserActivityDao implements UserActivityDao {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient,
	) {}

	public async findRecentActivity(
		userId: string,
		limit: number,
	): Promise<UserActivityItem[]> {
		const [activityEvents, checkIns] = await Promise.all([
			this.prisma.userActivityEvent.findMany({
				where: { userId },
				orderBy: { occurredAt: "desc" },
				take: limit,
			}),
			this.prisma.checkIn.findMany({
				where: { user_id: userId },
				orderBy: { created_at: "desc" },
				take: limit,
				include: { gym: true },
			}),
		])

		const mappedEvents: UserActivityItem[] = activityEvents.map((event) => ({
			id: event.id,
			type: event.type as UserActivityItemType,
			description: event.description,
			occurredAt: event.occurredAt,
		}))

		const mappedCheckIns: UserActivityItem[] = checkIns.map((checkIn) => ({
			id: checkIn.id,
			type: "CHECK_IN",
			description: `Check-in — ${checkIn.gym.title}`,
			occurredAt: checkIn.created_at,
		}))

		return [...mappedEvents, ...mappedCheckIns]
			.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
			.slice(0, limit)
	}
}
```

```typescript
// apps/backend/src/shared/infra/database/dao/in-memory/user-activity-dao-memory.ts
import { injectable } from "inversify"
import type {
	UserActivityDao,
	UserActivityItem,
} from "@/user/application/persistence/dao/user-activity-dao"

@injectable()
export class InMemoryUserActivityDao implements UserActivityDao {
	private readonly items: UserActivityItem[]

	constructor(initialItems: UserActivityItem[] = []) {
		this.items = [...initialItems]
	}

	public async findRecentActivity(
		_userId: string,
		limit: number,
	): Promise<UserActivityItem[]> {
		return [...this.items]
			.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
			.slice(0, limit)
	}
}
```

```typescript
// apps/backend/src/shared/infra/ioc/module/user/user-activity-dao-provider.ts
import type { ResolutionContext } from "inversify"
import { InMemoryUserActivityDao } from "@/shared/infra/database/dao/in-memory/user-activity-dao-memory.js"
import { PrismaUserActivityDao } from "@/shared/infra/database/dao/prisma/prisma-user-activity-dao"
import { isProduction } from "@/shared/infra/env"
import type { UserActivityDao } from "@/user/application/persistence/dao/user-activity-dao"

export class UserActivityDaoProvider {
	public static provide(context: ResolutionContext): UserActivityDao {
		return isProduction()
			? context.get(PrismaUserActivityDao, { autobind: true })
			: context.get(InMemoryUserActivityDao, { autobind: true })
	}
}
```

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, adicionar dentro de `DAO`:

```typescript
	DAO: {
		User: Symbol.for("UserDAO"),
		UserActivity: Symbol.for("UserActivityDao"),
	},
```

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicionar o import e o bind:

```typescript
import { UserActivityDaoProvider } from "./user-activity-dao-provider"
```

```typescript
	bind(USER_TYPES.DAO.UserActivity)
		.toDynamicValue(UserActivityDaoProvider.provide)
		.inSingletonScope()
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/prisma/prisma-user-activity-dao.integration-test.ts` (a partir de `apps/backend/`)
Expected: PASS — os 2 testes de integração.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 2, execução paralela).

## Critérios de Sucesso

- `PrismaUserActivityDao.findRecentActivity(userId, 20)` retorna eventos de `UserActivityEvent` e `CheckIn` mesclados, ordenados por data decrescente (FR-001, FR-012).
- Um `CheckIn` aparece com `type: "CHECK_IN"` e descrição `"Check-in — {gym.title}"`.
- O resultado combinado nunca excede o `limit` pedido, mesmo quando cada fonte isoladamente teria mais itens que o limite.
- `USER_TYPES.DAO.UserActivity` resolve via container (in-memory fora de produção, Prisma em produção).
