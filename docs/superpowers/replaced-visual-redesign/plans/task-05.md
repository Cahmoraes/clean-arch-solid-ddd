# Task 5: Hook useSceneMotion com pausa, movimento reduzido e visibilidade [FR-013, FR-014, FR-015]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** N/A

## Visão Geral

Cria o hook que decide se as cenas animam: pausa quando o usuário pediu, quando o sistema pede movimento reduzido ou quando a cena está fora da tela. A escolha manual é compartilhada por todas as cenas e pelos controles de pausa e é guardada no navegador; qualquer falha de armazenamento, `matchMedia` ausente ou `IntersectionObserver` ausente cai no padrão "animar" sem lançar exceção. A tarefa também cria os helpers de teste para simular essas APIs do navegador, pois o repositório não tem mocks globais delas.

## Arquivos

- Create: `apps/frontend/src/lib/hooks/use-scene-motion.ts`
- Create: `apps/frontend/src/test/browser-mocks.ts`
- Test: `apps/frontend/src/lib/hooks/use-scene-motion.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:**
  - `apps/frontend/src/lib/hooks/use-scene-motion.ts`:
    - `export const SCENE_MOTION_STORAGE_KEY = "volt:scene-motion-paused"`
    - `export interface UserMotionPause { userPaused: boolean; toggleUserPause: () => void }`
    - `export interface SceneMotion extends UserMotionPause { paused: boolean }`
    - `export function useSceneMotion(ref: RefObject<Element | null>): SceneMotion` (`paused = userPaused || reducedMotion || !visible`)
    - `export function useUserMotionPause(): UserMotionPause` (só a preferência manual, sem ref; usado pelos toggles)
    - `export function setUserPause(paused: boolean): void` (define a preferência manual, grava no navegador e notifica todos os assinantes)
  - `apps/frontend/src/test/browser-mocks.ts`:
    - `export function mockMatchMedia(initialMatches: boolean): { emit: (matches: boolean) => void; hasListeners: () => boolean }`
    - `export function mockIntersectionObserver(): { emit: (isIntersecting: boolean) => void; activeObservers: () => number }`
    - `export function mockBlockedLocalStorage(): void` (`getItem`, `setItem`, `removeItem`, `clear` lançam `SecurityError`)
    - Todos usam `vi.stubGlobal`; o teste chama `vi.unstubAllGlobals()` no `afterEach`.

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: `useSyncExternalStore` para estado externo (preferência e `matchMedia`), efeito só para o `IntersectionObserver`, sem `useEffect` de sincronização de estado derivado.
- `vercel-composition-patterns`: hook pequeno e composável (`useUserMotionPause` reaproveitado pelo toggle).
- `typescript-advanced`: tipos explícitos para `RefObject<Element | null>`, retorno `SceneMotion extends UserMotionPause`.
- `test-antipatterns`: os mocks simulam a API do navegador na fronteira; nada de mockar o próprio hook.
- `no-workarounds`: falhas de ambiente tratadas na origem (guardas e `try/catch` com comentário), sem supressões.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/test/browser-mocks.ts`:

```ts
import { vi } from "vitest"

type MediaListener = (event: MediaQueryListEvent) => void

export function mockMatchMedia(initialMatches: boolean) {
	const listeners = new Set<MediaListener>()
	const query = {
		matches: initialMatches,
		media: "",
		addEventListener: (_type: string, listener: MediaListener) => {
			listeners.add(listener)
		},
		removeEventListener: (_type: string, listener: MediaListener) => {
			listeners.delete(listener)
		},
	}
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue(query as unknown as MediaQueryList),
	)
	return {
		emit: (matches: boolean) => {
			query.matches = matches
			for (const listener of listeners) {
				listener({ matches } as MediaQueryListEvent)
			}
		},
		hasListeners: () => listeners.size > 0,
	}
}

export function mockIntersectionObserver() {
	const instances = new Set<FakeIntersectionObserver>()

	class FakeIntersectionObserver {
		callback: IntersectionObserverCallback

		constructor(callback: IntersectionObserverCallback) {
			this.callback = callback
			instances.add(this)
		}

		observe() {}
		unobserve() {}
		disconnect() {
			instances.delete(this)
		}
	}

	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)
	return {
		emit: (isIntersecting: boolean) => {
			for (const observer of instances) {
				observer.callback(
					[{ isIntersecting } as IntersectionObserverEntry],
					observer as unknown as IntersectionObserver,
				)
			}
		},
		activeObservers: () => instances.size,
	}
}

export function mockBlockedLocalStorage(): void {
	const blocked = () => {
		throw new DOMException("O armazenamento está bloqueado", "SecurityError")
	}
	vi.stubGlobal("localStorage", {
		getItem: blocked,
		setItem: blocked,
		removeItem: blocked,
		clear: blocked,
	})
}
```

Criar `apps/frontend/src/lib/hooks/use-scene-motion.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import {
	mockIntersectionObserver,
	mockMatchMedia,
} from "@/test/browser-mocks"
import {
	SCENE_MOTION_STORAGE_KEY,
	setUserPause,
	useSceneMotion,
} from "./use-scene-motion"

function renderMotion() {
	const element = document.createElement("div")
	document.body.appendChild(element)
	const ref = { current: element }
	return renderHook(() => useSceneMotion(ref))
}

afterEach(() => {
	vi.unstubAllGlobals()
	window.localStorage.clear()
	act(() => setUserPause(false))
})

describe("useSceneMotion", () => {
	test("anima por padrão: sem pausa manual, sem movimento reduzido, cena visível", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
		expect(result.current.userPaused).toBe(false)
	})

	test("pausa quando o sistema pede movimento reduzido e retoma quando deixa de pedir", () => {
		const media = mockMatchMedia(true)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(true)
		act(() => media.emit(false))
		expect(result.current.paused).toBe(false)
	})

	test("pausa quando a cena sai da tela e retoma quando volta", () => {
		mockMatchMedia(false)
		const observer = mockIntersectionObserver()
		const { result } = renderMotion()
		act(() => observer.emit(false))
		expect(result.current.paused).toBe(true)
		act(() => observer.emit(true))
		expect(result.current.paused).toBe(false)
	})

	test("toggleUserPause pausa, grava no navegador e alterna de volta", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { result } = renderMotion()
		act(() => result.current.toggleUserPause())
		expect(result.current.paused).toBe(true)
		expect(result.current.userPaused).toBe(true)
		expect(window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)).toBe("true")
		act(() => result.current.toggleUserPause())
		expect(result.current.paused).toBe(false)
		expect(window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)).toBe("false")
	})

	test("lê a escolha guardada ao montar", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		window.localStorage.setItem(SCENE_MOTION_STORAGE_KEY, "true")
		const { result } = renderMotion()
		expect(result.current.userPaused).toBe(true)
		expect(result.current.paused).toBe(true)
	})

	test("duas instâncias compartilham a mesma escolha manual", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const first = renderMotion()
		const second = renderMotion()
		act(() => first.result.current.toggleUserPause())
		expect(second.result.current.userPaused).toBe(true)
	})

	test("desconecta o observador de visibilidade e o listener de matchMedia ao desmontar", () => {
		const media = mockMatchMedia(false)
		const observer = mockIntersectionObserver()
		const { unmount } = renderMotion()
		expect(observer.activeObservers()).toBe(1)
		expect(media.hasListeners()).toBe(true)
		unmount()
		expect(observer.activeObservers()).toBe(0)
		expect(media.hasListeners()).toBe(false)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx`
Expected: FAIL com `Failed to resolve import "./use-scene-motion"` (o módulo ainda não existe).

- **Step 3: Write minimal implementation**

Criar `apps/frontend/src/lib/hooks/use-scene-motion.ts`. Esta primeira versão acessa as APIs do navegador diretamente; as guardas de ambiente entram nos passos de Review Focus abaixo.

