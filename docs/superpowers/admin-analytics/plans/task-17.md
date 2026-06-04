# Task 17: Frontend — AnalyticsPage assembly + navegação sidebar [FR-001, FR-002, FR-003]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-13, task-14, task-15, task-16

## Visão Geral

Monta a página `/admin/analytics` compondo todos os componentes criados nas tasks anteriores: `PeriodSelector`, `AnalyticsKpiRow`, `CheckInMetricsSection`, `RetentionMetricsSection` e `GrowthMetricsSection`. Adiciona o link "Analytics" na navegação sidebar do admin.

## Arquivos

- Create: `apps/frontend/src/app/(authenticated)/admin/analytics/page.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: a página deve ser envolvida em `<Suspense>` porque usa `useSearchParams()` via `useAnalyticsPeriod`. O Next.js exige Suspense para hooks que leem search params em Server Components. Envolver o conteúdo da página em `<Suspense>`.

## Passos

- **Step 1: Criar a página**

```typescript
// apps/frontend/src/app/(authenticated)/admin/analytics/page.tsx
"use client"

import { Suspense } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { AnalyticsKpiRow } from "@/features/admin/analytics/components/analytics-kpi-row"
import { CheckInMetricsSection } from "@/features/admin/analytics/components/check-in-metrics-section"
import { GrowthMetricsSection } from "@/features/admin/analytics/components/growth-metrics-section"
import { PeriodSelector } from "@/features/admin/analytics/components/period-selector"
import { RetentionMetricsSection } from "@/features/admin/analytics/components/retention-metrics-section"
import { useAnalyticsPeriod } from "@/features/admin/analytics/hooks/use-analytics-period"

function AnalyticsContent() {
  const { period, setPeriod } = useAnalyticsPeriod()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <PeriodSelector value={period} onValueChange={setPeriod} />
      </div>

      <AnalyticsKpiRow period={period} />

      <CheckInMetricsSection period={period} />
      <RetentionMetricsSection period={period} />
      <GrowthMetricsSection period={period} />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <PageHeader title="Analytics" />
      <Suspense>
        <AnalyticsContent />
      </Suspense>
    </PageContainer>
  )
}
```

- **Step 2: Adicionar link de navegação no sidebar**

Abrir `apps/frontend/src/components/layout/authenticated-shell.tsx`.

Localizar o import dos ícones Lucide no topo do arquivo (linha com `import { ... } from "lucide-react"`). Adicionar `BarChart3` à lista de imports.

Localizar a constante `ADMIN_NAV_ITEMS`:

```typescript
const ADMIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/check-ins", label: "Check-ins", icon: CheckCircle },
]
```

Alterar para:

```typescript
const ADMIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/check-ins", label: "Check-ins", icon: CheckCircle },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
]
```

- **Step 3: Verificar TypeScript**

```bash
pnpm --filter frontend tsc:check
```

Expected: nenhum erro.

- **Step 4: Rodar todos os testes do frontend**

```bash
pnpm --filter frontend test
```

Expected: todos os testes existentes passam.

- **Step 5: Verificar build completo**

```bash
pnpm build
```

Expected: build completo sem erros.

## Critérios de Sucesso

- Página `/admin/analytics` renderiza com layout correto
- `PeriodSelector` no topo atualiza URL com `?period=`
- Todos os componentes de seção recebem `period` via prop
- Link "Analytics" visível no sidebar apenas para admins
- `AdminGuard` em `apps/frontend/src/app/(authenticated)/admin/layout.tsx` protege a rota automaticamente (nenhuma alteração necessária no layout)
- `pnpm --filter frontend tsc:check` passa
- `pnpm build` passa
