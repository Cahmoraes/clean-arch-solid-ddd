# Task 13: Frontend — AnalyticsKpiRow component [FR-004, FR-005, FR-006]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-12

## Visão Geral

Cria o componente `AnalyticsKpiRow` que exibe três `StatCard`s com total de check-ins, taxa de retenção e novos membros. Implementa estados de loading (skeleton) e erro independentes por card.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/analytics-kpi-row.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: `StatCard` exige `icon: LucideIcon` — não passar string ou JSX para `icon`, passar o componente Lucide diretamente.

## Passos

- **Step 1: Criar AnalyticsKpiRow**

```typescript
// apps/frontend/src/features/admin/analytics/components/analytics-kpi-row.tsx
"use client"

import { Activity, TrendingUp, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/ui/stat-card"
import type { PeriodKey } from "../hooks/use-analytics-period"
import { useCheckInMetrics } from "../api/use-check-in-metrics"
import { useGrowthMetrics } from "../api/use-growth-metrics"
import { useRetentionMetrics } from "../api/use-retention-metrics"

interface AnalyticsKpiRowProps {
  period: PeriodKey
}

function KpiSkeleton() {
  return <Skeleton className="h-28 w-full rounded-lg" />
}

function KpiError({ message }: { message: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}

export function AnalyticsKpiRow({ period }: AnalyticsKpiRowProps) {
  const checkInQuery = useCheckInMetrics(period)
  const retentionQuery = useRetentionMetrics(period)
  const growthQuery = useGrowthMetrics(period)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {checkInQuery.isPending ? (
        <KpiSkeleton />
      ) : checkInQuery.isError ? (
        <KpiError message="Erro ao carregar check-ins" />
      ) : (
        <StatCard
          icon={Activity}
          value={checkInQuery.data.totalCheckIns.toLocaleString("pt-BR")}
          label="Check-ins no período"
        />
      )}

      {retentionQuery.isPending ? (
        <KpiSkeleton />
      ) : retentionQuery.isError ? (
        <KpiError message="Erro ao carregar retenção" />
      ) : (
        <StatCard
          icon={Users}
          value={`${(100 - retentionQuery.data.churnRate).toFixed(1)}%`}
          label="Taxa de retenção"
        />
      )}

      {growthQuery.isPending ? (
        <KpiSkeleton />
      ) : growthQuery.isError ? (
        <KpiError message="Erro ao carregar crescimento" />
      ) : (
        <StatCard
          icon={TrendingUp}
          value={growthQuery.data.newMembersCount.toLocaleString("pt-BR")}
          label="Novos membros"
        />
      )}
    </div>
  )
}
```

- **Step 2: Verificar TypeScript**

```bash
pnpm --filter frontend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- Três `StatCard`s com ícones Lucide (não strings)
- Cada card tem skeleton independente durante loading (`isPending`)
- Cada card exibe erro independente sem bloquear os outros (`isError`)
- Taxa de retenção calculada como `100 - churnRate`
- `pnpm --filter frontend tsc:check` passa
