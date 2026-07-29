# Task 2: Hidratação SSR sem flash (layout + shell) [FR-008]

**Status:** PENDING
**PRD:** `../prd/prd-sim-gym-view-toggle.md`
**Spec:** `../specs/sim-gym-view-toggle-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Eliminar o flash de grid antes da lista escolhida no primeiro carregamento (FR-008),
reaproveitando exatamente o mecanismo já existente para `sidebar-collapse`: o
`(authenticated)/layout.tsx` (server component) já lê `sidebar_collapsed` via `cookies()` e
passa `defaultCollapsed` ao `AuthenticatedShell`, que hidrata `useSidebarCollapseStore` uma
única vez (guardado por `useRef`). Esta task adiciona uma **segunda** leitura de cookie
(`gym-view`, criado na task-01) ao lado da já existente, produzindo `defaultGymView`, e uma
**segunda** chamada de hidratação (`useGymViewStore.getState().hydrate(defaultGymView)`)
dentro do **mesmo** guard de `useRef` já usado pelo sidebar — não introduz um segundo guard.

Os testes desta task estendem os dois arquivos de teste já existentes e já cobrindo o
mecanismo do sidebar: `apps/frontend/src/app/(authenticated)/layout.test.tsx` (mock de
`next/headers` + `AuthenticatedShell`) e
`apps/frontend/src/components/layout/authenticated-shell.test.tsx` (render real do shell).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/layout.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: server component assíncrono lendo `cookies()` uma única
  vez por request; não duplicar trabalho de leitura entre os dois cookies.
- `vercel-composition-patterns`: prop `defaultGymView` seguindo o mesmo formato de
  `defaultCollapsed` já estabelecido na composição `layout.tsx` → `AuthenticatedShell`.
- `zustand`: consumir `useGymViewStore.getState().hydrate(...)` no mesmo padrão imperativo
  já usado para `useSidebarCollapseStore`, sem assinar o componente a re-renders
  desnecessários nesse ponto.
- `typescript-advanced`: tipar `defaultGymView?: GymView` (union literal importada da
  task-01), sem `any`.
- `code-style`: manter a formatação (tabs, aspas duplas, sem ponto e vírgula) e a ordem de
  import já convencionada no arquivo.

## Passos

- **Step 1: Escrever os testes falhos do layout**

Em `apps/frontend/src/app/(authenticated)/layout.test.tsx`, o mock de
`AuthenticatedShell` precisa expor `defaultGymView` para que o teste consiga observá-lo.
Substituir o conteúdo do arquivo por:

```tsx
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"

const cookieGet = vi.fn()

vi.mock("next/headers", () => ({
	cookies: () => Promise.resolve({ get: cookieGet }),
}))

vi.mock("@/components/layout/authenticated-shell", () => ({
	AuthenticatedShell: ({
		defaultCollapsed,
		defaultGymView,
		children,
	}: {
		defaultCollapsed?: boolean
		defaultGymView?: "grid" | "list"
		children: ReactNode
	}) => (
		<div
			data-testid="shell"
			data-collapsed={String(defaultCollapsed)}
			data-gym-view={String(defaultGymView)}
		>
			{children}
		</div>
	),
}))

import { GYM_VIEW_COOKIE } from "@/lib/ui-state/gym-view-cookie"
import AuthenticatedLayout from "./layout"

describe("AuthenticatedLayout — cookie de recolhimento", () => {
	test("passa defaultCollapsed=true quando o cookie vale '1'", async () => {
		cookieGet.mockReturnValue({ value: "1" })
		const ui = await AuthenticatedLayout({ children: <p>x</p> })
		render(ui)
		expect(screen.getByTestId("shell")).toHaveAttribute(
			"data-collapsed",
			"true",
		)
	})

	test("passa defaultCollapsed=false quando o cookie está ausente", async () => {
		cookieGet.mockReturnValue(undefined)
		const ui = await AuthenticatedLayout({ children: <p>x</p> })
		render(ui)
		expect(screen.getByTestId("shell")).toHaveAttribute(
			"data-collapsed",
			"false",
		)
	})
})

describe("AuthenticatedLayout — cookie de visualização de academias (FR-007, FR-008)", () => {
	test("passa defaultGymView='list' quando o cookie gym-view vale 'list'", async () => {
		cookieGet.mockImplementation((name: string) =>
			name === GYM_VIEW_COOKIE ? { value: "list" } : undefined,
		)
		const ui = await AuthenticatedLayout({ children: <p>x</p> })
		render(ui)
		expect(screen.getByTestId("shell")).toHaveAttribute(
			"data-gym-view",
			"list",
		)
	})

	test("passa defaultGymView='grid' quando o cookie gym-view está ausente", async () => {
		cookieGet.mockReturnValue(undefined)
		const ui = await AuthenticatedLayout({ children: <p>x</p> })
		render(ui)
		expect(screen.getByTestId("shell")).toHaveAttribute(
			"data-gym-view",
			"grid",
		)
	})
})
```

- **Step 2: Rodar os testes e ver falhar**

Run: `pnpm --filter frontend test -- --run "src/app/(authenticated)/layout.test.tsx"`
Expected: FAIL — as duas novas asserções recebem `data-gym-view="undefined"` (o layout
ainda não lê o cookie `gym-view` nem passa `defaultGymView`).

- **Step 3: Implementar a segunda leitura de cookie no layout**

Substituir o conteúdo de `apps/frontend/src/app/(authenticated)/layout.tsx` por:

```tsx
import { cookies } from "next/headers"
import type { ReactNode } from "react"
import { AuthenticatedShell } from "@/components/layout/authenticated-shell"
import {
	GYM_VIEW_COOKIE,
	parseGymViewCookie,
} from "@/lib/ui-state/gym-view-cookie"
import {
	parseSidebarCollapseCookie,
	SIDEBAR_COLLAPSE_COOKIE,
} from "@/lib/ui-state/sidebar-collapse-cookie"

