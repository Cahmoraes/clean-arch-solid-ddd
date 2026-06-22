# Task 3: Leitura do cookie no layout server (sem flicker) [FR-005, FR-006, FR-007]

**Status:** DONE
**PRD:** `../prd/prd-sidebar-collapse-toggle.md`
**Spec:** `../specs/sidebar-collapse-toggle-design.md`
**Depends on:** task-01, task-02

## Visão Geral

Fazer o `(authenticated)/layout.tsx` (server component) ler o cookie de recolhimento via `next/headers` e injetar `defaultCollapsed` no `AuthenticatedShell`. Isso garante que o HTML inicial já venha na largura correta — eliminando o flicker no reload (FR-006). No Next.js 16 `cookies()` é assíncrono, então o layout vira `async`.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/layout.tsx`
- Create: `apps/frontend/src/app/(authenticated)/layout.test.tsx`

### Conformidade com as Skills Padrão

- `react`: server component assíncrono retornando JSX.
- `typescript-advanced`: tipar o retorno e o acesso ao cookie sem `any`.
- `tanstack-query-best-practices`: não se aplica diretamente, mas confirmar que a leitura do cookie não interfere no bootstrap de sessão do `providers.tsx`.
- `test-antipatterns`: mockar apenas as fronteiras (`next/headers`, shell), testar o contrato observável (prop passada).

## Passos

- **Step 1: Escrever o teste falho do layout**

Criar `apps/frontend/src/app/(authenticated)/layout.test.tsx`:

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
		children,
	}: {
		defaultCollapsed?: boolean
		children: ReactNode
	}) => (
		<div data-testid="shell" data-collapsed={String(defaultCollapsed)}>
			{children}
		</div>
	),
}))

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
```

- **Step 2: Rodar o teste e ver falhar**

Run: `pnpm --filter frontend test -- --run "src/app/(authenticated)/layout.test.tsx"`
Expected: FAIL — o layout não é `async` e não lê o cookie (`data-collapsed` indefinido/`"undefined"`).

- **Step 3: Implementar a leitura do cookie no layout**

Substituir o conteúdo de `apps/frontend/src/app/(authenticated)/layout.tsx` por:

```tsx
import { cookies } from "next/headers"
import type { ReactNode } from "react"
import { AuthenticatedShell } from "@/components/layout/authenticated-shell"
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
	return (
		<AuthenticatedShell defaultCollapsed={defaultCollapsed}>
			{children}
		</AuthenticatedShell>
	)
}
```

- **Step 4: Rodar o teste e ver passar**

Run: `pnpm --filter frontend test -- --run "src/app/(authenticated)/layout.test.tsx"`
Expected: PASS (2 testes).

- **Step 5: Suíte completa + lint + tipos + build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test -- --run && pnpm --filter frontend build`
Expected: zero problemas Biome; tsc sem erros; todos os testes passam; build conclui.

- **Step 6: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/layout.tsx" "apps/frontend/src/app/(authenticated)/layout.test.tsx"
git commit -m "feat(sidebar): lê cookie de recolhimento no layout server (sem flicker)"
```

## Critérios de Sucesso

- [ ] O layout lê `sidebar_collapsed` no servidor e passa `defaultCollapsed` ao shell (FR-005, FR-007).
- [ ] HTML inicial já reflete o estado persistido → sem flicker no reload (FR-006).
- [ ] `lint:fix`, `tsc:check`, `test` e `build` passam 100%.
