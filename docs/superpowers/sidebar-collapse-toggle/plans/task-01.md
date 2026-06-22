# Task 1: Cookie client-safe + store Zustand de recolhimento [FR-005, FR-007]

**Status:** DONE
**PRD:** `../prd/prd-sidebar-collapse-toggle.md`
**Spec:** `../specs/sidebar-collapse-toggle-design.md`
**Depends on:** N/A

## Visão Geral

Criar a fonte de verdade do estado de recolhimento no client e a persistência em cookie. São dois módulos:

- `sidebar-collapse-cookie.ts` — **client-safe** (sem `next/headers`): expõe o nome do cookie, a escrita via `document.cookie` (guardada para SSR) e o parse do valor bruto. É importável tanto pelo store (client) quanto pelo layout (server), porque o `document` só é tocado dentro de função guardada, nunca no load do módulo.
- `sidebar-collapse-store.ts` — store Zustand com `collapsed`, `toggle`, `setCollapsed` e `hydrate` (este último seedeia o estado vindo do servidor **sem** reescrever o cookie).

Espelha o padrão de `src/lib/auth/auth-store.ts` (helper `writeSessionFlag` com o `biome-ignore noDocumentCookie` e guard `typeof document === "undefined"`).

## Arquivos

- Create: `apps/frontend/src/lib/ui-state/sidebar-collapse-cookie.ts`
- Create: `apps/frontend/src/lib/ui-state/sidebar-collapse-cookie.test.ts`
- Create: `apps/frontend/src/lib/ui-state/sidebar-collapse-store.ts`
- Create: `apps/frontend/src/lib/ui-state/sidebar-collapse-store.test.ts`

### Conformidade com as Skills Padrão

- `zustand`: o store é Zustand; aplicar boas práticas de criação de store, seletores e ações.
- `typescript-advanced`: tipar `SidebarCollapseState` e as ações de forma precisa, sem `any`.
- `test-antipatterns`: testar comportamento real (estado/cookie), sem mockar o que está sob teste.

## Passos

- **Step 1: Escrever o teste falho do cookie**

Criar `apps/frontend/src/lib/ui-state/sidebar-collapse-cookie.test.ts`:

```ts
import { afterEach, describe, expect, test } from "vitest"
import {
	parseSidebarCollapseCookie,
	SIDEBAR_COLLAPSE_COOKIE,
	writeSidebarCollapseCookie,
} from "./sidebar-collapse-cookie"

function clearCookie(): void {
	document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=; path=/; max-age=0`
}

afterEach(clearCookie)

describe("sidebar-collapse-cookie", () => {
	test("interpreta valor ausente como expandido (false)", () => {
		expect(parseSidebarCollapseCookie(undefined)).toBe(false)
	})

	test('interpreta "0" como expandido e "1" como recolhido', () => {
		expect(parseSidebarCollapseCookie("0")).toBe(false)
		expect(parseSidebarCollapseCookie("1")).toBe(true)
	})

	test("escreve o cookie de recolhimento com o valor 1", () => {
		writeSidebarCollapseCookie(true)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=1`)
	})

	test("escreve o cookie de recolhimento com o valor 0", () => {
		writeSidebarCollapseCookie(false)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=0`)
	})
})
```

- **Step 2: Rodar o teste e ver falhar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/sidebar-collapse-cookie.test.ts`
Expected: FAIL — `Cannot find module './sidebar-collapse-cookie'`.

- **Step 3: Implementar o módulo de cookie**

Criar `apps/frontend/src/lib/ui-state/sidebar-collapse-cookie.ts`:

```ts
export const SIDEBAR_COLLAPSE_COOKIE = "sidebar_collapsed"

/**
 * Grava a preferência de recolhimento da sidebar num cookie de 1 ano.
 * Client-side only — no-op durante SSR (sem `document`).
 */
export function writeSidebarCollapseCookie(collapsed: boolean): void {
	if (typeof document === "undefined") return
	// biome-ignore lint/suspicious/noDocumentCookie: cookieStore não está disponível no Firefox e Safari <17; document.cookie é o fallback compatível
	document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; SameSite=Lax`
}

