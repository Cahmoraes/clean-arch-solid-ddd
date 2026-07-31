# Task 5: `DeactivateGymUseCase` [FR-001, FR-005, FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-03, task-04

## Visão Geral

Cria `DeactivateGymUseCase`, um use case simples de repositório único que localiza a academia
por id (sempre com `includeInactive: true`, pois um admin precisa localizar a academia
independentemente do status atual dela para poder desativá-la), delega a transição de estado
para `gym.deactivate()` (Task 3) e persiste via `gymRepository.update()`. A idempotência/erro
de conflito (FR-010) é responsabilidade exclusiva do `gym.deactivate()` — o use case apenas
propaga o `Either` retornado.

## Arquivos

- Create: `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/deactivate-gym.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipos de input/output do use case (`DeactivateGymUseCaseInput`,
  `DeactivateGymUseCaseOutput` como union de erros via `Either`).
- `vitest`: suíte com `container.snapshot()`/`container.restore()` e
  `setupInMemoryRepositories()`, seguindo o padrão real de
  `fetch-all-gyms.usecase.test.ts`.
- `no-workarounds`: usar `Either` para o resultado de `gym.deactivate()`/do use case,
  propagando o erro de domínio (`GymNotFoundError`/`GymAlreadyDeactivatedError`) sem
  mascará-lo com um valor genérico ou lançamento de exceção.

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymAlreadyDeactivatedError } from "../../domain/error/gym-already-deactivated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { DeactivateGymUseCase } from "./deactivate-gym.usecase"

describe("DeactivateGymUseCase", () => {
	let sut: DeactivateGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		gymRepository = setupInMemoryRepositories().gymRepository
		sut = container.get(GYM_TYPES.UseCases.DeactivateGym)
	})

	afterEach(() => {
		container.restore()
	})

	test("desativa uma academia ativa com sucesso", async () => {
		const gym = await createAndSaveGym({ gymRepository })

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isSuccess()).toBe(true)
		const updated = await gymRepository.gymOfId(gym.id, { includeInactive: true })
		expect(updated?.status).toBe("deactivated")
	})

	test("retorna failure(GymNotFoundError) para um gymId inexistente", async () => {
		const result = await sut.execute({ gymId: "non-existent-id" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna failure(GymAlreadyDeactivatedError) ao desativar uma academia já desativada", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		await sut.execute({ gymId: gym.id })

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyDeactivatedError)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "DeactivateGymUseCase"`
Expected: FAIL — `Cannot find module './deactivate-gym.usecase'` (o arquivo ainda não
existe).

- **Step 3: Implementação mínima**

```typescript
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymAlreadyDeactivatedError } from "../../domain/error/gym-already-deactivated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface DeactivateGymUseCaseInput {
	gymId: string
}

export type DeactivateGymUseCaseOutput = Either<
	GymNotFoundError | GymAlreadyDeactivatedError,
	void
>

@injectable()
export class DeactivateGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: DeactivateGymUseCaseInput,
	): Promise<DeactivateGymUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId, {
			includeInactive: true,
		})
		if (!gym) return failure(new GymNotFoundError())
		const deactivateResult = gym.deactivate()
		if (deactivateResult.isFailure()) return failure(deactivateResult.value)
		await this.gymRepository.update(gym)
		return success(undefined)
	}
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "DeactivateGymUseCase"`
Expected: PASS — os 3 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/application/use-case/deactivate-gym.usecase.ts \
  apps/backend/src/gym/application/use-case/deactivate-gym.usecase.test.ts
git commit -m "feat(gym): add DeactivateGymUseCase"
```

## Critérios de Sucesso

- Desativar uma academia ativa retorna `success` e a academia passa a ter
  `status === "deactivated"` quando lida com `includeInactive: true` (FR-001, FR-011).
- Um `gymId` inexistente retorna `failure(GymNotFoundError)`, sem lançar exceção (FR-005).
- Desativar uma academia já desativada retorna `failure(GymAlreadyDeactivatedError)`, sem
  alterar o estado persistido — idempotência tratada como conflito, não como no-op
  silencioso (FR-010).
- O use case localiza a academia sempre com `includeInactive: true`, garantindo que um admin
  consiga localizar e desativar mesmo uma academia já desativada (para receber o erro de
  conflito correto, e não um falso "não encontrada").
- `pnpm --filter backend test:run -- -t "DeactivateGymUseCase"` passa com os 3 casos mínimos.
