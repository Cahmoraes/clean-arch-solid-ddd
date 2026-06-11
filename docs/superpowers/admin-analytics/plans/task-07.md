# Task 7: Backend Infra — Prisma repositories (AnalyticsCheckIn + AnalyticsUser)

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-03

## Visão Geral

Implementa as classes `PrismaAnalyticsCheckInRepository` e `PrismaAnalyticsUserRepository` usando `$queryRaw` do Prisma para queries de séries temporais e distribuição. Também cria as classes `provider` (factory) que serão usadas pelo IoC para alternar entre Prisma e InMemory conforme o ambiente.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/prisma/prisma-analytics-user-repository.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/analytics/analytics-check-in-repository-provider.ts`
- Create: `apps/backend/src/shared/infra/ioc/module/analytics/analytics-user-repository-provider.ts`

### Conformidade com as Skills Padrão

- no-workarounds: COUNT(*) em `$queryRaw` retorna `BigInt` no Prisma — converter para `Number()` antes de retornar.

## Passos

- **Step 1: Criar PrismaAnalyticsCheckInRepository**

```typescript
// apps/backend/src/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository.ts
import type { PrismaClient } from "@prisma/client"
import { inject, injectable } from "inversify"
import type {
  AnalyticsCheckInRepository,
  CheckInAnalytics,
  DailyCount,
  HourlyCount,
} from "@/analytics/application/repository/analytics-check-in-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class PrismaAnalyticsCheckInRepository implements AnalyticsCheckInRepository {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client)
    private readonly prismaClient: PrismaClient,
  ) {}

  public async fetchCheckInAnalytics(period: AnalyticsPeriod): Promise<CheckInAnalytics> {
    const { from, to } = period

    const [totalResult, dailySeries, hourlyDistribution] = await Promise.all([
      this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "check_ins"
        WHERE created_at >= ${from} AND created_at <= ${to}
      `,
      this.prismaClient.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') as date,
          COUNT(*) as count
        FROM "check_ins"
        WHERE created_at >= ${from} AND created_at <= ${to}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at)
      `,
      this.prismaClient.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*) as count
        FROM "check_ins"
        WHERE created_at >= ${from} AND created_at <= ${to}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `,
    ])

    return {
      totalCheckIns: Number(totalResult[0]?.count ?? 0),
      dailySeries: dailySeries.map(
        (row): DailyCount => ({ date: row.date, count: Number(row.count) }),
      ),
      hourlyDistribution: hourlyDistribution.map(
        (row): HourlyCount => ({ hour: row.hour, count: Number(row.count) }),
      ),
    }
  }
}
```

- **Step 2: Criar PrismaAnalyticsUserRepository**

```typescript
// apps/backend/src/shared/infra/database/repository/prisma/prisma-analytics-user-repository.ts
import type { PrismaClient } from "@prisma/client"
import { inject, injectable } from "inversify"
import type {
  AnalyticsUserRepository,
  AtRiskMember,
  GrowthAnalytics,
  PeriodCount,
  RetentionAnalytics,
} from "@/analytics/application/repository/analytics-user-repository"
import type { AnalyticsPeriod } from "@/analytics/domain/value-object/analytics-period"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

@injectable()
export class PrismaAnalyticsUserRepository implements AnalyticsUserRepository {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client)
    private readonly prismaClient: PrismaClient,
  ) {}

  public async fetchRetentionAnalytics(_period: AnalyticsPeriod): Promise<RetentionAnalytics> {
    // Inativo: sem check-in nos últimos 30 dias (fixo, independente do período selecionado)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const [activeResult, atRiskResult, totalUsersResult] = await Promise.all([
      this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT user_id) as count
        FROM "check_ins"
        WHERE created_at >= ${thirtyDaysAgo}
      `,
      this.prismaClient.$queryRaw<Array<{ id: string; name: string; days_since: number }>>`
        SELECT
          u.id,
          u.name,
          EXTRACT(DAY FROM NOW() - MAX(c.created_at))::int AS days_since
        FROM "users" u
        JOIN "check_ins" c ON c.user_id = u.id
        GROUP BY u.id, u.name
        HAVING MAX(c.created_at) < ${fourteenDaysAgo}
        ORDER BY days_since DESC
        LIMIT 50
      `,
      this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM "users"
      `,
    ])

    const totalUsers = Number(totalUsersResult[0]?.count ?? 0)
    const activeCount = Number(activeResult[0]?.count ?? 0)
    const inactiveCount = Math.max(0, totalUsers - activeCount)
    const churnRate = totalUsers > 0 ? (inactiveCount / totalUsers) * 100 : 0

    return {
      activeCount,
      inactiveCount,
      churnRate: Math.round(churnRate * 100) / 100,
      atRiskMembers: atRiskResult.map(
        (row): AtRiskMember => ({
          id: row.id,
          name: row.name,
          daysSinceLastCheckIn: row.days_since,
        }),
      ),
    }
  }

  public async fetchGrowthAnalytics(period: AnalyticsPeriod): Promise<GrowthAnalytics> {
    const { from, to } = period
    // Agrega por semana para 3m e 12m, por dia para 7d e 30d
    const truncUnit = period.shouldAggregateByWeek() ? "week" : "day"

    const [totalResult, newMembersResult, newMembersPerPeriodResult, activeTrendResult] =
      await Promise.all([
        this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "users" WHERE created_at <= ${to}
        `,
        this.prismaClient.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "users"
          WHERE created_at >= ${from} AND created_at <= ${to}
        `,
        this.prismaClient.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT
            TO_CHAR(DATE_TRUNC(${truncUnit}, created_at), 'YYYY-MM-DD') as date,
            COUNT(*) as count
          FROM "users"
          WHERE created_at >= ${from} AND created_at <= ${to}
          GROUP BY DATE_TRUNC(${truncUnit}, created_at)
          ORDER BY DATE_TRUNC(${truncUnit}, created_at)
        `,
        this.prismaClient.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT
            TO_CHAR(DATE_TRUNC(${truncUnit}, c.created_at), 'YYYY-MM-DD') as date,
            COUNT(DISTINCT c.user_id) as count
          FROM "check_ins" c
          WHERE c.created_at >= ${from} AND c.created_at <= ${to}
          GROUP BY DATE_TRUNC(${truncUnit}, c.created_at)
          ORDER BY DATE_TRUNC(${truncUnit}, c.created_at)
        `,
      ])

    return {
      totalMembers: Number(totalResult[0]?.count ?? 0),
      newMembersCount: Number(newMembersResult[0]?.count ?? 0),
      newMembersPerPeriod: newMembersPerPeriodResult.map(
        (row): PeriodCount => ({ date: row.date, count: Number(row.count) }),
      ),
      activeMembersTrend: activeTrendResult.map(
        (row): PeriodCount => ({ date: row.date, count: Number(row.count) }),
      ),
    }
  }
}
```

- **Step 3: Criar analytics-check-in-repository-provider.ts**

```typescript
// apps/backend/src/shared/infra/ioc/module/analytics/analytics-check-in-repository-provider.ts
import type { ResolutionContext } from "inversify"
import type { AnalyticsCheckInRepository } from "@/analytics/application/repository/analytics-check-in-repository"
import { InMemoryAnalyticsCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-check-in-repository"
import { PrismaAnalyticsCheckInRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository"
import { isProduction } from "@/shared/infra/env"

export class AnalyticsCheckInRepositoryProvider {
  public static provide(context: ResolutionContext): AnalyticsCheckInRepository {
    return isProduction()
      ? context.get(PrismaAnalyticsCheckInRepository, { autobind: true })
      : context.get(InMemoryAnalyticsCheckInRepository, { autobind: true })
  }
}
```

- **Step 4: Criar analytics-user-repository-provider.ts**

```typescript
// apps/backend/src/shared/infra/ioc/module/analytics/analytics-user-repository-provider.ts
import type { ResolutionContext } from "inversify"
import type { AnalyticsUserRepository } from "@/analytics/application/repository/analytics-user-repository"
import { InMemoryAnalyticsUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-analytics-user-repository"
import { PrismaAnalyticsUserRepository } from "@/shared/infra/database/repository/prisma/prisma-analytics-user-repository"
import { isProduction } from "@/shared/infra/env"

export class AnalyticsUserRepositoryProvider {
  public static provide(context: ResolutionContext): AnalyticsUserRepository {
    return isProduction()
      ? context.get(PrismaAnalyticsUserRepository, { autobind: true })
      : context.get(InMemoryAnalyticsUserRepository, { autobind: true })
  }
}
```

- **Step 5: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- `PrismaAnalyticsCheckInRepository` retorna `totalCheckIns` como `number` (não `bigint`)
- `PrismaAnalyticsUserRepository` retorna `churnRate` arredondado a 2 casas decimais
- Providers alternam entre Prisma (produção) e InMemory (desenvolvimento/testes)
- `pnpm --filter backend tsc:check` passa
