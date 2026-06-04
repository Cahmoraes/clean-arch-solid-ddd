# Task 16: Frontend — GrowthMetricsSection component [FR-014, FR-015, FR-016]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-12

## Visão Geral

Cria o componente `GrowthMetricsSection` dentro de um `Collapsible` (fechado por padrão). Exibe um gráfico de área com a tendência de membros ativos e um gráfico de barras com novos membros por período.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/growth-metrics-section.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: `AreaChart` e `Area` do recharts requerem o `<defs>` com `linearGradient` para o efeito de preenchimento. Usar `fillOpacity` no `Area` em vez de CSS para compatibilidade com modo escuro.

## Passos

- **Step 1: Criar GrowthMetricsSection**

```typescript
// apps/frontend/src/features/admin/analytics/components/growth-metrics-section.tsx
"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import type { PeriodKey } from "../hooks/use-analytics-period"
import { useGrowthMetrics } from "../api/use-growth-metrics"

const areaChartConfig: ChartConfig = {
  count: { label: "Membros ativos", color: "hsl(var(--chart-1))" },
}

const barChartConfig: ChartConfig = {
  count: { label: "Novos membros", color: "hsl(var(--chart-3))" },
}

interface GrowthMetricsSectionProps {
  period: PeriodKey
}

export function GrowthMetricsSection({ period }: GrowthMetricsSectionProps) {
  const [isOpen, setIsOpen] = useState(false) // fechado por padrão (FR-016)
  const { data, isPending, isError } = useGrowthMetrics(period)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left font-semibold hover:bg-accent/50">
        <span>Crescimento</span>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-6">
        {isPending && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-lg" />
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        )}

        {isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Erro ao carregar dados de crescimento.
          </p>
        )}

        {data && data.activeMembersTrend.length === 0 && (
          <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
            Nenhum dado de crescimento neste período.
          </p>
        )}

        {data && data.activeMembersTrend.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Tendência de membros ativos
            </h3>
            <ChartContainer config={areaChartConfig} className="h-[200px]">
              <AreaChart data={data.activeMembersTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  fill="url(#colorCount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {data && data.newMembersPerPeriod.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Novos membros por período
            </h3>
            <ChartContainer config={barChartConfig} className="h-[200px]">
              <BarChart data={data.newMembersPerPeriod}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
```

- **Step 2: Verificar TypeScript**

```bash
pnpm --filter frontend tsc:check
```

Expected: nenhum erro.

## Critérios de Sucesso

- Seção fechada por padrão (`useState(false)`, conforme FR-016)
- `AreaChart` com gradiente para `activeMembersTrend`
- `BarChart` para `newMembersPerPeriod`
- `ChartContainer` usado como wrapper com `config` correto
- `pnpm --filter frontend tsc:check` passa
