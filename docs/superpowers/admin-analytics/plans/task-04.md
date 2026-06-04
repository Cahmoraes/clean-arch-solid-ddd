# Task 4: Backend Use Case — FetchCheckInAnalyticsUseCase [FR-007, FR-008, FR-009]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-03

## Visão Geral

Implementa o use case `FetchCheckInAnalyticsUseCase` que aceita um período como string, valida via `AnalyticsPeriod.fromKey()`, delega a busca ao `AnalyticsCheckInRepository` e retorna `Either<InvalidPeriodError, CheckInAnalytics>`.

## Arquivos

- Create: `apps/backend/src/analytics/application/use-case/fetch-check-in-analytics.usecase.ts`
- Create: `apps/backend/src/analytics/application/use-case/fetch-check-in-analytics.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: o use case NÃO faz fetch direto ao banco — delega ao `AnalyticsCheckInRepository`. Retorna `failure()` se período inválido.

## Passos

- **Step 1: Escrever o teste**

```typescript
// apps/backend/src/analytics/application/use-case/fetch-check-in-analytics.usecase.test.ts
import { beforeEach, afterEach, describe, expect, test } from "vitest"
import { container } from "@/shared/infra/ioc/container"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import { InMemoryAnalyticsCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository"
import { FetchCheckInAnalyticsUseCase } from "./fetch-check-in-analytics.usecase"

describe("FetchCheckInAnalyticsUseCase", () => {
  let sut: FetchCheckInAnalyticsUseCase

  beforeEach(() => {
    container.snapshot()
    container
      .rebind(ANALYTICS_TYPES.Repositories.AnalyticsCheckIn)
      .toConstantValue(new InMemoryAnalyticsCheckInRepository())
    container
      .rebind(ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics)
      .to(FetchCheckInAnalyticsUseCase)
    sut = container.get<FetchCheckInAnalyticsUseCase>(
      ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics,
    )
  })

  afterEach(() => {
    container.restore()
  })

  test("deve retornar analytics para período válido '30d'", async () => {
    const result = await sut.execute({ period: "30d" })
    expect(result.isSuccess()).toBe(true)
    const analytics = result.forceSuccess().value
    expect(analytics).toMatchObject({
      totalCheckIns: expect.any(Number),
      dailySeries: expect.any(Array),
      hourlyDistribution: expect.any(Array),
    })
  })

  test("deve retornar falha para período inválido", async () => {
    const result = await sut.execute({ period: "invalid" })
    expect(result.isFailure()).toBe(true)
    expect(result.forceFailure().value.message).toContain("inválido")
  })

  test("deve aceitar todos os períodos válidos", async () => {
    for (const period of ["7d", "30d", "3m", "12m"]) {
      const result = await sut.execute({ period })
      expect(result.isSuccess()).toBe(true)
    }
  })
})
```

- **Step 2: Rodar o teste — deve falhar**

```bash
pnpm --filter backend test:run -- -t "FetchCheckInAnalyticsUseCase"
```

Expected: FAIL — `Cannot find module './fetch-check-in-analytics.usecase'`

- **Step 3: Implementar o use case**

```typescript
// apps/backend/src/analytics/application/use-case/fetch-check-in-analytics.usecase.ts
import { inject, injectable } from "inversify"
import { failure, success, type Either } from "@/shared/domain/value-object/either"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import {
  AnalyticsPeriod,
  type InvalidPeriodError,
} from "../../domain/value-object/analytics-period"
import type {
  AnalyticsCheckInRepository,
  CheckInAnalytics,
} from "../repository/analytics-check-in-repository"

export interface FetchCheckInAnalyticsInput {
  period: string
}

export type FetchCheckInAnalyticsOutput = Either<InvalidPeriodError, CheckInAnalytics>

@injectable()
export class FetchCheckInAnalyticsUseCase {
  constructor(
    @inject(ANALYTICS_TYPES.Repositories.AnalyticsCheckIn)
    private readonly checkInRepository: AnalyticsCheckInRepository,
  ) {}

  public async execute(
    input: FetchCheckInAnalyticsInput,
  ): Promise<FetchCheckInAnalyticsOutput> {
    const periodResult = AnalyticsPeriod.fromKey(input.period)
    if (periodResult.isFailure()) {
      return failure(periodResult.forceFailure().value)
    }
    const period = periodResult.forceSuccess().value
    const analytics = await this.checkInRepository.fetchCheckInAnalytics(period)
    return success(analytics)
  }
}
```

- **Step 4: Rodar o teste — deve passar**

```bash
pnpm --filter backend test:run -- -t "FetchCheckInAnalyticsUseCase"
```

Expected: PASS — 3 tests passed

- **Step 5: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- Use case retorna `failure()` quando `period` é inválido
- Use case retorna `success()` com `CheckInAnalytics` quando período é válido
- Não há acesso direto ao banco — tudo via `AnalyticsCheckInRepository`
- `pnpm --filter backend tsc:check` passa
