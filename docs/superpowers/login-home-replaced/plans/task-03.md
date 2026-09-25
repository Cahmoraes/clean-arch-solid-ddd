# Task 3: Preferência de movimento e MotionToggle [FR-015, FR-016, FR-018]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Cria a fonte única de pausa do usuário: um store externo em `localStorage` (`volt:scene-motion-paused`), consumido via `useSyncExternalStore`, que espelha um atributo `data-motion-paused` no `<html>` para os efeitos puramente CSS. O `MotionToggle` expõe essa pausa como botão "Pausar animações"/"Retomar animações". `useSceneMotion` passa a somar essa preferência às duas fontes existentes (reduced motion, visibilidade). Se o armazenamento estiver bloqueado, tudo continua funcionando só em memória.

## Arquivos

- Create: `apps/frontend/src/lib/motion-preference.ts`
- Create: `apps/frontend/src/components/ui/motion-toggle.tsx`
- Modify: `apps/frontend/src/lib/hooks/use-scene-motion.ts`
- Test: `apps/frontend/src/lib/motion-preference.test.ts`
- Test: `apps/frontend/src/components/ui/motion-toggle.test.tsx`
- Test: `apps/frontend/src/lib/hooks/use-scene-motion.test.tsx` (acrescentar caso)

## Interfaces

- **Consome:** N/A
- **Produz:** `useMotionPreference(): { paused: boolean; toggle: () => void }`; `setMotionPaused(paused: boolean): void`; `readMotionPaused(): boolean`; `MOTION_PAUSED_STORAGE_KEY: string` (`"volt:scene-motion-paused"`); `MotionToggle({ className?: string }): JSX.Element`; atributo `data-motion-paused` no `<html>`; `useSceneMotion(ref: RefObject<Element | null>): { paused: boolean }` (assinatura inalterada, agora soma a preferência) — consumidos por task-04 (header público), task-06 (`PixelTrail` via `useSceneMotion`), task-07 (script de boot lê a mesma chave de `localStorage`), task-10 (e2e).

### Skills a invocar

- `vercel-react-best-practices`: `useSyncExternalStore` como fonte externa de estado compartilhada entre `MotionToggle`, `useSceneMotion` e o script de boot.
- `wcag-audit-patterns`: botão com `aria-pressed` refletindo o estado (WCAG 2.2.2), nome acessível claro no estado pausado/ativo.
- `typescript-advanced`: tipar o store (`Listener`, snapshot) sem `any`.
- `test-antipatterns`: usar `mockBlockedLocalStorage()` de `src/test/browser-mocks.ts` em vez de mockar `localStorage` manualmente; resetar o store real entre testes (`setMotionPaused(false)` + `localStorage.clear()`), nunca reimportar o módulo.
- `no-workarounds`: o `try/catch` cobre falha real de armazenamento — não deve engolir outros erros nem desabilitar a UI.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/frontend/src/lib/motion-preference.test.ts
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import {
	MOTION_PAUSED_STORAGE_KEY,
	setMotionPaused,
	useMotionPreference,
} from "./motion-preference"

