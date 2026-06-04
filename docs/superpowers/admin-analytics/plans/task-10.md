# Task 10: Frontend Setup — instalar recharts + shadcn Chart + shadcn Collapsible

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** N/A

## Visão Geral

Instala a dependência `recharts` no frontend, adiciona os componentes `chart` e `collapsible` do shadcn/ui. Esses componentes são pré-requisitos para as seções de gráficos nas tasks 14, 15 e 16.

## Arquivos

- Modify: `apps/frontend/package.json` (recharts adicionado como dependência)
- Create: `apps/frontend/src/components/ui/chart.tsx` (gerado pelo shadcn CLI)
- Create: `apps/frontend/src/components/ui/collapsible.tsx` (gerado pelo shadcn CLI)

### Conformidade com as Skills Padrão

- no-workarounds: usar o CLI do shadcn para adicionar os componentes em vez de copiar o código manualmente.

## Passos

- **Step 1: Instalar recharts**

```bash
pnpm --filter frontend add recharts
```

Expected: `recharts` aparece em `apps/frontend/package.json` em `dependencies`.

- **Step 2: Adicionar componente chart do shadcn**

```bash
pnpm --filter frontend dlx shadcn@latest add chart
```

Expected: arquivo `apps/frontend/src/components/ui/chart.tsx` criado.

- **Step 3: Adicionar componente collapsible do shadcn**

```bash
pnpm --filter frontend dlx shadcn@latest add collapsible
```

Expected: arquivo `apps/frontend/src/components/ui/collapsible.tsx` criado.

- **Step 4: Verificar TypeScript**

```bash
pnpm --filter frontend tsc:check
```

Expected: nenhum erro.

- **Step 5: Verificar que os componentes são importáveis**

Abrir `apps/frontend/src/components/ui/chart.tsx` e confirmar que exporta:
- `ChartContainer`
- `ChartTooltip`
- `ChartTooltipContent`
- `ChartLegend`
- `ChartLegendContent`
- `type ChartConfig`

Abrir `apps/frontend/src/components/ui/collapsible.tsx` e confirmar que exporta:
- `Collapsible`
- `CollapsibleTrigger`
- `CollapsibleContent`

## Critérios de Sucesso

- `recharts` instalado em `apps/frontend/package.json`
- `apps/frontend/src/components/ui/chart.tsx` existe
- `apps/frontend/src/components/ui/collapsible.tsx` existe
- `pnpm --filter frontend tsc:check` passa
