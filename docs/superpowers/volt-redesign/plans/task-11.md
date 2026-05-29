# Task 11: Redesign Perfil (profile-card, metric-card, streak) [RF-019]

**Status:** PENDING
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila a tela de Perfil (`/perfil`) no vocabulário VOLT: `profile-card` com banner accent e `Avatar` sobreposto, grid de fatos (ID, "Membro desde", "Check-ins realizados"), e `metric-card` com número mono grande e `streak` (week-dots). Substitui as cores literais hardcoded (`bg-green-950 text-green-400…`) por `StatusBadge`/tokens. Preserva `useMe`, `useMetrics` e o `EditProfileModal` (`useUpdateProfile`).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Modify: `apps/frontend/src/features/profile/components/EditProfileModal.tsx`
- Test: `apps/frontend/src/app/(authenticated)/perfil/perfil-volt.test.tsx` (novo)

### Conformidade com as Skills Padrão

- use code-style: reusar `Avatar`/`StatusBadge`/`RoleBadge`/`Eyebrow`, eliminar cores literais
- use test-antipatterns: mockar `useMe`/`useMetrics`, asserir UI renderizada

## Passos

- [ ] **Step 1: Escrever o teste que falha (profile-card VOLT)**

Crie `apps/frontend/src/app/(authenticated)/perfil/perfil-volt.test.tsx` (ajuste os mocks às assinaturas reais):

```tsx
import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@/test/render"

vi.mock("@/features/profile/api", () => ({
	useMe: () => ({ data: { id: "u1", name: "Caique Moraes", email: "caique@volt.dev", role: "MEMBER", status: "ACTIVE" }, isLoading: false, isError: false }),
	useMetrics: () => ({ data: { checkInsCount: 12 }, isLoading: false, isError: false }),
	useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false }),
}))

import ProfilePage from "./page"

describe("Perfil VOLT", () => {
	test("exibe nome e avatar do usuário", () => {
		render(<ProfilePage />)
		expect(screen.getByText("Caique Moraes")).toBeInTheDocument()
		expect(screen.getByText("CM")).toBeInTheDocument()
	})

	test("exibe a métrica de check-ins", () => {
		render(<ProfilePage />)
		expect(screen.getByText("12")).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "Perfil VOLT"`
Expected: FAIL — estrutura VOLT (avatar/iniciais) ainda não aplicada.

- [ ] **Step 3: Reconstruir o `profile-card` na página**

Substitua o card de perfil por banner accent + `Avatar` sobreposto + grid de fatos:

```tsx
import { Avatar } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Eyebrow } from "@/components/ui/eyebrow"

<div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[1100px]:grid-cols-1">
	<div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
		<div className="h-[92px] bg-gradient-to-r from-accent to-accent/40" />
		<div className="-mt-10 flex items-start gap-[18px] px-7">
			<Avatar name={me.name} size="lg" className="border-4 border-card" />
			<div className="mt-[46px] flex items-center gap-2">
				<RoleBadge role={me.role} />
				<StatusBadge tone={me.status === "ACTIVE" ? "success" : "neutral"}>
					{me.status === "ACTIVE" ? "Ativo" : "Inativo"}
				</StatusBadge>
			</div>
		</div>
		<div className="px-7 pt-2">
			<h1 className="font-display text-2xl font-semibold">{me.name}</h1>
			<p className="font-mono text-[13px] text-subtle">{me.email}</p>
		</div>
		<div className="grid grid-cols-2 gap-3 p-7">
			<div className="rounded-md border border-border bg-surface-2 p-4">
				<p className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-subtle">ID</p>
				<p className="truncate text-[15px] font-semibold">{me.id}</p>
			</div>
			<div className="rounded-md border border-border bg-surface-2 p-4">
				<p className="mb-2 font-mono text-[10.5px] uppercase tracking-wider text-subtle">Check-ins</p>
				<p className="text-[15px] font-semibold tabular font-mono">{metrics.checkInsCount}</p>
			</div>
		</div>
		<div className="px-7 pb-7">
			{/* botão "Editar perfil" que abre EditProfileModal — preserve o handler existente */}
		</div>
	</div>

	{/* metric-card + streak */}
	<div className="rounded-lg border border-border bg-card p-7 shadow-sm">
		<div className="flex flex-col border-b border-border pb-6">
			<span className="font-mono text-[68px] font-bold leading-[0.9] tracking-tight text-accent tabular">
				{metrics.checkInsCount}
			</span>
			<span className="mt-1.5 text-sm text-muted-foreground">check-ins realizados</span>
		</div>
		<div className="pt-[22px]">
			<p className="mb-3.5 text-sm font-semibold">Esta semana</p>
			<div className="flex gap-2">
				{["D","S","T","Q","Q","S","S"].map((d, i) => (
					<span
						key={i}
						className="flex aspect-square flex-1 items-center justify-center rounded-[10px] border border-border bg-surface-2 text-xs font-semibold text-subtle data-[on=true]:border-transparent data-[on=true]:bg-accent data-[on=true]:text-accent-foreground"
						data-on={weekStreak[i] ?? false}
					>
						{d}
					</span>
				))}
			</div>
		</div>
	</div>
</div>
```

> `weekStreak` deve vir das métricas já computadas; se não houver, use um array de `false`. Ajuste `me`/`metrics` aos dados reais retornados pelos hooks.

- [ ] **Step 4: Restilar o `EditProfileModal.tsx`**

Aplique tokens VOLT ao `Dialog`/inputs/botões (inputs no padrão da Task 7; botão salvar accent), preservando `useUpdateProfile` e a validação do schema.

- [ ] **Step 5: Remover cores literais**

Garanta que `perfil/page.tsx` não contém mais classes literais de cor (`bg-green-*`, `text-green-*`). Substitua-as por `StatusBadge`/tokens.

Run: `grep -nE "bg-green-|text-green-|bg-red-|text-red-" "apps/frontend/src/app/(authenticated)/perfil/page.tsx"`
Expected: nenhum resultado.

- [ ] **Step 6: Rodar o teste, suíte, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "Perfil VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend test && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/perfil/page.tsx" apps/frontend/src/features/profile/
git commit -m "feat(volt-redesign): perfil com profile-card, metric-card e streak VOLT"
```

## Critérios de Sucesso

- `profile-card` com banner accent, `Avatar` sobreposto e grid de fatos [RF-019]
- `metric-card` com número mono grande e `streak` week-dots
- Cores literais substituídas por `StatusBadge`/tokens
- Funcionalidade preservada: edição de perfil
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