describe("motion-preference", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
		setMotionPaused(false)
	})

	test("persiste a pausa no localStorage e espelha o atributo data-motion-paused no html", () => {
		setMotionPaused(true)
		expect(localStorage.getItem(MOTION_PAUSED_STORAGE_KEY)).toBe("true")
		expect(
			document.documentElement.hasAttribute("data-motion-paused"),
		).toBe(true)
	})

	test("reidrata a pausa quando outra aba grava no localStorage (evento storage)", () => {
		const { result } = renderHook(() => useMotionPreference())
		act(() => {
			localStorage.setItem(MOTION_PAUSED_STORAGE_KEY, "true")
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: MOTION_PAUSED_STORAGE_KEY,
					newValue: "true",
				}),
			)
		})
		expect(result.current.paused).toBe(true)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/motion-preference.test.ts`
Expected: FAIL — `./motion-preference` não existe (`Cannot find module`).

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/lib/motion-preference.ts
import { useSyncExternalStore } from "react"

export const MOTION_PAUSED_STORAGE_KEY = "volt:scene-motion-paused"
const MOTION_PAUSED_ATTR = "data-motion-paused"

type Listener = () => void

function readStorageValue(): boolean {
	if (typeof window === "undefined") return false
	return window.localStorage.getItem(MOTION_PAUSED_STORAGE_KEY) === "true"
}

function writeStorageValue(paused: boolean): void {
	if (typeof window === "undefined") return
	if (paused) {
		window.localStorage.setItem(MOTION_PAUSED_STORAGE_KEY, "true")
	} else {
		window.localStorage.removeItem(MOTION_PAUSED_STORAGE_KEY)
	}
}

function mirrorAttribute(paused: boolean): void {
	if (typeof document === "undefined") return
	document.documentElement.toggleAttribute(MOTION_PAUSED_ATTR, paused)
}

let memoryPaused = readStorageValue()
const listeners = new Set<Listener>()

function notify(): void {
	for (const listener of listeners) listener()
}

export function readMotionPaused(): boolean {
	return memoryPaused
}

export function setMotionPaused(paused: boolean): void {
	memoryPaused = paused
	writeStorageValue(paused)
	mirrorAttribute(paused)
	notify()
}

function handleStorageEvent(event: StorageEvent): void {
	if (event.key !== null && event.key !== MOTION_PAUSED_STORAGE_KEY) return
	memoryPaused = readStorageValue()
	mirrorAttribute(memoryPaused)
	notify()
}

function subscribe(listener: Listener): () => void {
	listeners.add(listener)
	window.addEventListener("storage", handleStorageEvent)
	return () => {
		listeners.delete(listener)
		window.removeEventListener("storage", handleStorageEvent)
	}
}

function getSnapshot(): boolean {
	return memoryPaused
}

function getServerSnapshot(): boolean {
	return false
}

export function useMotionPreference(): {
	paused: boolean
	toggle: () => void
} {
	const paused = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
	function toggle(): void {
		setMotionPaused(!paused)
	}
	return { paused, toggle }
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/motion-preference.test.ts`
Expected: PASS — as duas asserções (persistência + reidratação via evento `storage`) passam.

- **Step 5: Review Focus: `localStorage` bloqueado: o botão de pausa ainda alterna em memória e nada lança exceção — Write the failing test**

```ts
import { mockBlockedLocalStorage } from "@/test/browser-mocks"

test("com localStorage bloqueado, a pausa alterna só em memória e não lança exceção", () => {
	mockBlockedLocalStorage()
	expect(() => setMotionPaused(true)).not.toThrow()
	expect(readMotionPaused()).toBe(true)
	expect(
		document.documentElement.hasAttribute("data-motion-paused"),
	).toBe(true)
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/motion-preference.test.ts`
Expected: FAIL — `writeStorageValue` chama `window.localStorage.setItem` direto; com `mockBlockedLocalStorage()`, `setItem` lança `DOMException("O armazenamento está bloqueado", "SecurityError")`, que escapa de `setMotionPaused` e derruba `expect(() => setMotionPaused(true)).not.toThrow()`.

- **Step 7: Write minimal implementation**

Envolver a leitura e a escrita de storage em `try/catch` em `motion-preference.ts`:

```ts
function readStorageValue(): boolean {
	if (typeof window === "undefined") return false
	try {
		return window.localStorage.getItem(MOTION_PAUSED_STORAGE_KEY) === "true"
	} catch {
		return memoryPaused
	}
}

function writeStorageValue(paused: boolean): void {
	if (typeof window === "undefined") return
	try {
		if (paused) {
			window.localStorage.setItem(MOTION_PAUSED_STORAGE_KEY, "true")
		} else {
			window.localStorage.removeItem(MOTION_PAUSED_STORAGE_KEY)
		}
	} catch {
		// armazenamento bloqueado: a pausa continua valendo só em memória (FR-018)
	}
}
```

(`readStorageValue` referencia `memoryPaused`, declarada logo abaixo; mover a declaração de `memoryPaused` para antes das duas funções, ou usar `let memoryPaused: boolean` adiantado com atribuição posterior.)

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/motion-preference.test.ts`
Expected: PASS — os 3 testes do arquivo passam, incluindo o de storage bloqueado.

- **Step 9: Write the failing test**

```tsx
// apps/frontend/src/components/ui/motion-toggle.test.tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import { setMotionPaused } from "@/lib/motion-preference"
import { MotionToggle } from "./motion-toggle"

