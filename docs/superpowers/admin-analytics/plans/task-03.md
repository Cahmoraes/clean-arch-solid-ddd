# Task 3: Backend Domain — AnalyticsPeriod + interfaces + in-memory test doubles [FR-002, FR-008]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-02

## Visão Geral

Cria o value object `AnalyticsPeriod` com validação e resolução de datas, as interfaces de repositório `AnalyticsCheckInRepository` e `AnalyticsUserRepository`, e suas implementações in-memory para uso nos testes dos use cases (Tasks 4–6).

## Arquivos

- Create: `apps/backend/src/analytics/domain/value-object/analytics-period.ts`
- Create: `apps/backend/src/analytics/domain/value-object/analytics-period.test.ts`
- Create: `apps/backend/src/analytics/application/repository/analytics-check-in-repository.ts`
- Create: `apps/backend/src/analytics/application/repository/analytics-user-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository.ts`

### Conformidade com as Skills Padrão

- no-workarounds: usar `Either` para o resultado de `AnalyticsPeriod.fromKey()`, seguindo o padrão do projeto

## Passos

- **Step 1: Escrever o teste para AnalyticsPeriod**

```typescript
// apps/backend/src/analytics/domain/value-object/analytics-period.test.ts
import { describe, expect, test } from "vitest"
import { AnalyticsPeriod } from "./analytics-period"

describe("AnalyticsPeriod", () => {
  test("deve aceitar período válido '7d' e retornar intervalo de 7 dias", () => {
    const result = AnalyticsPeriod.fromKey("7d")
    expect(result.isSuccess()).toBe(true)
    const period = result.forceSuccess().value
    const diffMs = period.to.getTime() - period.from.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(7)
    expect(period.key).toBe("7d")
  })

  test("deve aceitar '30d', '3m', '12m'", () => {
    expect(AnalyticsPeriod.fromKey("30d").isSuccess()).toBe(true)
    expect(AnalyticsPeriod.fromKey("3m").isSuccess()).toBe(true)
    expect(AnalyticsPeriod.fromKey("12m").isSuccess()).toBe(true)
  })

  test("deve rejeitar período inválido", () => {
    const result = AnalyticsPeriod.fromKey("invalid")
    expect(result.isFailure()).toBe(true)
  })

  test("shouldAggregateByWeek() deve retornar true para 3m e 12m", () => {
    expect(AnalyticsPeriod.fromKey("3m").forceSuccess().value.shouldAggregateByWeek()).toBe(true)
    expect(AnalyticsPeriod.fromKey("12m").forceSuccess().value.shouldAggregateByWeek()).toBe(true)
    expect(AnalyticsPeriod.fromKey("7d").forceSuccess().value.shouldAggregateByWeek()).toBe(false)
    expect(AnalyticsPeriod.fromKey("30d").forceSuccess().value.shouldAggregateByWeek()).toBe(false)
  })
})
```

- **Step 2: Rodar o teste — deve falhar**

```bash
pnpm --filter backend test:run -- -t "AnalyticsPeriod"
```

Expected: FAIL — `Cannot find module './analytics-period'`

- **Step 3: Implementar AnalyticsPeriod**

```typescript
// apps/backend/src/analytics/domain/value-object/analytics-period.ts
import { failure, success, type Either } from "@/shared/domain/value-object/either"

export type PeriodKey = "7d" | "30d" | "3m" | "12m"

const VALID_PERIOD_KEYS: PeriodKey[] = ["7d", "30d", "3m", "12m"]

export class InvalidPeriodError extends Error {
  constructor(key: string) {
    super(`Período inválido: '${key}'. Use um de: ${VALID_PERIOD_KEYS.join(", ")}`)
    this.name = "InvalidPeriodError"
  }
}

export class AnalyticsPeriod {
  private constructor(
    readonly from: Date,
    readonly to: Date,
    readonly key: PeriodKey,
  ) {}

  static fromKey(key: string): Either<InvalidPeriodError, AnalyticsPeriod> {
    if (!VALID_PERIOD_KEYS.includes(key as PeriodKey)) {
      return failure(new InvalidPeriodError(key))
    }
    const to = new Date()
    const from = new Date()
    switch (key as PeriodKey) {
      case "7d":
        from.setDate(from.getDate() - 7)
        break
      case "30d":
        from.setDate(from.getDate() - 30)
        break
      case "3m":
        from.setMonth(from.getMonth() - 3)
        break
      case "12m":
        from.setFullYear(from.getFullYear() - 1)
        break
    }
    return success(new AnalyticsPeriod(from, to, key as PeriodKey))
  }

  shouldAggregateByWeek(): boolean {
    return this.key === "3m" || this.key === "12m"
  }
}
```

