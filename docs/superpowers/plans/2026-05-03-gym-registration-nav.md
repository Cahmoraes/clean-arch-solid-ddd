# Gym Registration Nav — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cadastrar Academia" button on the `/academias` page, visible only to ADMIN users, linking to the existing `/admin/academias/nova` form.

**Architecture:** Conditional rendering based on `useAuthStore` role check. Button uses `asChild` + Next.js `Link` for client-side navigation. Single production file change + new test file.

**Tech Stack:** React 19, Next.js 16, Zustand, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Write failing tests for conditional button rendering

**Files:**
- Create: `apps/frontend/src/app/(authenticated)/academias/page.test.tsx`

- [ ] **Step 1: Create the test file with both test cases**

```tsx
import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { renderWithProviders } from "@/test/render"
import AcademiasPage from "./page"

function setUser(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

describe("AcademiasPage", () => {
	beforeEach(() => {
		useAuthStore.getState().clear()
	})

	it("exibe botão 'Cadastrar Academia' para usuário ADMIN", () => {
		setUser("ADMIN")
		renderWithProviders(<AcademiasPage />)
		const link = screen.getByTestId("gym-create-link")
		expect(link).toBeInTheDocument()
		expect(link).toHaveAttribute("href", "/admin/academias/nova")
	})

	it("não exibe botão 'Cadastrar Academia' para usuário MEMBER", () => {
		setUser("MEMBER")
		renderWithProviders(<AcademiasPage />)
		expect(screen.queryByTestId("gym-create-link")).not.toBeInTheDocument()
	})

	it("não exibe botão quando usuário não está autenticado", () => {
		renderWithProviders(<AcademiasPage />)
		expect(screen.queryByTestId("gym-create-link")).not.toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter frontend test -- -t "AcademiasPage"`
Expected: FAIL — `gym-create-link` not found (button doesn't exist yet)

---

### Task 2: Implement the conditional button

**Files:**
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`

- [ ] **Step 3: Add imports for Link, Plus icon, and useAuthStore**

Add these imports at the top of the file:

```tsx
import { Plus, Search } from "lucide-react"
import Link from "next/link"
```

And add the auth store import:

```tsx
import { useAuthStore } from "@/lib/auth/auth-store"
```

- [ ] **Step 4: Read user from auth store inside the component**

Add this line at the beginning of `AcademiasPage`, after the existing state declarations:

```tsx
const user = useAuthStore((state) => state.user)
```

- [ ] **Step 5: Transform the header to flex row with conditional button**

Replace the existing `<header>` block with:

```tsx
<header className="flex items-start justify-between gap-4">
	<div className="flex flex-col gap-2">
		<h1
			id="academias-title"
			className="font-display text-3xl font-medium text-pure-black"
		>
			Academias
		</h1>
		<p className="text-sm text-mid-gray">
			Busque por nome para encontrar uma academia próxima.
		</p>
	</div>
	{user?.role === "ADMIN" ? (
		<Button asChild variant="primary" size="sm">
			<Link href="/admin/academias/nova" data-testid="gym-create-link">
				<Plus aria-hidden className="h-4 w-4" />
				Cadastrar
			</Link>
		</Button>
	) : null}
</header>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter frontend test -- -t "AcademiasPage"`
Expected: PASS — all 3 tests green

- [ ] **Step 7: Run full frontend validation gate**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test`
Expected: All pass with zero issues

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/academias/page.tsx apps/frontend/src/app/\(authenticated\)/academias/page.test.tsx
git commit -m "feat(frontend): add gym registration button for admins on academias page

Show a 'Cadastrar' button in the /academias page header, visible only
to ADMIN users. Links to the existing /admin/academias/nova form.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
