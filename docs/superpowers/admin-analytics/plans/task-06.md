# Task 6: Backend Use Case — FetchGrowthAnalyticsUseCase [FR-014, FR-015]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-03

## Visão Geral

Implementa o use case `FetchGrowthAnalyticsUseCase` que aceita um período, delega ao `AnalyticsUserRepository` e retorna `Either<InvalidPeriodError, GrowthAnalytics>` com total de membros, novos membros no período, série temporal de novos membros e tendência de membros ativos.

## Arquivos

- Create: `apps/backend/src/analytics/application/use-case/fetch-growth-analytics.usecase.ts`
- Create: `apps/backend/src/analytics/application/use-case/fetch-growth-analytics.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: toda lógica de agrupamento por semana/mês fica no repositório, não no use case.

## Passos

- **Step 1: Escrever o teste**

```typescript
// apps/backend/src/analytics/application/use-case/fetch-growth-analytics.usecase.test.ts
import { beforeEach, afterEach, describe, expect, test } from "vitest"
import { container } from "@/shared/infra/ioc/container"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import { InMemoryAnalyticsUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository"
import { FetchGrowthAnalyticsUseCase } from "./fetch-growth-analytics.usecase"

describe("FetchGrowthAnalyticsUseCase", () => {
  let sut: FetchGrowthAnalyticsUseCase

  beforeEach(() => {
    container.snapshot()
    container
      .rebind(ANALYTICS_TYPES.Repositories.AnalyticsUser)
      .toConstantValue(new InMemoryAnalyticsUserRepository())
    container
      .rebind(ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics)
      .to(FetchGrowthAnalyticsUseCase)
    sut = container.get<FetchGrowthAnalyticsUseCase>(
      ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics,
    )
  })

  afterEach(() => {
    container.restore()
  })

  test("deve retornar analytics de crescimento para período válido", async () => {
    const result = await sut.execute({ period: "12m" })
    expect(result.isSuccess()).toBe(true)
    const analytics = result.forceSuccess().value
    expect(analytics).toMatchObject({
      totalMembers: expect.any(Number),
      newMembersCount: expect.any(Number),
      newMembersPerPeriod: expect.any(Array),
      activeMembersTrend: expect.any(Array),
    })
  })

  test("deve retornar falha para período inválido", async () => {
    const result = await sut.execute({ period: "invalid" })
    expect(result.isFailure()).toBe(true)
  })
})
```

- **Step 2: Rodar o teste — deve falhar**

```bash
pnpm --filter backend test:run -- -t "FetchGrowthAnalyticsUseCase"
```

Expected: FAIL — `Cannot find module './fetch-growth-analytics.usecase'`

- **Step 3: Implementar o use case**

```typescript
// apps/backend/src/analytics/application/use-case/fetch-growth-analytics.usecase.ts
import { inject, injectable } from "inversify"
import { failure, success, type Either } from "@/shared/domain/value-object/either"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import {
  AnalyticsPeriod,
  type InvalidPeriodError,
} from "../../domain/value-object/analytics-period"
import type {
  AnalyticsUserRepository,
  GrowthAnalytics,
} from "../repository/analytics-user-repository"

export interface FetchGrowthAnalyticsInput {
  period: string
}

export type FetchGrowthAnalyticsOutput = Either<InvalidPeriodError, GrowthAnalytics>

@injectable()
export class FetchGrowthAnalyticsUseCase {
  constructor(
    @inject(ANALYTICS_TYPES.Repositories.AnalyticsUser)
    private readonly userRepository: AnalyticsUserRepository,
  ) {}

  public async execute(
    input: FetchGrowthAnalyticsInput,
  ): Promise<FetchGrowthAnalyticsOutput> {
    const periodResult = AnalyticsPeriod.fromKey(input.period)
    if (periodResult.isFailure()) {
      return failure(periodResult.forceFailure().value)
    }
    const period = periodResult.forceSuccess().value
    const analytics = await this.userRepository.fetchGrowthAnalytics(period)
    return success(analytics)
  }
}
```

- **Step 4: Rodar o teste — deve passar**

```bash
pnpm --filter backend test:run -- -t "FetchGrowthAnalyticsUseCase"
```

Expected: PASS — 2 tests passed

- **Step 5: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- Use case retorna `failure()` quando `period` é inválido
- Use case retorna `success()` com `GrowthAnalytics` quando período é válido
- `pnpm --filter backend tsc:check` passa
