# Task 7: RejectCheckInUseCase + testes [RF-001, RF-002, RF-003, RF-004]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Criar o use case `RejectCheckInUseCase` seguindo o mesmo padrão de `ValidateCheckInUseCase`. Sem janela de tempo — admin pode rejeitar a qualquer momento. Rejeitar um check-in já rejeitado é idempotente.

**Depende de:** Task 3, Task 4

## Arquivos

- Create: `apps/backend/src/check-in/application/use-case/reject-check-in.usecase.ts`
- Create: `apps/backend/src/check-in/application/use-case/reject-check-in.usecase.test.ts`

## Passos

- [ ] **Step 1: Escrever o teste antes do use case (TDD)**

```typescript
// apps/backend/src/check-in/application/use-case/reject-check-in.usecase.test.ts
import { container } from "@/shared/infra/ioc/container"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import { CheckInNotFoundError } from "../error/check-in-not-found-error"
import { RejectCheckInUseCase } from "./reject-check-in.usecase"

describe("RejectCheckInUseCase", () => {
	let useCase: RejectCheckInUseCase
	let checkInRepository: InMemoryCheckInRepository

	beforeEach(() => {
		container.snapshot()
		checkInRepository = new InMemoryCheckInRepository()
		container.rebindSync(CHECKIN_TYPES.Repositories.CheckIn).toConstantValue(checkInRepository)
		useCase = new RejectCheckInUseCase(checkInRepository)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve rejeitar um check-in pendente", async () => {
		const checkIn = CheckIn.create({
			id: "check-in-id",
			userId: "user-id",
			gymId: "gym-id",
			userLatitude: 0,
			userLongitude: 0,
		})
		await checkInRepository.save(checkIn)

		const result = await useCase.execute({ checkInId: "check-in-id" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.rejectedAt).toBeInstanceOf(Date)

		const saved = await checkInRepository.checkOfById("check-in-id")
		expect(saved?.status).toEqual("rejected")
		expect(saved?.validatedAt).toBeUndefined()
	})

	test("Deve rejeitar um check-in validado (reversão)", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2021-01-01"))
		const checkIn = CheckIn.create({
			id: "check-in-id",
			userId: "user-id",
			gymId: "gym-id",
			userLatitude: 0,
			userLongitude: 0,
		})
		checkIn.validate()
		await checkInRepository.save(checkIn)
		vi.useRealTimers()

		const result = await useCase.execute({ checkInId: "check-in-id" })

		expect(result.isSuccess()).toBe(true)
		const saved = await checkInRepository.checkOfById("check-in-id")
		expect(saved?.status).toEqual("rejected")
		expect(saved?.validatedAt).toBeUndefined()
	})

	test("Deve ser idempotente ao rejeitar um check-in já rejeitado", async () => {
		const checkIn = CheckIn.create({
			id: "check-in-id",
			userId: "user-id",
			gymId: "gym-id",
			userLatitude: 0,
			userLongitude: 0,
		})
		checkIn.reject()
		await checkInRepository.save(checkIn)

		const result = await useCase.execute({ checkInId: "check-in-id" })

		expect(result.isSuccess()).toBe(true)
	})

	test("Deve retornar CheckInNotFoundError para ID inexistente", async () => {
		const result = await useCase.execute({ checkInId: "non-existent-id" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(CheckInNotFoundError)
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha (TDD red)**

```bash
pnpm --filter backend test:run -- reject-check-in.usecase.test.ts
```

Esperado: FAIL com "Cannot find module './reject-check-in.usecase'".

- [ ] **Step 3: Implementar RejectCheckInUseCase**

```typescript
// apps/backend/src/check-in/application/use-case/reject-check-in.usecase.ts
import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"

import { CheckInNotFoundError } from "../error/check-in-not-found-error"
import type { CheckInRepository } from "../repository/check-in-repository"

export interface RejectCheckInUseCaseInput {
	checkInId: string
}

export interface RejectCheckInUseCaseOutput {
	rejectedAt: Date
}

export type RejectCheckInUseCaseResponse = Either<
	CheckInNotFoundError,
	RejectCheckInUseCaseOutput
>

@injectable()
export class RejectCheckInUseCase {
	constructor(
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
	) {}

	public async execute(
		input: RejectCheckInUseCaseInput,
	): Promise<RejectCheckInUseCaseResponse> {
		const checkIn = await this.checkInRepository.checkOfById(input.checkInId)
		if (!checkIn) return failure(new CheckInNotFoundError())
		checkIn.reject()
		await this.checkInRepository.save(checkIn)
		return success({ rejectedAt: checkIn.rejectedAt ?? new Date() })
	}
}
```

- [ ] **Step 4: Rodar os testes do use case (TDD green)**

```bash
pnpm --filter backend test:run -- reject-check-in.usecase.test.ts
```

Esperado: todos os 4 testes passam.

- [ ] **Step 5: Rodar todos os testes**

```bash
pnpm --filter backend test:run
```

Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/check-in/application/use-case/reject-check-in.usecase.ts \
        apps/backend/src/check-in/application/use-case/reject-check-in.usecase.test.ts
git commit -m "feat(check-in): add RejectCheckInUseCase
```

## Critérios de Sucesso

- Rejeitar pendente: sucesso, `rejectedAt` populado, `status = "rejected"` no repositório
- Rejeitar validado: sucesso, `validatedAt` limpo, `status = "rejected"`
- Rejeitar já rejeitado: sucesso (idempotente)
- ID inexistente: `failure(CheckInNotFoundError)`
- Todos os testes passam
