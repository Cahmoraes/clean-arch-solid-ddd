# Task 6: `ActivateGymUseCase` [FR-002, FR-005, FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-03, task-04

## Visão Geral

Cria `ActivateGymUseCase`, espelho exato de `DeactivateGymUseCase` (Task 5), trocando
`deactivate()` por `activate()` e `GymAlreadyDeactivatedError` por `GymAlreadyActivatedError`.
Localiza a academia por id sempre com `includeInactive: true` (um admin precisa localizar a
academia independentemente do status atual para poder reativá-la), delega a transição para
`gym.activate()` (Task 3) e persiste via `gymRepository.update()`.

## Arquivos

- Create: `apps/backend/src/gym/application/use-case/activate-gym.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/activate-gym.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipos de input/output do use case (`ActivateGymUseCaseInput`,
  `ActivateGymUseCaseOutput` como union de erros via `Either`).
- `vitest`: suíte com `container.snapshot()`/`container.restore()` e
  `setupInMemoryRepositories()`, seguindo o padrão real de
  `fetch-all-gyms.usecase.test.ts`.
- `no-workarounds`: usar `Either` para o resultado de `gym.activate()`/do use case,
  propagando o erro de domínio (`GymNotFoundError`/`GymAlreadyActivatedError`) sem mascará-lo.

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymAlreadyActivatedError } from "../../domain/error/gym-already-activated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { ActivateGymUseCase } from "./activate-gym.usecase"

describe("ActivateGymUseCase", () => {
	let sut: ActivateGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		gymRepository = setupInMemoryRepositories().gymRepository
		sut = container.get(GYM_TYPES.UseCases.ActivateGym)
	})

	afterEach(() => {
		container.restore()
	})

	test("reativa uma academia desativada com sucesso", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isSuccess()).toBe(true)
		const updated = await gymRepository.gymOfId(gym.id, { includeInactive: true })
		expect(updated?.status).toBe("activated")
	})

	test("retorna failure(GymNotFoundError) para um gymId inexistente", async () => {
		const result = await sut.execute({ gymId: "non-existent-id" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna failure(GymAlreadyActivatedError) ao reativar uma academia já ativa", async () => {
		const gym = await createAndSaveGym({ gymRepository })

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyActivatedError)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "ActivateGymUseCase"`
Expected: FAIL — `Cannot find module './activate-gym.usecase'` (o arquivo ainda não existe).

- **Step 3: Implementação mínima**

```typescript
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymAlreadyActivatedError } from "../../domain/error/gym-already-activated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface ActivateGymUseCaseInput {
	gymId: string
}

export type ActivateGymUseCaseOutput = Either<
	GymNotFoundError | GymAlreadyActivatedError,
	void
>

@injectable()
export class ActivateGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: ActivateGymUseCaseInput,
	): Promise<ActivateGymUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId, {
			includeInactive: true,
		})
		if (!gym) return failure(new GymNotFoundError())
		const activateResult = gym.activate()
		if (activateResult.isFailure()) return failure(activateResult.value)
		await this.gymRepository.update(gym)
		return success(undefined)
	}
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "ActivateGymUseCase"`
Expected: PASS — os 3 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/application/use-case/activate-gym.usecase.ts \
  apps/backend/src/gym/application/use-case/activate-gym.usecase.test.ts
git commit -m "feat(gym): add ActivateGymUseCase"
```

## Critérios de Sucesso

- Reativar uma academia desativada retorna `success` e a academia passa a ter
  `status === "activated"` quando lida com `includeInactive: true` (FR-002, FR-011).
- Um `gymId` inexistente retorna `failure(GymNotFoundError)`, sem lançar exceção (FR-005).
- Reativar uma academia já ativa retorna `failure(GymAlreadyActivatedError)`, sem alterar o
  estado persistido — idempotência tratada como conflito, não como no-op silencioso
  (FR-010).
- `pnpm --filter backend test:run -- -t "ActivateGymUseCase"` passa com os 3 casos mínimos.
