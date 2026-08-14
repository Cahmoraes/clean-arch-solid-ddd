# Task 14: GetUserActivityUseCase [FR-001, FR-002, FR-013]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-13

## Visão Geral

Criar `GetUserActivityUseCase`, a use case de leitura que valida a existência do usuário (via `UserRepository`) e delega a busca dos itens de atividade a `UserActivityDao.findRecentActivity()` (task 13), limitando a 20 itens (FR-001). Cada item é mapeado para um DTO serializável (`occurredAt` como ISO string, FR-002). Quando o usuário não tem nenhum evento, a lista retorna vazia (`events: []`), preservando o estado vazio já existente no frontend (FR-013 — regressão).

## Arquivos

- Create: `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts`
- Test: `apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: `GetUserActivityUseCaseOutput` é um `Either<UserNotFoundError, GetUserActivityUseCaseOutputDTO>`, e `GetUserActivityItemDTO.occurredAt` é `string` (ISO), diferente do `Date` interno de `UserActivityItem` — o mapeamento precisa converter explicitamente.
- `test-antipatterns`: o DAO é substituído por uma implementação fake mínima que satisfaz a interface `UserActivityDao` (não um mock genérico desacoplado do contrato), e o repositório de usuário usa `InMemoryUserRepository` real.

## Passos

- **Step 1: Escrever o teste falhando**

```typescript
// apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import type {
	UserActivityDao,
	UserActivityItem,
} from "@/user/application/persistence/dao/user-activity-dao"
import { User } from "@/user/domain/user"
import { UserNotFoundError } from "../error/user-not-found-error"
import {
	GetUserActivityUseCase,
	type GetUserActivityUseCaseInput,
} from "./get-user-activity.usecase"

class FakeUserActivityDao implements UserActivityDao {
	constructor(private readonly items: UserActivityItem[] = []) {}

	public async findRecentActivity(
		_userId: string,
		limit: number,
	): Promise<UserActivityItem[]> {
		return this.items.slice(0, limit)
	}
}

describe("GetUserActivityUseCase", () => {
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		userRepository = new InMemoryUserRepository()
	})

	test("deve retornar UserNotFoundError para usuário inexistente", async () => {
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao(),
		)
		const input: GetUserActivityUseCaseInput = { userId: "non-existent-id" }

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("deve retornar events vazio quando o usuário não possui atividade (FR-013)", async () => {
		const user = (
			await User.create({
				id: "user-1",
				name: "John Doe",
				email: "john@doe.com",
				password: "any_password",
			})
		).forceSuccess().value
		await userRepository.save(user)
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao([]),
		)

		const result = await sut.execute({ userId: "user-1" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({ events: [] })
	})

	test("deve mapear os itens de atividade retornados pelo DAO", async () => {
		const user = (
			await User.create({
				id: "user-1",
				name: "John Doe",
				email: "john@doe.com",
				password: "any_password",
			})
		).forceSuccess().value
		await userRepository.save(user)
		const occurredAt = new Date("2025-01-10T12:00:00.000Z")
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao([
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt,
				},
			]),
		)

		const result = await sut.execute({ userId: "user-1" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({
			events: [
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt: occurredAt.toISOString(),
				},
			],
		})
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/get-user-activity.usecase.test.ts` (a partir de `apps/backend/`)
Expected: FAIL — `Cannot find module './get-user-activity.usecase'` (a use case ainda não existe).

- **Step 3: Implementação mínima**

```typescript
// apps/backend/src/user/application/use-case/get-user-activity.usecase.ts
import { inject, injectable } from "inversify"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItemType,
} from "@/user/application/persistence/dao/user-activity-dao"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface GetUserActivityUseCaseInput {
	userId: string
}

export interface GetUserActivityItemDTO {
	id: string
	type: UserActivityItemType
	description: string
	occurredAt: string
}

export interface GetUserActivityUseCaseOutputDTO {
	events: GetUserActivityItemDTO[]
}

export type GetUserActivityUseCaseOutput = Either<
	UserNotFoundError,
	GetUserActivityUseCaseOutputDTO
>

const ACTIVITY_LIMIT = 20

@injectable()
export class GetUserActivityUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(USER_TYPES.DAO.UserActivity)
		private readonly userActivityDao: UserActivityDao,
	) {}

	public async execute(
		input: GetUserActivityUseCaseInput,
	): Promise<GetUserActivityUseCaseOutput> {
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())
		const items = await this.userActivityDao.findRecentActivity(
			input.userId,
			ACTIVITY_LIMIT,
		)
		return success({
			events: items.map((item) => ({
				id: item.id,
				type: item.type,
				description: item.description,
				occurredAt: item.occurredAt.toISOString(),
			})),
		})
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `npx vitest --run --config ./test/vite.config.app-domain.ts src/user/application/use-case/get-user-activity.usecase.test.ts` (a partir de `apps/backend/`)
Expected: PASS — os 3 testes.

- **Step 5: Commit**

Commit pulado — orquestrador faz commit na barreira de integração da wave; reporte os arquivos alterados (esta task está na Wave 3, execução paralela com a task-12).

## Critérios de Sucesso

- `GetUserActivityUseCase.execute({ userId })` retorna `UserNotFoundError` para usuário inexistente (nenhuma chamada ao DAO é necessária nesse caso).
- Para um usuário existente sem atividade, retorna `{ events: [] }` — preserva o estado vazio do frontend (FR-013).
- Para um usuário com atividade, retorna os itens mapeados com `occurredAt` como string ISO 8601, respeitando o limite de 20 (FR-001, FR-002).
