# Task 5: StatusDonutCard — layout responsivo [FR-009, FR-010]

**Status:** DONE
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** N/A

## Visão Geral

O `StatusDonutCard` exibe donut SVG e legenda lado a lado com `flex items-center justify-center gap-6`. Em mobile o espaço é insuficiente. A correção coloca legenda abaixo do donut em `flex-col` no mobile e restaura o layout horizontal no desktop com `md:flex-row`.

## Arquivos

- Modify: `apps/frontend/src/features/dashboard/components/status-donut-card.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: CSS-only responsive, sem useMediaQuery

## Passos

- **Step 1: Localizar o container principal do conteúdo no componente**

No arquivo `apps/frontend/src/features/dashboard/components/status-donut-card.tsx`, localizar a linha:

```tsx
<div className="flex items-center justify-center gap-6">
```

E a lista de legenda:

```tsx
<ul className="flex flex-col gap-2">
```

- **Step 2: Substituir as classes do container de conteúdo e da legenda**

Trocar o container de conteúdo de:

```tsx
<div className="flex items-center justify-center gap-6">
```

Para:

```tsx
<div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
```

Trocar a legenda de:

```tsx
<ul className="flex flex-col gap-2">
```

Para:

```tsx
<ul className="flex flex-row flex-wrap justify-center gap-x-4 gap-y-2 md:flex-col md:gap-2">
```

> **Justificativa:** no mobile (flex-col), a legenda precisa ser horizontal (`flex-row flex-wrap`) para não ocupar muito espaço vertical. No desktop (md:flex-row), a legenda fica vertical ao lado do donut como antes.

- **Step 3: Aplicar a mesma correção no estado de loading (Skeleton)**

No mesmo arquivo, localizar o skeleton do card:

```tsx
<div className="flex items-center justify-center gap-6">
  <Skeleton className="h-20 w-20 rounded-full" />
  <div className="flex flex-col gap-2">
```

Trocar para:

```tsx
<div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
  <Skeleton className="h-20 w-20 rounded-full" />
  <div className="flex flex-row flex-wrap justify-center gap-x-3 gap-y-2 md:flex-col md:gap-2">
```

- **Step 4: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 5: Verificar que nenhum teste de dashboard quebrou**

```bash
pnpm --filter frontend test -- src/features/dashboard
```

Expected: todos os testes passam

- **Step 6: Commit**

```bash
cd apps/frontend
git add src/features/dashboard/components/status-donut-card.tsx
git commit -m "feat(dashboard): make StatusDonutCard responsive

Em mobile (<768px) legenda fica abaixo do donut em layout
flex-row flex-wrap. Desktop mantém layout lado a lado.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- FR-009: abaixo de `md` (768px), a legenda está abaixo do donut (container `flex-col`)
- FR-010: em `md` e acima, layout original (donut + legenda lado a lado) mantido
- Skeleton atualizado consistentemente com o layout responsivo
- `pnpm --filter frontend tsc:check` sem erros
