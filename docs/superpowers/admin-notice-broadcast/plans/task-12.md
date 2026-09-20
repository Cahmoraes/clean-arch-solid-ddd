# Task 12: Acesso restrito da página Novo aviso [FR-015]

**Status:** DONE
**Verified:** `pnpm --filter frontend exec vitest run src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** task-10

## Visão Geral

Superfície crítica (o formulário dispara um aviso irreversível para todos os usuários), por isso tem task própria: teste que monta `AdminLayout` (`src/app/(authenticated)/admin/layout.tsx`, que aplica `AdminGuard`) com a página `avisos/novo` como filho e prova que `MEMBER` não vê o formulário e é redirecionado para `/`, que `ADMIN` vê, e que no boot (sem usuário) nada do formulário aparece. O guard já vem do layout; nenhum código de produção muda, a menos que algum teste falhe sem manipulação. Para provar que o teste detecta regressão, inclui uma verificação de sensibilidade que remove temporariamente o guard.

## Arquivos

- Test: `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx`
- Modify (apenas se algum teste falhar sem manipulação): `apps/frontend/src/app/(authenticated)/admin/layout.tsx`

### Conformidade com as Skills Padrão

- `test-antipatterns`: monta o layout real e a página real; só `next/navigation` é mockado (borda do framework) para observar o redirecionamento, no mesmo formato do teste de `AdminGuard`.
- `no-workarounds`: se o acesso vazar, corrige-se o `AdminGuard`/layout na raiz; nada de checagem de papel duplicada dentro da página.
- `vercel-react-best-practices`: teste renderiza a composição real (layout + página), sem tocar em estado interno de componentes.

## Passos

- **Step 1: Write the test**

```tsx
// apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const replace = vi.fn()
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/admin/avisos/novo",
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { renderWithProviders } from "@/test/render"
import AdminLayout from "../../layout"
import AdminNovoAvisoPage from "./page"

const FORM_NAME = "Formulário de novo aviso"

function setUser(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

function renderPageUnderAdminLayout() {
	return renderWithProviders(
		<AdminLayout>
			<AdminNovoAvisoPage />
		</AdminLayout>,
	)
}

describe("Acesso à página Novo aviso", () => {
	beforeEach(() => {
		replace.mockClear()
		useAuthStore.getState().clear()
	})

	test("ADMIN vê o formulário e não é redirecionado", () => {
		setUser("ADMIN")

		renderPageUnderAdminLayout()

		expect(screen.getByRole("form", { name: FORM_NAME })).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { level: 1, name: "Novo aviso" }),
		).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})

	test("MEMBER não vê o formulário e é redirecionado para /", () => {
		setUser("MEMBER")

		renderPageUnderAdminLayout()

		expect(
			screen.queryByRole("form", { name: FORM_NAME }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("heading", { name: "Novo aviso" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Enviar aviso" }),
		).not.toBeInTheDocument()
		expect(replace).toHaveBeenCalledWith("/")
	})

	test("sem usuário carregado (boot) o formulário não aparece", () => {
		renderPageUnderAdminLayout()

		expect(screen.getByTestId("admin-guard-loading")).toBeInTheDocument()
		expect(
			screen.queryByRole("form", { name: FORM_NAME }),
		).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it passes (caracterização)**

Run: `cd apps/frontend && pnpm vitest run "src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx"`
Expected: PASS (3 testes), pois `AdminLayout` já envolve os filhos em `AdminGuard redirectTo="/"`. Se falhar, corrigir o guard/layout na raiz e repetir.

- **Step 3: Provar a sensibilidade do teste (mutação temporária)**

Em `apps/frontend/src/app/(authenticated)/admin/layout.tsx`, trocar temporariamente o retorno por `return <>{children}</>` (sem o `AdminGuard`) e rodar:

Run: `cd apps/frontend && pnpm vitest run "src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx"`
Expected: FAIL - `MEMBER não vê o formulário e é redirecionado para /` (o formulário aparece e `replace` não é chamado) e `sem usuário carregado (boot)` (não há `admin-guard-loading`). Reverter a alteração de `layout.tsx`.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run "src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx"`
Expected: PASS (3 testes) e `git diff "apps/frontend/src/app/(authenticated)/admin/layout.tsx"` vazio.

- **Step 5: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add "apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.access.test.tsx"
git commit -m "test(notices): cobre acesso restrito a admin na pagina Novo aviso"
```

## Critérios de Sucesso

- `ADMIN` vê o formulário de novo aviso; `MEMBER` não o vê e é redirecionado para `/` (FR-015).
- Sem usuário carregado, o formulário não é renderizado (placeholder do guard).
- Remover o `AdminGuard` do layout faz o teste falhar (sensibilidade comprovada no passo 3).
