# Task 14: Frontend — CheckInMetricsSection component [FR-007, FR-008, FR-009, FR-010]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-12

## Visão Geral

Cria o componente `CheckInMetricsSection` dentro de um `Collapsible` (aberto por padrão). Exibe um gráfico de linha com a evolução diária/semanal de check-ins e um gráfico de barras com distribuição horária usando shadcn Chart + Recharts.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/check-in-metrics-section.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: usar `ChartContainer` do `@/components/ui/chart` como wrapper dos gráficos Recharts para garantir tema correto (dark mode via CSS variables).

## Passos

- **Step 1: Criar CheckInMetricsSection**

```typescript
// apps/frontend/src/features/admin/analytics/components/check-in-metrics-section.tsx
"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
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
import { useCheckInMetrics } from "../api/use-check-in-metrics"

const lineChartConfig: ChartConfig = {
  count: { label: "Check-ins", color: "hsl(var(--chart-1))" },
}

const barChartConfig: ChartConfig = {
  count: { label: "Check-ins", color: "hsl(var(--chart-2))" },
}

interface CheckInMetricsSectionProps {
  period: PeriodKey
}

export function CheckInMetricsSection({ period }: CheckInMetricsSectionProps) {
  const [isOpen, setIsOpen] = useState(true) // aberto por padrão (FR-010)
  const { data, isPending, isError } = useCheckInMetrics(period)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left font-semibold hover:bg-accent/50">
        <span>Check-ins</span>
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
            Erro ao carregar dados de check-ins.
          </p>
        )}

        {data && data.dailySeries.length === 0 && (
          <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
            Nenhum check-in registrado neste período.
          </p>
        )}

        {data && data.dailySeries.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Evolução de check-ins
            </h3>
            <ChartContainer config={lineChartConfig} className="h-[200px]">
              <LineChart data={data.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)} // "MM-DD"
                />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}

        {data && data.hourlyDistribution.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Distribuição por hora
            </h3>
            <ChartContainer config={barChartConfig} className="h-[200px]">
              <BarChart data={data.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${v}h`}
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

- Seção aberta por padrão (`useState(true)`, conforme FR-010)
- Gráfico de linha para `dailySeries` com `XAxis` mostrando `MM-DD`
- Gráfico de barras para `hourlyDistribution` com `XAxis` mostrando `{n}h`
- Estado vazio exibido quando `dailySeries.length === 0`
- `ChartContainer` usado como wrapper (garante dark mode)
- `pnpm --filter frontend tsc:check` passa
