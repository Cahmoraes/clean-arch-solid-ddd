# Task 15: Frontend — RetentionMetricsSection component [FR-011, FR-012, FR-013]

**Status:** PENDING
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-12

## Visão Geral

Cria o componente `RetentionMetricsSection` dentro de um `Collapsible` (fechado por padrão). Exibe contagem de membros ativos/inativos, taxa de churn e lista de membros em risco (sem check-in nos últimos 14 dias).

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/retention-metrics-section.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: a seção de retenção deve estar fechada por padrão (`useState(false)`), conforme FR-013.

## Passos

- **Step 1: Criar RetentionMetricsSection**

```typescript
// apps/frontend/src/features/admin/analytics/components/retention-metrics-section.tsx
"use client"

import { AlertTriangle, ChevronDown } from "lucide-react"
import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import type { PeriodKey } from "../hooks/use-analytics-period"
import { useRetentionMetrics } from "../api/use-retention-metrics"

interface RetentionMetricsSectionProps {
  period: PeriodKey
}

export function RetentionMetricsSection({ period }: RetentionMetricsSectionProps) {
  const [isOpen, setIsOpen] = useState(false) // fechado por padrão (FR-013)
  const { data, isPending, isError } = useRetentionMetrics(period)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-card p-4 text-left font-semibold hover:bg-accent/50">
        <span>Retenção</span>
        <ChevronDown
          className="h-4 w-4 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-4">
        {isPending && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            <Skeleton className="h-40 rounded-lg" />
          </div>
        )}

        {isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Erro ao carregar dados de retenção.
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.activeCount.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-muted-foreground">Membros ativos</p>
                <p className="text-xs text-muted-foreground">(últimos 30 dias)</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {data.inactiveCount.toLocaleString("pt-BR")}
                </p>
                <p className="text-sm text-muted-foreground">Membros inativos</p>
                <p className="text-xs text-muted-foreground">(sem check-in em 30+ dias)</p>
              </div>

              <div className="rounded-lg border bg-card p-4">
                <p className="text-2xl font-bold">
                  {data.churnRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de churn</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-medium">
                  Membros em risco ({data.atRiskMembers.length})
                </h3>
              </div>

              {data.atRiskMembers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Nenhum membro em risco no momento.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.atRiskMembers.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="font-medium">{member.name}</span>
                      <span className="text-muted-foreground">
                        {member.daysSinceLastCheckIn} dias sem check-in
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
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

- Seção fechada por padrão (`useState(false)`, conforme FR-013)
- Três cards: ativos (verde), inativos (vermelho), churn (neutro)
- Lista de membros em risco com nome e dias desde último check-in
- Estado vazio quando `atRiskMembers.length === 0`
- `pnpm --filter frontend tsc:check` passa