export default async function AuthenticatedLayout({
	children,
}: {
	children: ReactNode
}) {
	const cookieStore = await cookies()
	const defaultCollapsed = parseSidebarCollapseCookie(
		cookieStore.get(SIDEBAR_COLLAPSE_COOKIE)?.value,
	)
	const defaultGymView = parseGymViewCookie(
		cookieStore.get(GYM_VIEW_COOKIE)?.value,
	)
	return (
		<AuthenticatedShell
			defaultCollapsed={defaultCollapsed}
			defaultGymView={defaultGymView}
		>
			{children}
		</AuthenticatedShell>
	)
}
```

- **Step 4: Rodar os testes e ver passar**

Run: `pnpm --filter frontend test -- --run "src/app/(authenticated)/layout.test.tsx"`
Expected: PASS (4 testes).

- **Step 5: Escrever os testes falhos do shell**

Em `apps/frontend/src/components/layout/authenticated-shell.test.tsx`, ajustar os
imports do topo (acrescentar o import do novo store) e os resets de estado entre testes:

```ts
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"
```

Atualizar os blocos de reset existentes para também resetar `useGymViewStore`:

```ts
afterEach(() => {
	useAuthStore.getState().clear()
	useSidebarCollapseStore.setState({ collapsed: false })
	useGymViewStore.setState({ view: "grid" })
})
beforeEach(() => {
	useSidebarCollapseStore.setState({ collapsed: false })
	useGymViewStore.setState({ view: "grid" })
})
```

Acrescentar o bloco de testes ao final do arquivo:

```tsx
describe("AuthenticatedShell — hidratação de gym-view (FR-008)", () => {
	test("hidrata useGymViewStore com defaultGymView='list' sem gravar cookie", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell defaultGymView="list">
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(useGymViewStore.getState().view).toBe("list")
	})

	test("hidrata useGymViewStore com defaultGymView='grid' quando omitido", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		expect(useGymViewStore.getState().view).toBe("grid")
	})
})
```

- **Step 6: Rodar os testes e ver falhar**

Run: `pnpm --filter frontend test -- --run src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL — `useGymViewStore.getState().view` permanece `"grid"` mesmo com
`defaultGymView="list"` (o shell ainda não aceita/hidrata essa prop).

- **Step 7: Implementar a segunda hidratação no shell**

Em `apps/frontend/src/components/layout/authenticated-shell.tsx`, acrescentar o import do
tipo e do store (junto aos imports já existentes de `@/lib/ui-state/sidebar-collapse-store`):

```ts
import type { GymView } from "@/lib/ui-state/gym-view-cookie"
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"
```

Estender a interface de props:

```ts
export interface AuthenticatedShellProps {
	children: ReactNode
	className?: string
	defaultCollapsed?: boolean
	defaultGymView?: GymView
}
```

Aceitar o novo parâmetro (com default `"grid"`, mesmo padrão de `defaultCollapsed = false`)
e adicionar a segunda hidratação **dentro do mesmo guard `hydratedRef`** já existente:

```ts
export function AuthenticatedShell({
	children,
	className,
	defaultCollapsed = false,
	defaultGymView = "grid",
}: AuthenticatedShellProps) {
	// ... (user, router, pathname, logout, meData, isAdmin, displayName,
	//      isCommandPaletteOpen inalterados)

	const hydratedRef = useRef(false)
	if (!hydratedRef.current) {
		useSidebarCollapseStore.getState().hydrate(defaultCollapsed)
		useGymViewStore.getState().hydrate(defaultGymView)
		hydratedRef.current = true
	}
	const collapsed = useSidebarCollapseStore((state) => state.collapsed)
	const toggleCollapsed = useSidebarCollapseStore((state) => state.toggle)

	// ... (restante do componente inalterado)
}
```

Nenhuma outra parte do componente (JSX, handlers de teclado, navegação) muda.

- **Step 8: Rodar os testes e ver passar**

Run: `pnpm --filter frontend test -- --run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS (testes existentes + 2 novos).

- **Step 9: Suíte completa + lint + tipos + build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test -- --run && pnpm --filter frontend build`
Expected: zero problemas Biome; tsc sem erros; todos os testes passam; build conclui.

- **Step 10: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/layout.tsx" "apps/frontend/src/app/(authenticated)/layout.test.tsx" apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(gyms): hidrata preferência de visualização no shell sem flash (FR-008)"
```

## Critérios de Sucesso

- [ ] O layout lê `gym-view` no servidor (ao lado de `sidebar_collapsed`) e passa
      `defaultGymView` ao shell (FR-007, suporte a FR-008).
- [ ] O shell hidrata `useGymViewStore` com `defaultGymView` **dentro do mesmo guard**
      `hydratedRef` já usado para `sidebar-collapse` — nunca hidrata duas vezes, nunca
      grava o cookie na hidratação.
- [ ] HTML inicial já reflete a preferência de visualização persistida → sem flash de grid
      antes da lista escolhida no primeiro carregamento (FR-008).
- [ ] `lint:fix`, `tsc:check`, `test` e `build` passam 100%.