- **Step 4: Rodar o teste — deve passar**

```bash
pnpm --filter backend test:run -- -t "AnalyticsPeriod"
```

Expected: PASS — 4 tests passed

- **Step 5: Criar interfaces de repositório**

```typescript
// apps/backend/src/analytics/application/repository/analytics-check-in-repository.ts
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"

export interface DailyCount {
  date: string
  count: number
}

export interface HourlyCount {
  hour: number
  count: number
}

export interface CheckInAnalytics {
  totalCheckIns: number
  dailySeries: DailyCount[]
  hourlyDistribution: HourlyCount[]
}

export interface AnalyticsCheckInRepository {
  fetchCheckInAnalytics(period: AnalyticsPeriod): Promise<CheckInAnalytics>
}
```

```typescript
// apps/backend/src/analytics/application/repository/analytics-user-repository.ts
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"

export interface AtRiskMember {
  id: string
  name: string
  daysSinceLastCheckIn: number
}

export interface RetentionAnalytics {
  activeCount: number
  inactiveCount: number
  churnRate: number
  atRiskMembers: AtRiskMember[]
}

export interface PeriodCount {
  date: string
  count: number
}

export interface GrowthAnalytics {
  totalMembers: number
  newMembersCount: number
  newMembersPerPeriod: PeriodCount[]
  activeMembersTrend: PeriodCount[]
}

export interface AnalyticsUserRepository {
  fetchRetentionAnalytics(period: AnalyticsPeriod): Promise<RetentionAnalytics>
  fetchGrowthAnalytics(period: AnalyticsPeriod): Promise<GrowthAnalytics>
}
```

- **Step 6: Criar in-memory test doubles**

```typescript
// apps/backend/src/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository.ts
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import type {
  AnalyticsCheckInRepository,
  CheckInAnalytics,
} from "@/analytics/application/repository/analytics-check-in-repository"

export class InMemoryAnalyticsCheckInRepository implements AnalyticsCheckInRepository {
  async fetchCheckInAnalytics(_period: AnalyticsPeriod): Promise<CheckInAnalytics> {
    return {
      totalCheckIns: 0,
      dailySeries: [],
      hourlyDistribution: [],
    }
  }
}
```

```typescript
// apps/backend/src/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository.ts
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import type {
  AnalyticsUserRepository,
  GrowthAnalytics,
  RetentionAnalytics,
} from "@/analytics/application/repository/analytics-user-repository"

export class InMemoryAnalyticsUserRepository implements AnalyticsUserRepository {
  async fetchRetentionAnalytics(_period: AnalyticsPeriod): Promise<RetentionAnalytics> {
    return {
      activeCount: 0,
      inactiveCount: 0,
      churnRate: 0,
      atRiskMembers: [],
    }
  }

  async fetchGrowthAnalytics(_period: AnalyticsPeriod): Promise<GrowthAnalytics> {
    return {
      totalMembers: 0,
      newMembersCount: 0,
      newMembersPerPeriod: [],
      activeMembersTrend: [],
    }
  }
}
```

- **Step 7: Rodar todos os testes**

```bash
pnpm --filter backend test:run
```

Expected: todos os testes existentes passam.

- **Step 8: Commit**

```bash
git add apps/backend/src/analytics/ \
        apps/backend/src/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository.ts \
        apps/backend/src/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository.ts
git commit -m "feat(analytics): add AnalyticsPeriod value object, repository interfaces, and in-memory test doubles"
```

## Critérios de Sucesso

- `AnalyticsPeriod.fromKey('invalid').isFailure()` retorna `true`
- `AnalyticsPeriod.fromKey('3m').forceSuccess().value.shouldAggregateByWeek()` retorna `true`
- Interfaces exportam todos os tipos documentados no spec
- In-memory repositories implementam as interfaces sem erros TypeScript
- `pnpm --filter backend tsc:check` passa
