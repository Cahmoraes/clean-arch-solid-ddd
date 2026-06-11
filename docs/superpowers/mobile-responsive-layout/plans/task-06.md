# Task 6: ProfileHeroCard — layout responsivo [FR-011, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** N/A

## Visão Geral

O `ProfileHeroCard` usa `flex flex-wrap items-center gap-4` com `InlineStats` tendo `ml-auto`. Em mobile, quando a row quebra, o `ml-auto` empurra as stats para a direita de uma nova linha desalinhada. A solução: agrupar Avatar+UserInfo em um div interno, colocar o container raiz em `flex-col` no mobile, e fazer `InlineStats` ocupar linha própria centralizada com borda superior.

## Arquivos

- Modify: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: CSS-only responsive, sem useMediaQuery

## Passos

- **Step 1: Localizar as seções a modificar**

No arquivo `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`:

**Container raiz do card (a modificar):**
```tsx
<div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
  <Avatar name={me?.name} />
  <UserInfo me={me} />
  <InlineStats
    total={metrics?.checkInsCount ?? 0}
    thisMonth={thisMonth}
    streak={streak}
  />
</div>
```

**Função `InlineStats` (a modificar):**
```tsx
function InlineStats({ total, thisMonth, streak }) {
  return (
    <div className="ml-auto flex gap-6">
```

- **Step 2: Reestruturar o container raiz e agrupar Avatar+UserInfo**

Substituir o JSX do `return` dentro de `ProfileHeroCard` (a parte após o guard de loading):

```tsx
return (
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:flex-wrap md:items-center">
    <div className="flex items-center gap-4">
      <Avatar name={me?.name} />
      <UserInfo me={me} />
    </div>
    <InlineStats
      total={metrics?.checkInsCount ?? 0}
      thisMonth={thisMonth}
      streak={streak}
    />
  </div>
)
```

> **Por que agrupar Avatar+UserInfo:** no mobile (flex-col), os itens empilham verticalmente. Se Avatar e UserInfo fossem irmãos diretos do container, cada um ocuparia uma linha própria. Agrupando-os, ficam lado a lado em uma linha e InlineStats fica na linha abaixo.

- **Step 3: Atualizar a função `InlineStats` para o novo layout responsivo**

Substituir a função `InlineStats` completa:

```tsx
function InlineStats({
  total,
  thisMonth,
  streak,
}: {
  total: number
  thisMonth: number
  streak: number
}) {
  return (
    <div className="flex w-full justify-center gap-6 border-t border-border pt-4 md:ml-auto md:w-auto md:border-0 md:pt-0 md:justify-start">
      <div className="text-center">
        <p className="text-lg font-semibold text-primary md:text-xl">{total}</p>
        <p className="text-xs text-muted-foreground">Total</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-primary md:text-xl">{thisMonth}</p>
        <p className="text-xs text-muted-foreground">Este mês</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-primary md:text-xl">{streak}</p>
        <p className="text-xs text-muted-foreground">Sequência</p>
      </div>
    </div>
  )
}
```

> **Mudanças:**
> - `ml-auto flex gap-6` → `flex w-full justify-center gap-6 ... md:ml-auto md:w-auto`
> - `border-t border-border pt-4` no mobile, removido em `md:`
> - Tipografia responsiva: `text-lg md:text-xl` (FR-013)

- **Step 4: Atualizar o Skeleton para ser consistente com o novo layout**

Substituir `ProfileHeroCardSkeleton`:

```tsx
function ProfileHeroCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:flex-row md:flex-wrap md:items-center">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      <div className="flex w-full justify-center gap-6 border-t border-border pt-4 md:ml-auto md:w-auto md:border-0 md:pt-0">
        <Skeleton className="h-12 w-12" />
        <Skeleton className="h-12 w-12" />
        <Skeleton className="h-12 w-12" />
      </div>
    </div>
  )
}
```

- **Step 5: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 6: Verificar que nenhum teste de dashboard quebrou**

```bash
pnpm --filter frontend test -- src/features/dashboard
```

Expected: todos os testes passam

- **Step 7: Commit**

```bash
cd apps/frontend
git add src/features/dashboard/components/profile-hero-card.tsx
git commit -m "feat(dashboard): make ProfileHeroCard responsive

Em mobile (<768px) avatar+info ficam em linha e InlineStats
em linha própria centralizada com borda superior.
Tipografia de stats reduzida: text-lg md:text-xl.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- FR-011: em mobile (<768px), avatar+nome em uma linha; stats em linha própria abaixo, centralizada com borda superior
- FR-012: em desktop (≥768px), layout original (tudo em uma linha, stats com ml-auto) mantido
- Skeleton atualizado consistentemente
- Tipografia das stats responsiva: `text-lg` mobile, `text-xl` desktop
- `pnpm --filter frontend tsc:check` sem erros
