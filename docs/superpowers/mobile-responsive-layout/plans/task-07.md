# Task 7: WeeklyChart + tipografia responsiva [FR-013, FR-014]

**Status:** DONE
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** N/A

## Visão Geral

Três mudanças pontuais de tipografia e altura de gráfico para melhorar a legibilidade em mobile:

1. `WeeklyChart`: reduzir altura de barras de `200px` para `140px` no mobile
2. `StatCard`: reduzir valor principal de `text-[38px]` para `text-3xl` no mobile
3. `PageHeader` (dashboard): reduzir título de `text-[30px]` para `text-2xl` no mobile

## Arquivos

- Modify: `apps/frontend/src/features/dashboard/components/weekly-chart.tsx`
- Modify: `apps/frontend/src/components/ui/stat-card.tsx`
- Modify: `apps/frontend/src/components/ui/page-header.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: Tailwind responsive prefixes, sem JS de layout

## Passos

- **Step 1: Atualizar altura das barras do WeeklyChart**

No arquivo `apps/frontend/src/features/dashboard/components/weekly-chart.tsx`, localizar:

```tsx
<div className="flex h-[200px] items-end gap-2.5">
```

Substituir por:

```tsx
<div className="flex h-[140px] items-end gap-2.5 md:h-[200px]">
```

> `h-[140px]` no mobile (≈70% da altura original) evita barras cortadas e melhora a proporção em telas < 768px.

- **Step 2: Atualizar tipografia do StatCard**

No arquivo `apps/frontend/src/components/ui/stat-card.tsx`, localizar o elemento com `text-[38px]`:

```tsx
className="font-mono text-[38px] font-bold leading-none text-foreground"
```

Substituir por:

```tsx
className="font-mono text-3xl font-bold leading-none text-foreground md:text-[38px]"
```

> `text-3xl` = 30px, preserva a hierarquia visual sem overflow em telas menores.

- **Step 3: Atualizar tipografia do PageHeader**

No arquivo `apps/frontend/src/components/ui/page-header.tsx`, localizar:

```tsx
className="font-display text-[30px] font-semibold leading-tight text-foreground"
```

Substituir por:

```tsx
className="font-display text-2xl font-semibold leading-tight text-foreground md:text-[30px]"
```

> `text-2xl` = 24px mobile vs 30px desktop.

- **Step 4: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 5: Verificar testes de snapshot/visual se existirem**

```bash
pnpm --filter frontend test -- src/features/dashboard src/components/ui
```

Expected: todos os testes passam. Se existirem snapshots desatualizados, atualizá-los com `pnpm --filter frontend test -- --update-snapshots`.

- **Step 6: Commit**

```bash
cd apps/frontend
git add src/features/dashboard/components/weekly-chart.tsx \
        src/components/ui/stat-card.tsx \
        src/components/ui/page-header.tsx
git commit -m "feat(dashboard): responsive typography and chart height

- WeeklyChart: h-[140px] mobile → md:h-[200px]
- StatCard: text-3xl mobile → md:text-[38px]
- PageHeader: text-2xl mobile → md:text-[30px]

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- FR-013: `StatCard` e `PageHeader` com tipografia responsiva reduzida no mobile
- FR-014: `WeeklyChart` com altura responsiva `h-[140px] md:h-[200px]`
- Três mudanças são additive-only (sem alterar estrutura JSX)
- `pnpm --filter frontend tsc:check` sem erros
- Nenhum teste existente quebrou
