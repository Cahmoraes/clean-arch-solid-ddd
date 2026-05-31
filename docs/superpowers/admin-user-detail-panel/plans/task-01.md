# Task 1: Hook `useIsDesktop` (responsividade) [RF-002, RF-003]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** N/A

## Visão Geral

Cria um hook React que detecta, em tempo de execução, se o viewport está em desktop (≥ 768px, breakpoint `md` do Tailwind). O container responsivo (task 8) usa esse hook para decidir entre renderizar o painel em coluna (desktop) ou dentro de um `Dialog` (mobile). O projeto ainda não possui nenhum hook de media query.

## Arquivos

- Create: `apps/frontend/src/lib/hooks/use-is-desktop.ts`
- Test: `apps/frontend/src/lib/hooks/use-is-desktop.test.tsx`

### Conformidade com as Skills Padrão

- use react skill: hooks, estado e efeitos com cleanup correto
- use test-antipatterns skill: testes determinísticos, sem detalhes de implementação
- use vitest skill: estrutura de testes, mocks de `matchMedia`
- use typescript-advanced skill: tipagem do retorno e do listener

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/lib/hooks/use-is-desktop.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useIsDesktop } from "./use-is-desktop"

type Listener = (event: MediaQueryListEvent) => void

function mockMatchMedia(initialMatches: boolean) {
	const listeners = new Set<Listener>()
	const mql = {
		matches: initialMatches,
		media: "(min-width: 768px)",
		addEventListener: (_type: string, listener: Listener) => {
			listeners.add(listener)
		},
		removeEventListener: (_type: string, listener: Listener) => {
			listeners.delete(listener)
		},
	}
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue(mql as unknown as MediaQueryList),
	)
	return {
		emit: (matches: boolean) => {
			mql.matches = matches
			for (const listener of listeners) {
				listener({ matches } as MediaQueryListEvent)
			}
		},
		hasListeners: () => listeners.size > 0,
	}
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("useIsDesktop", () => {
	test("retorna true quando o viewport corresponde a min-width 768px", () => {
		mockMatchMedia(true)
		const { result } = renderHook(() => useIsDesktop())
		expect(result.current).toBe(true)
	})

	test("retorna false quando o viewport é menor que 768px", () => {
		mockMatchMedia(false)
		const { result } = renderHook(() => useIsDesktop())
		expect(result.current).toBe(false)
	})

	test("atualiza o valor quando o media query muda", () => {
		const media = mockMatchMedia(false)
		const { result } = renderHook(() => useIsDesktop())
		expect(result.current).toBe(false)
		act(() => media.emit(true))
		expect(result.current).toBe(true)
	})

	test("remove o listener ao desmontar", () => {
		const media = mockMatchMedia(true)
		const { unmount } = renderHook(() => useIsDesktop())
		expect(media.hasListeners()).toBe(true)
		unmount()
		expect(media.hasListeners()).toBe(false)
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "useIsDesktop"`
Expected: FAIL — `Failed to resolve import "./use-is-desktop"` (arquivo ainda não existe).

- **Step 3: Implementar o hook**

Crie `apps/frontend/src/lib/hooks/use-is-desktop.ts`:

```ts
"use client"

import { useEffect, useState } from "react"

const DESKTOP_QUERY = "(min-width: 768px)"

function getMatch(): boolean {
	if (typeof window === "undefined" || !window.matchMedia) return true
	return window.matchMedia(DESKTOP_QUERY).matches
}

export function useIsDesktop(): boolean {
	const [isDesktop, setIsDesktop] = useState<boolean>(getMatch)

	useEffect(() => {
		const mql = window.matchMedia(DESKTOP_QUERY)
		const handleChange = (event: MediaQueryListEvent) => {
			setIsDesktop(event.matches)
		}
		setIsDesktop(mql.matches)
		mql.addEventListener("change", handleChange)
		return () => mql.removeEventListener("change", handleChange)
	}, [])

	return isDesktop
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "useIsDesktop"`
Expected: PASS — 4 testes passam.

- **Step 5: Lint**

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/lib/hooks/use-is-desktop.ts apps/frontend/src/lib/hooks/use-is-desktop.test.tsx
git commit -m "feat(frontend): add useIsDesktop responsive hook"
```

## Critérios de Sucesso

- O hook retorna `true` para viewport ≥ 768px e `false` abaixo disso (RF-002, RF-003).
- O valor reage a mudanças de tamanho da janela via evento `change`.
- O listener é removido no unmount (sem vazamento).
- SSR-safe: retorna `true` quando `window`/`matchMedia` indisponível.
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
