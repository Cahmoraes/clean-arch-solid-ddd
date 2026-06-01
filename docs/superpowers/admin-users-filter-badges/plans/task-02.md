# Task 2: Atualizar página admin `/admin/usuarios` — remover EMPTY_STATS [RF-001, RF-006, RF-007]

**Status:** PENDING
**PRD:** `../prd/prd-admin-users-filter-badges.md`
**Spec:** `../specs/admin-users-filter-badges-design.md`
**Depends on:** task-01

## Visão Geral

A página `AdminUsersPage` atualmente usa `EMPTY_STATS = { total: 0, ... }` como fallback para enquanto `useUserStats()` carrega, exibindo zeros nos badges. Após a mudança em `UserFilterBar` (task-01), a prop passou a ser `stats?: UserStats` (opcional) — basta passar `stats={statsData}` diretamente, sem fallback. Quando `statsData` é `undefined` (loading ou erro), nenhum badge é exibido.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: não usar fallback de valor default para queries ainda não resolvidas; deixar `undefined` fluir para os componentes filhos tratarem visualmente

## Passos

- **Step 1: Localizar e remover `EMPTY_STATS` e atualizar o uso na página**

No arquivo `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, fazer as seguintes alterações:

**Remover** a constante `EMPTY_STATS` (linhas próximas de):
```tsx
const EMPTY_STATS: UserStats = {
	total: 0,
	members: 0,
	admins: 0,
	active: 0,
	inactive: 0,
}
```

**Alterar** a desestruturação de `useUserStats()` de:
```tsx
const { data: statsData } = useUserStats()
const stats: UserStats = statsData ?? EMPTY_STATS
```
para:
```tsx
const { data: stats } = useUserStats()
```

**Alterar** a prop passada para `UserFilterBar` de:
```tsx
<UserFilterBar
	activeFilter={activeFilter}
	counts={stats}
	onFilterChange={handleFilterChange}
	className="w-full [&>button]:flex-1 [&>button]:justify-center"
/>
```
para:
```tsx
<UserFilterBar
	activeFilter={activeFilter}
	stats={stats}
	onFilterChange={handleFilterChange}
	className="w-full [&>button]:flex-1 [&>button]:justify-center"
/>
```

**Remover** também o import de `UserStats` se não for mais utilizado em outro lugar na página:
```tsx
// remover da linha de import:
import type { UserFilter, UserStats } from "@/features/admin/types"
// manter apenas:
import type { UserFilter } from "@/features/admin/types"
```

- **Step 2: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Saída esperada: nenhum erro. Se houver erro de "Property 'counts' does not exist", confirmar que o import e o JSX foram atualizados corretamente.

- **Step 3: Executar lint**

```bash
pnpm --filter frontend lint:fix
```

Saída esperada: nenhum erro.

- **Step 4: Executar todos os testes do frontend**

```bash
pnpm --filter frontend test -- --run
```

Saída esperada: todos os testes passando (sem regressões).

- **Step 5: Build de produção**

```bash
pnpm --filter frontend build
```

Saída esperada: build concluído sem erros.

- **Step 6: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/admin/usuarios/page.tsx
git commit -m "feat(admin): remove EMPTY_STATS fallback, pass stats directly to UserFilterBar"
```

## Critérios de Sucesso

- `EMPTY_STATS` removido da página — sem zeros enganosos durante loading
- `UserFilterBar` recebe `stats={stats}` (undefined enquanto carrega, objeto após carregar)
- `pnpm tsc:check`, `pnpm lint:fix`, `pnpm test -- --run`, `pnpm build` todos passando sem erros
- RF-001..RF-005: badges aparecem com valores corretos após stats carregadas
- RF-006..RF-007: sem badge durante loading e erro (degradação silenciosa)
