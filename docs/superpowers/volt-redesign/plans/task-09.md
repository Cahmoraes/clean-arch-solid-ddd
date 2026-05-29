# Task 9: Redesign Admin Usuários (page-header, segmented, search, user-row) [RF-017]

**Status:** PENDING
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila a tela de Admin Usuários (`/admin/usuarios`) no vocabulário VOLT: `PageHeader`, filtros via `SegmentedControl` (com contadores do `useUserStats`), `SearchBar`, e linhas de usuário (`user-row`) com `Avatar`, `RoleBadge` e `StatusBadge`. Preserva integralmente a funcionalidade: filtros, busca com debounce, paginação, e o `UserDetailModal` (ações activate/suspend/promote/demote). Substitui o `UserFilterBar` baseado em `Button` pelo `SegmentedControl`.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail-modal.tsx`
- Test: `apps/frontend/src/features/admin/components/user-row.test.tsx` (novo ou estendido)

### Conformidade com as Skills Padrão

- use code-style: reusar `SegmentedControl`/`RoleBadge`/`StatusBadge`/`Avatar`, tokens semânticos
- use test-antipatterns: asserir conteúdo da linha (nome/email/role), sem testar internals

## Passos

- [ ] **Step 1: Escrever o teste que falha (user-row VOLT)**

Crie/estenda `apps/frontend/src/features/admin/components/user-row.test.tsx`. Asserções sobre o conteúdo renderizado de uma linha (ajuste o shape do `user` ao tipo real em `features/admin/types.ts`):

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { UserRow } from "./user-row"

const user = {
	id: "u1",
	name: "Caique Moraes",
	email: "caique@volt.dev",
	role: "ADMIN" as const,
	status: "ACTIVE" as const,
	checkInsCount: 12,
}

describe("UserRow VOLT", () => {
	test("exibe nome, e-mail e badge de role Admin", () => {
		render(<UserRow user={user} onSelect={vi.fn()} />)
		expect(screen.getByText("Caique Moraes")).toBeInTheDocument()
		expect(screen.getByText("caique@volt.dev")).toBeInTheDocument()
		expect(screen.getByText("Admin")).toBeInTheDocument()
	})

	test("dispara onSelect ao clicar na linha", () => {
		const onSelect = vi.fn()
		render(<UserRow user={user} onSelect={onSelect} />)
		fireEvent.click(screen.getByText("Caique Moraes"))
		expect(onSelect).toHaveBeenCalled()
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "UserRow VOLT"`
Expected: FAIL — a linha ainda não usa `RoleBadge`/estrutura esperada.

- [ ] **Step 3: Reescrever `user-row.tsx`**

Use `Avatar`, `RoleBadge` e `StatusBadge`, preservando a prop `onSelect` e os dados existentes. A linha é um card clicável:

```tsx
import { MoreHorizontal } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"

// dentro do componente:
<button
	type="button"
	onClick={() => onSelect(user)}
	className="flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-[transform,border-color] hover:translate-x-0.5 hover:border-border-strong"
>
	<Avatar name={user.name} size="sm" />
	<div className="min-w-0 flex-1">
		<p className="text-[15.5px] font-semibold">{user.name}</p>
		<p className="font-mono text-[13px] text-subtle">{user.email}</p>
	</div>
	<span className="text-[13px] text-muted-foreground max-[560px]:hidden">
		{user.checkInsCount} check-ins
	</span>
	<RoleBadge role={user.role} />
	<StatusBadge tone={user.status === "ACTIVE" ? "success" : "neutral"}>
		{user.status === "ACTIVE" ? "Ativo" : "Inativo"}
	</StatusBadge>
	<MoreHorizontal className="h-4 w-4 text-subtle" aria-hidden="true" />
</button>
```

> Ajuste os nomes dos campos (`status`, `checkInsCount`) aos do tipo real; mantenha o comportamento de seleção.

- [ ] **Step 4: Substituir o `UserFilterBar` pelo `SegmentedControl`**

Reescreva `user-filter-bar.tsx` para envolver o `SegmentedControl`, mapeando os 5 filtros e injetando contadores do `useUserStats`:

```tsx
import { SegmentedControl } from "@/components/ui/segmented-control"

const items = [
	{ value: "todos", label: "Todos", count: stats?.total },
	{ value: "membros", label: "Membros", count: stats?.members },
	{ value: "admins", label: "Administradores", count: stats?.admins },
	{ value: "ativos", label: "Ativos", count: stats?.active },
	{ value: "inativos", label: "Inativos", count: stats?.inactive },
]

return (
	<SegmentedControl
		aria-label="Filtrar usuários"
		items={items}
		value={value}
		onValueChange={onChange}
	/>
)
```

> Mantenha as props `value`/`onChange` que a página já passa; ajuste os nomes de campos do `stats` aos retornados por `useUserStats`.

- [ ] **Step 5: Aplicar `PageHeader` e `SearchBar` na página**

Em `page.tsx`, troque o header manual por `PageHeader` (eyebrow "Admin", título "Usuários", ação "Convidar") e o `Input` de busca pelo `SearchBar`, preservando o debounce e o estado de filtro:

```tsx
import { PageHeader } from "@/components/ui/page-header"
import { SearchBar } from "@/components/ui/search-bar"
// ...
<PageHeader eyebrow="Admin" title="Usuários" subtitle="Gerencie membros e administradores" />
<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
	<UserFilterBar value={filter} onChange={setFilter} />
	<SearchBar
		placeholder="Buscar por nome ou e-mail"
		value={search}
		onChange={(e) => setSearch(e.target.value)}
		className="max-w-xs"
	/>
</div>
<div className="flex flex-col gap-3.5">
	{/* lista de UserRow */}
</div>
```

- [ ] **Step 6: Restilar o `user-detail-modal.tsx`**

Aplique tokens VOLT ao `Dialog`/`AlertDialog` existente (cabeçalho com `RoleBadge`, botões accent/danger), sem alterar as mutations. Botões:

- Promover/Rebaixar (accent): `className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-primary-strong"`
- Ações destrutivas (suspender): `className="h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"`

- [ ] **Step 7: Rodar o teste, suíte, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "UserRow VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend test && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde. Atualize testes antigos do `UserFilterBar` que esperem `Button`/`aria-pressed` no formato anterior.

- [ ] **Step 8: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" apps/frontend/src/features/admin/
git commit -m "feat(volt-redesign): admin usuários com segmented, search e user-row VOLT"
```

## Critérios de Sucesso

- `PageHeader` + `SegmentedControl` (com contadores) + `SearchBar` na tela [RF-017]
- `user-row` com `Avatar`, `RoleBadge` e `StatusBadge`, clicável para o detalhe
- Funcionalidade preservada: filtros, busca com debounce, paginação, modal de ações
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