describe("MotionToggle", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
		setMotionPaused(false)
	})

	test("exibe Pausar animações com aria-pressed false quando as animações rodam", () => {
		render(<MotionToggle />)
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toHaveAttribute("aria-pressed", "false")
	})

	test("clicar alterna para Retomar animações com aria-pressed true", () => {
		render(<MotionToggle />)
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		expect(
			screen.getByRole("button", { name: "Retomar animações" }),
		).toHaveAttribute("aria-pressed", "true")
	})
})
```

- **Step 10: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/motion-toggle.test.tsx`
Expected: FAIL — `./motion-toggle` não existe.

- **Step 11: Write minimal implementation**

```tsx
// apps/frontend/src/components/ui/motion-toggle.tsx
"use client"
import { cn } from "@/lib/cn"
import { useMotionPreference } from "@/lib/motion-preference"

export interface MotionToggleProps {
	className?: string
}

export function MotionToggle({ className }: MotionToggleProps) {
	const { paused, toggle } = useMotionPreference()
	const label = paused ? "Retomar animações" : "Pausar animações"
	return (
		<button
			type="button"
			onClick={toggle}
			aria-pressed={paused}
			className={cn(
				"inline-flex h-9 items-center justify-center rounded-xs border border-border-strong px-3 font-display text-base",
				className,
			)}
		>
			{label}
		</button>
	)
}
```

Não há ícone de pausa/retomada em `pixel-icons.tsx` (só ícones conferidos: nenhum `Pause`/`Play`); o botão usa apenas texto em `font-display text-base` (16px, peso único, dentro do limite `>= 15px` e nunca bold).

- **Step 12: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/motion-toggle.test.tsx`
Expected: PASS.

- **Step 13: Write the failing test**

Acrescentar ao arquivo existente `apps/frontend/src/lib/hooks/use-scene-motion.test.tsx` (mesmo padrão de `renderMotion()` já usado nos demais casos do arquivo) o teste:

```ts
import { setMotionPaused } from "@/lib/motion-preference"

test("pausa quando a preferência do usuário está ativa, mesmo visível e sem reduced motion", () => {
	mockMatchMedia(false)
	mockIntersectionObserver()
	setMotionPaused(true)
	const { result } = renderMotion()
	expect(result.current.paused).toBe(true)
	setMotionPaused(false)
})
```

- **Step 14: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/hooks/use-scene-motion.test.tsx`
Expected: FAIL — `useSceneMotion` hoje retorna `paused = reducedMotion || !visible`, sem considerar a preferência do usuário; com `mockMatchMedia(false)` e visível, `paused` é `false`.

- **Step 15: Write minimal implementation**

```ts
// apps/frontend/src/lib/hooks/use-scene-motion.ts
import { useMotionPreference } from "@/lib/motion-preference"

export function useSceneMotion(ref: RefObject<Element | null>): SceneMotion {
	const reducedMotion = useSyncExternalStore(
		subscribeReducedMotion,
		getReducedMotionSnapshot,
		getServerReducedMotionSnapshot,
	)
	const visible = useIsVisible(ref)
	const { paused: userPaused } = useMotionPreference()
	return { paused: reducedMotion || !visible || userPaused }
}
```

- **Step 16: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/hooks/use-scene-motion.test.tsx`
Expected: PASS — todos os casos do arquivo, incluindo o novo, passam.

- **Step 17: Commit**

```bash
git add apps/frontend/src/lib/motion-preference.ts apps/frontend/src/lib/motion-preference.test.ts apps/frontend/src/components/ui/motion-toggle.tsx apps/frontend/src/components/ui/motion-toggle.test.tsx apps/frontend/src/lib/hooks/use-scene-motion.ts apps/frontend/src/lib/hooks/use-scene-motion.test.tsx
git commit -m "feat(motion): preferencia de movimento persistente e MotionToggle"
```

## Critérios de Sucesso

- `setMotionPaused`/`readMotionPaused` persistem em `localStorage` e espelham `data-motion-paused` no `<html>` (FR-015).
- Outra aba gravando a mesma chave reidrata o hook via evento `storage`.
- Com `localStorage` bloqueado, `setMotionPaused` não lança exceção e a pausa continua valendo em memória (FR-018).
- `MotionToggle` alterna rótulo e `aria-pressed` a cada clique (FR-015).
- `useSceneMotion` retorna `paused = reducedMotion || !visible || userPaused`, sem mudar a assinatura pública (FR-016).