```ts
import {
	type RefObject,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react"

export const SCENE_MOTION_STORAGE_KEY = "volt:scene-motion-paused"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export interface UserMotionPause {
	userPaused: boolean
	toggleUserPause: () => void
}

export interface SceneMotion extends UserMotionPause {
	paused: boolean
}

const listeners = new Set<() => void>()
let userPausedState = false

function readStoredPause(): boolean | null {
	const stored = window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)
	if (stored === "true") return true
	if (stored === "false") return false
	return null
}

function writeStoredPause(paused: boolean): void {
	window.localStorage.setItem(SCENE_MOTION_STORAGE_KEY, String(paused))
}

export function setUserPause(paused: boolean): void {
	userPausedState = paused
	writeStoredPause(paused)
	for (const listener of listeners) listener()
}

function toggleUserPause(): void {
	setUserPause(!userPausedState)
}

function subscribeUserPause(listener: () => void): () => void {
	if (listeners.size === 0) {
		const stored = readStoredPause()
		if (stored !== null) userPausedState = stored
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

function getUserPauseSnapshot(): boolean {
	return userPausedState
}

function getServerPauseSnapshot(): boolean {
	return false
}

export function useUserMotionPause(): UserMotionPause {
	const userPaused = useSyncExternalStore(
		subscribeUserPause,
		getUserPauseSnapshot,
		getServerPauseSnapshot,
	)
	return { userPaused, toggleUserPause }
}

function getReducedMotionQuery(): MediaQueryList {
	return window.matchMedia(REDUCED_MOTION_QUERY)
}

function subscribeReducedMotion(listener: () => void): () => void {
	const query = getReducedMotionQuery()
	query.addEventListener("change", listener)
	return () => query.removeEventListener("change", listener)
}

function getReducedMotionSnapshot(): boolean {
	return getReducedMotionQuery().matches
}

function getServerReducedMotionSnapshot(): boolean {
	return false
}

function useIsVisible(ref: RefObject<Element | null>): boolean {
	const [visible, setVisible] = useState(true)
	useEffect(() => {
		const element = ref.current
		if (!element) return undefined
		const observer = new IntersectionObserver((entries) => {
			const latest = entries.at(-1)
			if (latest) setVisible(latest.isIntersecting)
		})
		observer.observe(element)
		return () => observer.disconnect()
	}, [ref])
	return visible
}

export function useSceneMotion(ref: RefObject<Element | null>): SceneMotion {
	const { userPaused, toggleUserPause: toggle } = useUserMotionPause()
	const reducedMotion = useSyncExternalStore(
		subscribeReducedMotion,
		getReducedMotionSnapshot,
		getServerReducedMotionSnapshot,
	)
	const visible = useIsVisible(ref)
	return {
		paused: userPaused || reducedMotion || !visible,
		userPaused,
		toggleUserPause: toggle,
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx`
Expected: PASS (7 testes)

- **Step 5: Review Focus: Armazenamento local indisponível ou bloqueado (leitura ou escrita lança exceção) → cena anima, sem exceção, e o toggle funciona na sessão — Write the failing test**

Acrescentar ao `describe("useSceneMotion", ...)` do arquivo de teste (e `mockBlockedLocalStorage` ao import de `@/test/browser-mocks`):

```tsx
	test("armazenamento bloqueado na leitura e na escrita: anima, não lança e o toggle funciona na sessão", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		mockBlockedLocalStorage()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
		expect(() => act(() => result.current.toggleUserPause())).not.toThrow()
		expect(result.current.userPaused).toBe(true)
		expect(result.current.paused).toBe(true)
		act(() => result.current.toggleUserPause())
		expect(result.current.paused).toBe(false)
	})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx -t "armazenamento bloqueado"`
Expected: FAIL com `SecurityError` lançado por `getItem` dentro de `readStoredPause` (a leitura ao montar não está protegida).

