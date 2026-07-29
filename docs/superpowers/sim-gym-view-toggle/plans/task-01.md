# Task 1: Persistência da preferência de visualização (cookie + store) [FR-005, FR-006, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-sim-gym-view-toggle.md`
**Spec:** `../specs/sim-gym-view-toggle-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Criar a fonte de verdade da preferência de visualização (`grid`|`list`) de `/academias`,
espelhando 1:1 o par já existente e testado `sidebar-collapse-cookie.ts` /
`sidebar-collapse-store.ts`. São dois módulos:

- `gym-view-cookie.ts` — **client-safe** (sem `next/headers`): expõe o nome do cookie
  (`gym-view`), o tipo `GymView`, a escrita via `document.cookie` (guardada para SSR — no-op
  quando `document` não existe) e o parse do valor bruto (ausente/inválido => `"grid"`,
  FR-007). É importável tanto pelo store (client) quanto por um layout server no futuro,
  porque `document` só é tocado dentro de função guardada, nunca no load do módulo.
- `gym-view-store.ts` — store Zustand com `view`, `setView` (atualiza o estado E grava o
  cookie na mesma ação — FR-005, FR-006) e `hydrate` (seedeia o estado vindo do servidor
  **sem** reescrever o cookie).

Nenhum destes módulos introduz UI ou depende de outra task.

## Arquivos

- Create: `apps/frontend/src/lib/ui-state/gym-view-cookie.ts`
- Create: `apps/frontend/src/lib/ui-state/gym-view-store.ts`
- Test: `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts`
- Test: `apps/frontend/src/lib/ui-state/gym-view-store.test.ts`

### Conformidade com as Skills Padrão

- `zustand`: o store é Zustand; aplicar boas práticas de criação de store, seletores e
  ações (sem `toggle`, já que o domínio tem duas opções explícitas em vez de um booleano).
- `typescript-advanced`: tipar `GymView` como union literal (`"grid" | "list"`) e
  `GymViewState`/suas ações de forma precisa, sem `any`.
- `code-style`: seguir exatamente a convenção já usada em `sidebar-collapse-cookie.ts`
  (guard `typeof document === "undefined"`, `biome-ignore lint/suspicious/noDocumentCookie`
  com a mesma justificativa, tabs, aspas duplas, sem ponto e vírgula).
- `test-antipatterns`: testar comportamento real (estado do store + `document.cookie`), sem
  mockar o que está sob teste.

## Passos

- **Step 1: Escrever o teste falho do cookie**

Criar `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts`:

```ts
import { afterEach, describe, expect, test } from "vitest"
import {
	GYM_VIEW_COOKIE,
	parseGymViewCookie,
	writeGymViewCookie,
} from "./gym-view-cookie"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: helper de limpeza de cookie em testes
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; max-age=0`
}

afterEach(clearCookie)

describe("gym-view-cookie", () => {
	test("interpreta valor ausente como grid (default, FR-007)", () => {
		expect(parseGymViewCookie(undefined)).toBe("grid")
	})

	test('interpreta "list" como list e qualquer outro valor como grid', () => {
		expect(parseGymViewCookie("list")).toBe("list")
		expect(parseGymViewCookie("grid")).toBe("grid")
		expect(parseGymViewCookie("invalido")).toBe("grid")
	})

	test("escreve o cookie de visualização com o valor grid", () => {
		writeGymViewCookie("grid")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=grid`)
	})

	test("escreve o cookie de visualização com o valor list", () => {
		writeGymViewCookie("list")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=list`)
	})
})
```

- **Step 2: Rodar o teste e ver falhar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/gym-view-cookie.test.ts`
Expected: FAIL — `Cannot find module './gym-view-cookie'`.

- **Step 3: Implementar o módulo de cookie**

Criar `apps/frontend/src/lib/ui-state/gym-view-cookie.ts`:

```ts
export const GYM_VIEW_COOKIE = "gym-view"

export type GymView = "grid" | "list"

/**
 * Grava a preferência de visualização de academias num cookie de 1 ano.
 * Client-side only — no-op durante SSR (sem `document`).
 */
export function writeGymViewCookie(view: GymView): void {
	if (typeof document === "undefined") return
	// biome-ignore lint/suspicious/noDocumentCookie: cookieStore não está disponível no Firefox e Safari <17; document.cookie é o fallback compatível
	document.cookie = `${GYM_VIEW_COOKIE}=${view}; path=/; max-age=31536000; SameSite=Lax`
}

/** Interpreta o valor bruto do cookie. Ausente/inválido => grid (FR-007). */
export function parseGymViewCookie(value: string | undefined): GymView {
	return value === "list" ? "list" : "grid"
}
```

- **Step 4: Rodar o teste e ver passar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/gym-view-cookie.test.ts`
Expected: PASS (4 testes).

- **Step 5: Escrever o teste falho do store**

Criar `apps/frontend/src/lib/ui-state/gym-view-store.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { GYM_VIEW_COOKIE } from "./gym-view-cookie"
import { useGymViewStore } from "./gym-view-store"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: happy-dom não deleta cookie com max-age=0; usar expires no passado
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

beforeEach(() => {
	useGymViewStore.setState({ view: "grid" })
	clearCookie()
})

afterEach(clearCookie)

describe("useGymViewStore", () => {
	test("inicia em grid (view=grid, FR-007)", () => {
		expect(useGymViewStore.getState().view).toBe("grid")
	})

	test("setView atualiza o estado e grava o cookie (FR-005, FR-006)", () => {
		useGymViewStore.getState().setView("list")
		expect(useGymViewStore.getState().view).toBe("list")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=list`)
	})

	test("setView de volta para grid atualiza o estado e o cookie", () => {
		useGymViewStore.getState().setView("list")
		useGymViewStore.getState().setView("grid")
		expect(useGymViewStore.getState().view).toBe("grid")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=grid`)
	})

	test("hydrate seedeia o estado SEM gravar cookie", () => {
		useGymViewStore.getState().hydrate("list")
		expect(useGymViewStore.getState().view).toBe("list")
		expect(document.cookie).not.toContain(GYM_VIEW_COOKIE)
	})
})
```

- **Step 6: Rodar o teste e ver falhar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/gym-view-store.test.ts`
Expected: FAIL — `Cannot find module './gym-view-store'`.

- **Step 7: Implementar o store**

Criar `apps/frontend/src/lib/ui-state/gym-view-store.ts`:

```ts
import { create } from "zustand"
import { writeGymViewCookie } from "@/lib/ui-state/gym-view-cookie"
import type { GymView } from "@/lib/ui-state/gym-view-cookie"

export interface GymViewState {
	view: GymView
	setView: (view: GymView) => void
	/** Seedeia o estado vindo do servidor sem reescrever o cookie. */
	hydrate: (view: GymView) => void
}

export const useGymViewStore = create<GymViewState>((set) => ({
	view: "grid",
	setView: (view: GymView) => {
		writeGymViewCookie(view)
		set({ view })
	},
	hydrate: (view: GymView) => set({ view }),
}))
```

- **Step 8: Rodar o teste e ver passar**

Run: `pnpm --filter frontend test -- --run src/lib/ui-state/gym-view-store.test.ts`
Expected: PASS (4 testes).

- **Step 9: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; tsc sem erros.

- **Step 10: Commit**

```bash
git add apps/frontend/src/lib/ui-state/
git commit -m "feat(gyms): cookie + store de preferência de visualização (grid/lista)"
```

## Critérios de Sucesso

- [ ] `parseGymViewCookie` retorna `"grid"` para ausente/inválido e `"list"` para `"list"`
      (FR-007).
- [ ] `writeGymViewCookie` grava `gym-view=grid|list` com `max-age=31536000` (1 ano —
      suporta FR-005/FR-006).
- [ ] Store: `setView` atualiza o estado e grava o cookie na mesma ação; `hydrate` atualiza
      o estado sem gravar cookie.
- [ ] `lint:fix` e `tsc:check` passam 100%.
