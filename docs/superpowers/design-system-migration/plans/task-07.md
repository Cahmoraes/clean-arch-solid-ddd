# Task 7: Componentes do Dashboard — nova paleta cromática

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Atualizar os 5 componentes da feature dashboard para refletir a nova paleta: sombras nos cards, accent violet nos badges de status, indigo nos destaques numéricos e escala de intensidade indigo no heatmap. `StatusDonutCard` não é alterado (exceção semântica de visualização de dados).

## Arquivos

- Modify: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/kpi-cards.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/weekly-chart.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/heatmap-card.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/checkins-timeline.tsx`
- No-touch: `apps/frontend/src/features/dashboard/components/status-donut-card.tsx`

### Conformidade com as Skills Padrão

- react: componentes client-side — verificar `"use client"` onde necessário
- tailwindcss: usar tokens semânticos; para intensidade de cor no heatmap, usar `bg-primary/[N]` com opacidade variável via Tailwind

## Passos

- [ ] **Step 1: Atualizar profile-hero-card.tsx**

Abrir `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`. Aplicar as seguintes mudanças:

1. Container/card: adicionar `shadow-sm` se usar um Card
2. Badge de status "Ativo": trocar cor por `bg-accent text-accent-foreground` (violet)
3. Badge de status "Inativo": usar `bg-muted text-muted-foreground`
4. Número de destaque (total check-ins, etc.): usar `text-primary font-semibold`

Padrão para badge de status:
```typescript
const statusClass = isActive
  ? "bg-accent text-accent-foreground"
  : "bg-muted text-muted-foreground"

<span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusClass)}>
  {isActive ? "Ativo" : "Inativo"}
</span>
```

- [ ] **Step 2: Atualizar kpi-cards.tsx**

Abrir `apps/frontend/src/features/dashboard/components/kpi-cards.tsx`. Aplicar:

1. Cada card: adicionar `shadow-sm` se usar `Card` do shadcn
2. Número principal de cada KPI: `text-primary font-semibold`
3. Ícone decorativo: `text-primary`
4. Borda do card: `border-border` (warm hairline — via token, não alteração explícita)

Exemplo de um KPI card:
```typescript
<Card className="shadow-sm">
  <CardContent className="p-4">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
    <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
  </CardContent>
</Card>
```

- [ ] **Step 3: Atualizar weekly-chart.tsx**

Abrir `apps/frontend/src/features/dashboard/components/weekly-chart.tsx`. O gráfico provavelmente usa Recharts. Atualizar as barras para usar a cor primária indigo:

1. Cor de barra: trocar cor hardcoded ou `currentColor` por `#1b1938` (ou via CSS var `var(--color-primary)`)
2. Barra ativa/hover: `#1b1938` com opacidade 0.8
3. Tooltip container: adicionar `shadow-md`

Exemplo de configuração de barra no Recharts:
```typescript
<Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
```

- [ ] **Step 4: Atualizar heatmap-card.tsx**

Abrir `apps/frontend/src/features/dashboard/components/heatmap-card.tsx`. Atualizar a escala de intensidade:

1. Trocar a escala de cor para derivada de `primary` (indigo) com opacidade crescente
2. Nenhum check-in: `bg-muted` (cinza quente)
3. 1-2 check-ins: `bg-primary/20`
4. 3-4 check-ins: `bg-primary/40`
5. 5+ check-ins: `bg-primary/80`

Exemplo de lógica de intensidade:
```typescript
function getHeatmapClass(count: number): string {
  if (count === 0) return "bg-muted"
  if (count <= 2) return "bg-primary/20"
  if (count <= 4) return "bg-primary/40"
  return "bg-primary/80"
}
```

- [ ] **Step 5: Atualizar checkins-timeline.tsx**

Abrir `apps/frontend/src/features/dashboard/components/checkins-timeline.tsx`. Atualizar os badges de status:

```typescript
function getStatusClass(status: "VALIDATED" | "PENDING" | "REJECTED"): string {
  switch (status) {
    case "VALIDATED":
      return "bg-accent text-accent-foreground"
    case "PENDING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
    case "REJECTED":
      return "bg-destructive/10 text-destructive"
  }
}
```

Aplicar `getStatusClass(item.status)` no elemento de badge de cada check-in na timeline.

- [ ] **Step 6: Verificar que StatusDonutCard não foi alterado**

```bash
git diff apps/frontend/src/features/dashboard/components/status-donut-card.tsx
```

Esperado: sem diferenças (nenhuma alteração no StatusDonutCard).

- [ ] **Step 7: Verificar lint, tipos e todos os testes**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
```

Esperado: zero erros, todos os testes passam.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/features/dashboard/components/profile-hero-card.tsx \
        apps/frontend/src/features/dashboard/components/kpi-cards.tsx \
        apps/frontend/src/features/dashboard/components/weekly-chart.tsx \
        apps/frontend/src/features/dashboard/components/heatmap-card.tsx \
        apps/frontend/src/features/dashboard/components/checkins-timeline.tsx
git commit -m "feat(frontend/dashboard): nova paleta cromática nos componentes do dashboard"
```

## Critérios de Sucesso

- `ProfileHeroCard` usa `bg-accent text-accent-foreground` no badge Ativo
- `KpiCards` usa `shadow-sm` e `text-primary` nos números
- `WeeklyChart` usa `var(--color-primary)` nas barras
- `HeatmapCard` usa escala de opacidade `bg-primary/[20-80]` para intensidade
- `CheckinsTimeline` usa violet para validado, amber para pendente, destructive para rejeitado
- `StatusDonutCard` permanece inalterado
- Todos os testes passam, lint e tsc sem erros
