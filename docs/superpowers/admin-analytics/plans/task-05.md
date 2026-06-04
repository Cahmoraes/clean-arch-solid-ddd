# Task 5: Backend Use Case — FetchRetentionAnalyticsUseCase [FR-011, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-03

## Visão Geral

Implementa o use case `FetchRetentionAnalyticsUseCase` que aceita um período, delega ao `AnalyticsUserRepository` e retorna `Either<InvalidPeriodError, RetentionAnalytics>` com contagem de membros ativos/inativos, taxa de churn e lista de membros em risco.

## Arquivos

- Create: `apps/backend/src/analytics/application/use-case/fetch-retention-analytics.usecase.ts`
- Create: `apps/backend/src/analytics/application/use-case/fetch-retention-analytics.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: a definição de "inativo" (30 dias) e "em risco" (14 dias) é responsabilidade do repositório, não do use case. O use case apenas delega.

## Passos

- **Step 1: Escrever o teste**

```typescript
// apps/backend/src/analytics/application/use-case/fetch-retention-analytics.usecase.test.ts
import { beforeEach, afterEach, describe, expect, test } from "vitest"
import { container } from "@/shared/infra/ioc/container"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import { InMemoryAnalyticsUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository"
import { FetchRetentionAnalyticsUseCase } from "./fetch-retention-analytics.usecase"

describe("FetchRetentionAnalyticsUseCase", () => {
  let sut: FetchRetentionAnalyticsUseCase

  beforeEach(() => {
    container.snapshot()
    container
      .rebind(ANALYTICS_TYPES.Repositories.AnalyticsUser)
      .toConstantValue(new InMemoryAnalyticsUserRepository())
    container
      .rebind(ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics)
      .to(FetchRetentionAnalyticsUseCase)
    sut = container.get<FetchRetentionAnalyticsUseCase>(
      ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics,
    )
  })

  afterEach(() => {
    container.restore()
  })

  test("deve retornar analytics de retenção para período válido", async () => {
    const result = await sut.execute({ period: "30d" })
    expect(result.isSuccess()).toBe(true)
    const analytics = result.forceSuccess().value
    expect(analytics).toMatchObject({
      activeCount: expect.any(Number),
      inactiveCount: expect.any(Number),
      churnRate: expect.any(Number),
      atRiskMembers: expect.any(Array),
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
pnpm --filter backend test:run -- -t "FetchRetentionAnalyticsUseCase"
```

Expected: FAIL — `Cannot find module './fetch-retention-analytics.usecase'`

- **Step 3: Implementar o use case**

```typescript
// apps/backend/src/analytics/application/use-case/fetch-retention-analytics.usecase.ts
import { inject, injectable } from "inversify"
import { failure, success, type Either } from "@/shared/domain/value-object/either"
import { ANALYTICS_TYPES } from "@/shared/infra/ioc/types"
import {
  AnalyticsPeriod,
  type InvalidPeriodError,
} from "../../domain/value-object/analytics-period"
import type {
  AnalyticsUserRepository,
  RetentionAnalytics,
} from "../repository/analytics-user-repository"

export interface FetchRetentionAnalyticsInput {
  period: string
}

export type FetchRetentionAnalyticsOutput = Either<InvalidPeriodError, RetentionAnalytics>

@injectable()
export class FetchRetentionAnalyticsUseCase {
  constructor(
    @inject(ANALYTICS_TYPES.Repositories.AnalyticsUser)
    private readonly userRepository: AnalyticsUserRepository,
  ) {}

  public async execute(
    input: FetchRetentionAnalyticsInput,
  ): Promise<FetchRetentionAnalyticsOutput> {
    const periodResult = AnalyticsPeriod.fromKey(input.period)
    if (periodResult.isFailure()) {
      return failure(periodResult.forceFailure().value)
    }
    const period = periodResult.forceSuccess().value
    const analytics = await this.userRepository.fetchRetentionAnalytics(period)
    return success(analytics)
  }
}
```

- **Step 4: Rodar o teste — deve passar**

```bash
pnpm --filter backend test:run -- -t "FetchRetentionAnalyticsUseCase"
```

Expected: PASS — 2 tests passed

- **Step 5: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- Use case retorna `failure()` quando `period` é inválido
- Use case retorna `success()` com `RetentionAnalytics` quando período é válido
- Não há lógica de "30 dias" ou "14 dias" no use case — essa responsabilidade pertence ao repositório
- `pnpm --filter backend tsc:check` passa
