# Task 6: PixelTrail: rastro de pixels em Canvas2D [FR-010, FR-011, FR-016, FR-017]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** capable

## Visão Geral

Implementa `PixelTrail`, um `<canvas>` absoluto que desenha um rastro de pixels ao passar o mouse dentro do seu elemento pai (`relative`), em Canvas2D puro (sem dependência nova, D2). O rastro decai sozinho em menos de 1s, custa zero em repouso (sem `pointermove`, nenhum `requestAnimationFrame` agendado) e respeita a preferência de movimento (`useSceneMotion`), dispositivos de toque e a ausência de contexto 2D.

## Arquivos

- Create: `apps/frontend/src/components/ui/pixel-trail.tsx`
- Test: `apps/frontend/src/components/ui/pixel-trail.test.tsx`

## Interfaces

- **Consome:** `useSceneMotion(ref: RefObject<Element | null>): { paused: boolean }` (task-03, já soma reduced motion + visibilidade + preferência do usuário).
- **Produz:** `PixelTrail({ className?: string; cellSize?: number }): JSX.Element` — consumido por task-08 (login) e task-09 (home).

### Skills a invocar

- `vercel-react-best-practices`: ciclo de vida de `useEffect`/`ref` para canvas, sem `useState` para o que pode ficar em variáveis locais do efeito (evita re-render por frame).
- `wcag-audit-patterns`: `aria-hidden="true"` no canvas (puramente decorativo), sem foco nem texto alternativo.
- `no-workarounds`: o guard de `pointer: coarse` e de `getContext` nulo é uma saída limpa (`return`), não um `try/catch` genérico escondendo outros erros.
- `test-antipatterns`: estubar `getContext`, `requestAnimationFrame`, `cancelAnimationFrame` e `matchMedia` explicitamente por teste — nunca depender do `mockMatchMedia` compartilhado para duas media queries diferentes ao mesmo tempo (ver nota no Step 1: ele não distingue a query pedida, então usar aqui misturaria `prefers-reduced-motion` com `pointer: fine`).

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/components/ui/pixel-trail.test.tsx
import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { PixelTrail } from "./pixel-trail"

// `mockMatchMedia` de src/test/browser-mocks.ts é um único valor global e não
// distingue a query — usá-lo aqui misturaria "(pointer: fine)" com
// "(prefers-reduced-motion: reduce)" (lida por useSceneMotion). Por isso este
// arquivo estuba matchMedia localmente, por query.
function stubMatchMedia(pointerFine: boolean, reducedMotion = false): void {
	vi.stubGlobal(
		"matchMedia",
		(query: string) =>
			({
				matches: query.includes("pointer") ? pointerFine : reducedMotion,
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}) as unknown as MediaQueryList,
	)
}

function makeFakeContext() {
	return {
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		setTransform: vi.fn(),
		fillStyle: "",
		globalAlpha: 1,
	} as unknown as CanvasRenderingContext2D
}

function renderTrail() {
	return render(
		<div style={{ position: "relative" }}>
			<PixelTrail />
		</div>,
	)
}