- **Step 7: Write minimal implementation**

Em `use-scene-motion.ts`, trocar `readStoredPause` e `writeStoredPause` por versões que absorvem a falha (sem persistir, a escolha vale na sessão pela variável do módulo):

```ts
function readStoredPause(): boolean | null {
	try {
		const stored = window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)
		if (stored === "true") return true
		if (stored === "false") return false
		return null
	} catch {
		// Armazenamento indisponível ou bloqueado: sem escolha guardada, o padrão é animar.
		return null
	}
}

function writeStoredPause(paused: boolean): void {
	try {
		window.localStorage.setItem(SCENE_MOTION_STORAGE_KEY, String(paused))
	} catch {
		// Não foi possível persistir: a escolha continua valendo só nesta sessão.
	}
}
```

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx`
Expected: PASS

- **Step 9: Review Focus: `matchMedia` ausente no ambiente → tratado como sem preferência de movimento reduzido, sem exceção — Write the failing test**

```tsx
	test("matchMedia ausente: trata como sem movimento reduzido e não lança", () => {
		vi.stubGlobal("matchMedia", undefined)
		mockIntersectionObserver()
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
	})
```

- **Step 10: Run test to verify it fails**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx -t "matchMedia ausente"`
Expected: FAIL com `window.matchMedia is not a function`.

- **Step 11: Write minimal implementation**

Substituir as três funções de movimento reduzido:

```ts
function getReducedMotionQuery(): MediaQueryList | null {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return null
	}
	return window.matchMedia(REDUCED_MOTION_QUERY)
}

function noop(): void {
	// Sem API para assinar: nada a cancelar.
}

function subscribeReducedMotion(listener: () => void): () => void {
	const query = getReducedMotionQuery()
	if (!query) return noop
	query.addEventListener("change", listener)
	return () => query.removeEventListener("change", listener)
}

function getReducedMotionSnapshot(): boolean {
	return getReducedMotionQuery()?.matches ?? false
}
```

- **Step 12: Run test to verify it passes**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx`
Expected: PASS

- **Step 13: Review Focus: `IntersectionObserver` ausente → cena tratada como visível, sem exceção — Write the failing test**

```tsx
	test("IntersectionObserver ausente: a cena é tratada como visível e não lança", () => {
		mockMatchMedia(false)
		vi.stubGlobal("IntersectionObserver", undefined)
		const { result } = renderMotion()
		expect(result.current.paused).toBe(false)
	})
```

- **Step 14: Run test to verify it fails**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx -t "IntersectionObserver ausente"`
Expected: FAIL com `IntersectionObserver is not a constructor`.

- **Step 15: Write minimal implementation**

Em `useIsVisible`, depois de obter o elemento, sair cedo quando a API não existe (o estado inicial `true` mantém a cena visível):

```ts
		const element = ref.current
		if (!element || typeof IntersectionObserver === "undefined") {
			return undefined
		}
```

- **Step 16: Run test to verify it passes**

Run: `pnpm --filter frontend test src/lib/hooks/use-scene-motion.test.tsx`
Expected: PASS (10 testes)

- **Step 17: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/lib/hooks/use-scene-motion.ts apps/frontend/src/lib/hooks/use-scene-motion.test.tsx apps/frontend/src/test/browser-mocks.ts
git commit -m "feat(frontend): hook useSceneMotion com pausa, movimento reduzido e visibilidade"
```

## Critérios de Sucesso

- `paused` é verdadeiro se o usuário pausou, ou movimento reduzido está ativo, ou a cena está fora da tela (FR-013, FR-014, FR-015).
- A escolha manual é compartilhada entre instâncias, gravada em `localStorage` sob `volt:scene-motion-paused` e lida ao montar (FR-013).
- Armazenamento bloqueado, `matchMedia` ausente e `IntersectionObserver` ausente não lançam e resultam em cena animando; o toggle funciona na sessão (FR-013).
- Os listeners e o observador são liberados ao desmontar.
