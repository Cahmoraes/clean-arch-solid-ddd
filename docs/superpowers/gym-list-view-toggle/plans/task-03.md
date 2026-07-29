# Task 3: Criar `GymViewStore` (Zustand)

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Cria o store Zustand `useGymViewStore`, replicando a API/shape de `useSidebarCollapseStore` (`sidebar-collapse-store.ts`), mas com `view: "cards" | "rows"` em vez de `collapsed: boolean`. `toggle()` e `setView()` persistem a escolha via `writeGymViewCookie` (task 2) como efeito colateral, além de atualizar o estado em memória. Diferente do store de sidebar (cujo guard de "aplicar uma única vez" vive no `useRef` do componente consumidor), a spec exige aqui que `hydrate` só tenha efeito na primeira chamada — o próprio store mantém uma flag interna `hydrated` para ignorar chamadas subsequentes, protegendo contra uma segunda leitura do cookie sobrescrever uma interação do usuário já em curso.

## Arquivos

- Create: `apps/frontend/src/lib/ui-state/gym-view-store.ts`
- Create (test): `apps/frontend/src/lib/ui-state/gym-view-store.test.ts`

### Conformidade com as Skills Padrão

- `zustand`: modelagem do store com `create<T>()`, uso de `get()`/`set()` no shape do padrão já usado por `sidebar-collapse-store.ts`.
- `typescript-advanced`: interface `GymViewState` com union type `GymView` importado de `gym-view-cookie.ts` (não redeclarar o tipo).
- `code-style`: seguir a mesma convenção de `sidebar-collapse-store.ts` (nome do hook `use*Store`, ordem dos campos, comentário JSDoc em `hydrate`).
- `test-antipatterns`: testar exatamente os 3 comportamentos da spec (toggle alterna, setView define, hydrate só aplica uma vez) sem espionar `document.cookie` além do necessário.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/frontend/src/lib/ui-state/gym-view-store.test.ts
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { GYM_VIEW_COOKIE } from "./gym-view-cookie"
import { useGymViewStore } from "./gym-view-store"

function clearCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: happy-dom não deleta cookie com max-age=0; usar expires no passado
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

beforeEach(() => {
	useGymViewStore.setState({ view: "cards", hydrated: false })
	clearCookie()
})

afterEach(clearCookie)

describe("useGymViewStore", () => {
	test("inicia com view cards", () => {
		expect(useGymViewStore.getState().view).toBe("cards")
	})

	test("toggle alterna entre cards e rows e grava o cookie", () => {
		useGymViewStore.getState().toggle()
		expect(useGymViewStore.getState().view).toBe("rows")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=rows`)

		useGymViewStore.getState().toggle()
		expect(useGymViewStore.getState().view).toBe("cards")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=cards`)
	})

	test("setView define explicitamente a view e grava o cookie", () => {
		useGymViewStore.getState().setView("rows")
		expect(useGymViewStore.getState().view).toBe("rows")
		expect(document.cookie).toContain(`${GYM_VIEW_COOKIE}=rows`)
	})

	test("hydrate só aplica na primeira chamada", () => {
		useGymViewStore.getState().hydrate("rows")
		expect(useGymViewStore.getState().view).toBe("rows")

		useGymViewStore.getState().hydrate("cards")
		expect(useGymViewStore.getState().view).toBe("rows")
	})

	test("hydrate não grava cookie", () => {
		useGymViewStore.getState().hydrate("rows")
		expect(document.cookie).not.toContain(GYM_VIEW_COOKIE)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test gym-view-store.test.ts`
Expected: FAIL with `Failed to resolve import "./gym-view-store"` (o módulo ainda não existe)

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/lib/ui-state/gym-view-store.ts
import { create } from "zustand"
import { type GymView, writeGymViewCookie } from "@/lib/ui-state/gym-view-cookie"

export interface GymViewState {
	view: GymView
	/** Flag interna: garante que hydrate só aplica na primeira chamada. */
	hydrated: boolean
	toggle: () => void
	setView: (view: GymView) => void
	/** Seedeia o estado vindo do cookie sem reescrevê-lo; ignora chamadas após a primeira. */
	hydrate: (view: GymView) => void
}

export const useGymViewStore = create<GymViewState>((set, get) => ({
	view: "cards",
	hydrated: false,
	toggle: () => {
		const next = get().view === "cards" ? "rows" : "cards"
		writeGymViewCookie(next)
		set({ view: next })
	},
	setView: (view: GymView) => {
		writeGymViewCookie(view)
		set({ view })
	},
	hydrate: (view: GymView) => {
		if (get().hydrated) return
		set({ view, hydrated: true })
	},
}))
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test gym-view-store.test.ts`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/frontend/src/lib/ui-state/gym-view-store.ts apps/frontend/src/lib/ui-state/gym-view-store.test.ts
git commit -m "feat: adiciona GymViewStore (Zustand) para alternar entre visualização cards/rows"
```

## Critérios de Sucesso

- `useGymViewStore` expõe `view: "cards" | "rows"`, `toggle()`, `setView(view)`, `hydrate(view)`.
- `toggle`/`setView` gravam o cookie via `writeGymViewCookie` (task 2) e atualizam o estado em memória.
- `hydrate` só aplica na primeira chamada (chamadas subsequentes são no-op) e nunca grava cookie.
- `pnpm --filter frontend test gym-view-store.test.ts` 100% verde.