describe("PixelTrail", () => {
	let rafCallbacks: FrameRequestCallback[]
	let fakeContext: CanvasRenderingContext2D

	beforeEach(() => {
		rafCallbacks = []
		fakeContext = makeFakeContext()
		stubMatchMedia(true)
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			fakeContext,
		)
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			rafCallbacks.push(cb)
			return rafCallbacks.length
		})
		vi.stubGlobal("cancelAnimationFrame", vi.fn())
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	test("sem pointermove, nenhum rAF é agendado", () => {
		renderTrail()
		expect(rafCallbacks).toHaveLength(0)
	})

	test("após pointermove, agenda rAF e desenha com fillRect", () => {
		const { container } = renderTrail()
		const wrapper = container.firstElementChild as HTMLElement
		fireEvent.pointerMove(wrapper, { clientX: 20, clientY: 20 })
		expect(rafCallbacks.length).toBeGreaterThan(0)
		rafCallbacks[0]?.(0)
		expect(fakeContext.fillRect).toHaveBeenCalled()
	})

	test("com pointer: coarse, não registra o listener de pointermove", () => {
		stubMatchMedia(false)
		const { container } = renderTrail()
		const wrapper = container.firstElementChild as HTMLElement
		fireEvent.pointerMove(wrapper, { clientX: 20, clientY: 20 })
		expect(rafCallbacks).toHaveLength(0)
	})

	test("com getContext retornando nulo, não lança erro e não desenha", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
		expect(() => renderTrail()).not.toThrow()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pixel-trail.test.tsx`
Expected: FAIL — `./pixel-trail` não existe (`Cannot find module`).

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/components/ui/pixel-trail.tsx
"use client"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/cn"

export interface PixelTrailProps {
	className?: string
	cellSize?: number
}

const MAX_CELLS = 150
const DECAY_PER_FRAME = 0.04
const MAX_DPR = 2

interface Cell {
	x: number
	y: number
	alpha: number
}

function readTrailColors(): string[] {
	const styles = getComputedStyle(document.documentElement)
	const candidates = [
		styles.getPropertyValue("--color-primary").trim(),
		styles.getPropertyValue("--color-accent").trim(),
		styles.getPropertyValue("--color-scene-sun").trim() ||
			styles.getPropertyValue("--color-warning").trim(),
	]
	return candidates.filter((color) => color.length > 0)
}

function advanceCells(
	cells: Map<string, Cell>,
	context: CanvasRenderingContext2D,
	cellSize: number,
	colors: string[],
): void {
	let index = 0
	for (const [key, cell] of cells) {
		context.fillStyle = colors[index % colors.length] ?? colors[0] ?? "#000"
		context.globalAlpha = cell.alpha
		context.fillRect(cell.x, cell.y, cellSize, cellSize)
		cell.alpha -= DECAY_PER_FRAME
		if (cell.alpha <= 0) cells.delete(key)
		index += 1
	}
	context.globalAlpha = 1
}

function evictOldest(cells: Map<string, Cell>): void {
	if (cells.size <= MAX_CELLS) return
	const oldestKey = cells.keys().next().value
	if (oldestKey !== undefined) cells.delete(oldestKey)
}

export function PixelTrail({ className, cellSize = 10 }: PixelTrailProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const parent = containerRef.current
		if (!canvas || !parent) return undefined
		const context = canvas.getContext("2d")
		if (!context) return undefined
		if (!window.matchMedia("(pointer: fine)").matches) return undefined

		const cells = new Map<string, Cell>()
		let rafId: number | null = null

		function resizeCanvas(): void {
			const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
			canvas.width = parent.clientWidth * dpr
			canvas.height = parent.clientHeight * dpr
			context.setTransform(dpr, 0, 0, dpr, 0, 0)
		}

		function draw(): void {
			context.clearRect(0, 0, canvas.width, canvas.height)
			advanceCells(cells, context, cellSize, readTrailColors())
			rafId = cells.size > 0 ? requestAnimationFrame(draw) : null
		}

		function handlePointerMove(event: PointerEvent): void {
			const rect = parent.getBoundingClientRect()
			const x = Math.floor((event.clientX - rect.left) / cellSize) * cellSize
			const y = Math.floor((event.clientY - rect.top) / cellSize) * cellSize
			cells.set(`${x}:${y}`, { x, y, alpha: 0.9 })
			evictOldest(cells)
			if (rafId === null) rafId = requestAnimationFrame(draw)
		}

		resizeCanvas()
		const resizeObserver =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(resizeCanvas)
				: null
		resizeObserver?.observe(parent)
		parent.addEventListener("pointermove", handlePointerMove)

		return () => {
			parent.removeEventListener("pointermove", handlePointerMove)
			resizeObserver?.disconnect()
			if (rafId !== null) cancelAnimationFrame(rafId)
			cells.clear()
		}
	}, [cellSize])

	return (
		<div ref={containerRef} className="pointer-events-none absolute inset-0">
			<canvas
				ref={canvasRef}
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute inset-0 h-full w-full",
					className,
				)}
			/>
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pixel-trail.test.tsx`
Expected: PASS — os 4 testes do arquivo (sem rAF em repouso, rAF + `fillRect` após `pointermove`, sem listener com `pointer: coarse`, sem erro com `getContext` nulo).

- **Step 5: Review Focus: `PixelTrail` não deixa rAF agendado depois que as células somem, nem desenha com a pausa ativa — Write the failing test**

```tsx
import { setMotionPaused } from "@/lib/motion-preference"

test("depois que as células decaem nenhum rAF fica pendente, e com a pausa ativa o rastro não desenha", () => {
	// parte 1: o decaimento esgota o loop de rAF
	const first = renderTrail()
	const wrapper1 = first.container.firstElementChild as HTMLElement
	fireEvent.pointerMove(wrapper1, { clientX: 20, clientY: 20 })
	const framesToDecay = Math.ceil(0.9 / 0.04) + 1
	for (let i = 0; i < framesToDecay; i += 1) {
		const callback = rafCallbacks.at(-1)
		rafCallbacks = []
		callback?.(0)
	}
	expect(rafCallbacks).toHaveLength(0)
	first.unmount()

	// parte 2: com a preferência de pausa ativa, nenhum pointermove desenha
	setMotionPaused(true)
	fakeContext = makeFakeContext()
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		fakeContext,
	)
	const second = renderTrail()
	const wrapper2 = second.container.firstElementChild as HTMLElement
	fireEvent.pointerMove(wrapper2, { clientX: 20, clientY: 20 })
	expect(fakeContext.fillRect).not.toHaveBeenCalled()
	setMotionPaused(false)
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pixel-trail.test.tsx`
Expected: FAIL na parte 2 — `PixelTrail` ainda não lê `useSceneMotion`, então `handlePointerMove` desenha independentemente da pausa; `fakeContext.fillRect` é chamado mesmo com `setMotionPaused(true)`.

- **Step 7: Write minimal implementation**

```tsx
import { useSceneMotion } from "@/lib/hooks/use-scene-motion"

export function PixelTrail({ className, cellSize = 10 }: PixelTrailProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const { paused } = useSceneMotion(containerRef)

	useEffect(() => {
		const canvas = canvasRef.current
		const parent = containerRef.current
		if (!canvas || !parent) return undefined
		const context = canvas.getContext("2d")
		if (!context) return undefined
		if (!window.matchMedia("(pointer: fine)").matches) return undefined

		const cells = new Map<string, Cell>()
		let rafId: number | null = null

		function resizeCanvas(): void {
			/* inalterado */
		}
		function draw(): void {
			/* inalterado */
		}
		function handlePointerMove(event: PointerEvent): void {
			if (paused) return
			/* resto inalterado */
		}

		resizeCanvas()
		const resizeObserver =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(resizeCanvas)
				: null
		resizeObserver?.observe(parent)
		parent.addEventListener("pointermove", handlePointerMove)

		return () => {
			parent.removeEventListener("pointermove", handlePointerMove)
			resizeObserver?.disconnect()
			if (rafId !== null) cancelAnimationFrame(rafId)
			cells.clear()
		}
	}, [cellSize, paused])

	useEffect(() => {
		if (!paused) return
		const canvas = canvasRef.current
		const context = canvas?.getContext("2d")
		if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
	}, [paused])

	/* return inalterado */
}
```

Como o efeito principal agora depende de `paused`, cada troca de pausa executa o `cleanup` (remove o listener, cancela o rAF pendente e limpa `cells`) antes de reconfigurar — cobrindo "limpa células e cancela rAF" ao pausar (D2).

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pixel-trail.test.tsx`
Expected: PASS — as 5 asserções do arquivo passam, incluindo as duas partes do teste de Review Focus.

- **Step 9: Commit**

```bash
git add apps/frontend/src/components/ui/pixel-trail.tsx apps/frontend/src/components/ui/pixel-trail.test.tsx
git commit -m "feat(pixel-trail): rastro de pixels em Canvas2D com pausa e decaimento"
```

## Critérios de Sucesso

- Sem `pointermove`, nenhum `requestAnimationFrame` é agendado (FR-010, custo zero em repouso).
- `pointermove` desenha células que decaem e somem em menos de 1s, sem deixar rAF pendente depois (FR-010).
- `pointer: coarse` não registra o listener (FR-011).
- `getContext("2d")` nulo não lança erro e não desenha (Falhas e Erros da spec).
- Com a preferência de pausa (`useSceneMotion`) ativa, nenhum `pointermove` desenha (FR-016, FR-017).