/** Interpreta o valor bruto do cookie. Ausente/inválido => expandido (false). */
export function parseSidebarCollapseCookie(value: string | undefined): boolean {
	return value === "1"
}
```

- **Step 4: Rodar o teste e ver passar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/sidebar-collapse-cookie.test.ts`
Expected: PASS (4 testes).

- **Step 5: Escrever o teste falho do store**

Criar `apps/frontend/src/lib/ui-state/sidebar-collapse-store.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { SIDEBAR_COLLAPSE_COOKIE } from "./sidebar-collapse-cookie"
import { useSidebarCollapseStore } from "./sidebar-collapse-store"

function clearCookie(): void {
	document.cookie = `${SIDEBAR_COLLAPSE_COOKIE}=; path=/; max-age=0`
}

beforeEach(() => {
	useSidebarCollapseStore.setState({ collapsed: false })
	clearCookie()
})

afterEach(clearCookie)

describe("useSidebarCollapseStore", () => {
	test("inicia expandido (collapsed=false)", () => {
		expect(useSidebarCollapseStore.getState().collapsed).toBe(false)
	})

	test("toggle inverte o estado e grava o cookie", () => {
		useSidebarCollapseStore.getState().toggle()
		expect(useSidebarCollapseStore.getState().collapsed).toBe(true)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=1`)
	})

	test("setCollapsed define o estado e grava o cookie", () => {
		useSidebarCollapseStore.getState().setCollapsed(true)
		expect(useSidebarCollapseStore.getState().collapsed).toBe(true)
		expect(document.cookie).toContain(`${SIDEBAR_COLLAPSE_COOKIE}=1`)
	})

	test("hydrate seedeia o estado SEM gravar cookie", () => {
		useSidebarCollapseStore.getState().hydrate(true)
		expect(useSidebarCollapseStore.getState().collapsed).toBe(true)
		expect(document.cookie).not.toContain(SIDEBAR_COLLAPSE_COOKIE)
	})
})
```

- **Step 6: Rodar o teste e ver falhar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/sidebar-collapse-store.test.ts`
Expected: FAIL — `Cannot find module './sidebar-collapse-store'`.

- **Step 7: Implementar o store**

Criar `apps/frontend/src/lib/ui-state/sidebar-collapse-store.ts`:

```ts
import { create } from "zustand"
import { writeSidebarCollapseCookie } from "@/lib/ui-state/sidebar-collapse-cookie"

export interface SidebarCollapseState {
	collapsed: boolean
	toggle: () => void
	setCollapsed: (collapsed: boolean) => void
	/** Seedeia o estado vindo do servidor sem reescrever o cookie. */
	hydrate: (collapsed: boolean) => void
}

export const useSidebarCollapseStore = create<SidebarCollapseState>((set) => ({
	collapsed: false,
	toggle: () =>
		set((state) => {
			const next = !state.collapsed
			writeSidebarCollapseCookie(next)
			return { collapsed: next }
		}),
	setCollapsed: (collapsed: boolean) => {
		writeSidebarCollapseCookie(collapsed)
		set({ collapsed })
	},
	hydrate: (collapsed: boolean) => set({ collapsed }),
}))
```

- **Step 8: Rodar o teste e ver passar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/sidebar-collapse-store.test.ts`
Expected: PASS (4 testes).

- **Step 9: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; tsc sem erros.

- **Step 10: Commit**

```bash
git add apps/frontend/src/lib/ui-state/
git commit -m "feat(sidebar): cookie client-safe + store de recolhimento"
```

## Critérios de Sucesso

- [ ] `parseSidebarCollapseCookie` retorna `false` para ausente/`"0"` e `true` para `"1"` (FR-007).
- [ ] `writeSidebarCollapseCookie` grava `sidebar_collapsed=1|0` (FR-005).
- [ ] Store: `toggle`/`setCollapsed` atualizam estado e gravam cookie; `hydrate` atualiza sem gravar.
- [ ] `lint:fix` e `tsc:check` passam 100%.
