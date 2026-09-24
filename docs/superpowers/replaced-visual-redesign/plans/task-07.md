# Task 7: Componente PixelScene estático com fallback de erro [FR-010, FR-011]

**Status:** DONE

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** capable

**Depends on:** task-05

## Visão Geral

Cria o componente `PixelScene`, uma cena decorativa em SVG (skyline pixel em duas camadas, janelas acesas, feixes de luz e dither) com geometria fixa, sem aleatoriedade e sem cor literal. A cena é ignorada por leitores de tela e traduz o estado do `useSceneMotion` no atributo `data-paused`. Se a cena for inválida ou falhar ao renderizar, um limite de erro mostra um fundo liso e a página continua normal. Esta tarefa entrega só a estrutura e o atributo; o CSS de animação vem na tarefa 8.

## Arquivos

- Create: `apps/frontend/src/components/ui/pixel-scene.tsx`
- Test: `apps/frontend/src/components/ui/pixel-scene.test.tsx`

## Interfaces

- **Consome:** de task-05, `apps/frontend/src/lib/hooks/use-scene-motion.ts`:
  - `export function useSceneMotion(ref: RefObject<Element | null>): SceneMotion`, com `interface SceneMotion { paused: boolean; userPaused: boolean; toggleUserPause: () => void }`
  - Nos testes: `mockMatchMedia(initialMatches: boolean)`, `mockIntersectionObserver()` de `@/test/browser-mocks`.
- **Produz:** `apps/frontend/src/components/ui/pixel-scene.tsx`:
  - `export type PixelSceneName = "login" | "hero" | "empty"`
  - `export interface PixelSceneProps { scene: PixelSceneName; animated?: boolean; className?: string }`
  - `export function PixelScene({ scene, animated = false, className }: PixelSceneProps)`
  - Contrato de DOM que a tarefa 8 (CSS) e as tarefas 9 a 11 usam: `<svg class="pixel-scene ..." data-scene="<scene>" data-paused="true|false" aria-hidden="true">`; feixes em `<g class="pixel-scene-beam">`; janelas em `<rect class="pixel-scene-window">` com `animation-delay` inline; fallback `<div data-testid="pixel-scene-fallback" aria-hidden="true">`. `data-paused` é `"true"` sempre que `animated` é falso.
  - O SVG ocupa `h-full w-full` do contêiner (o pai define o tamanho); `viewBox="0 0 64 32"`, escala inteira pelo tamanho do contêiner.

### Conformidade com as Skills Padrão

- `frontend-design`: skyline em duas camadas, feixes ciano e magenta, janelas e dither da direção "Noite neon"; sem blur animado.
- `vercel-composition-patterns`: `PixelScene` é uma folha sem efeitos colaterais; o limite de erro é um detalhe interno.
- `vercel-react-best-practices`: valores estáticos em constantes de módulo; sem `Math.random()` (evita divergência de hidratação); `dither` num único `<path>` calculado uma vez.
- `tailwindcss`: só utilitários e `var(--color-*)`; nenhuma cor literal.
- `wcag-audit-patterns`: `aria-hidden="true"` e `focusable="false"`; a arte é decorativa (FR-010).
- `test-antipatterns`: testes por saída observável (DOM); a falha é injetada no hook, na fronteira.
- `no-workarounds`: sem supressão de `console.error` no código de produção; o teste silencia só o log esperado do React.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/components/ui/pixel-scene.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useSceneMotion } from "@/lib/hooks/use-scene-motion"
import { PixelScene, type PixelSceneName } from "./pixel-scene"

vi.mock("@/lib/hooks/use-scene-motion", () => ({
	useSceneMotion: vi.fn(),
}))

const SCENES: ReadonlyArray<PixelSceneName> = ["login", "hero", "empty"]

function motion(paused: boolean) {
	return { paused, userPaused: false, toggleUserPause: vi.fn() }
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe("PixelScene", () => {
	for (const scene of SCENES) {
		test(`cena ${scene}: renderiza um svg decorativo com skyline, janelas e feixes`, () => {
			vi.mocked(useSceneMotion).mockReturnValue(motion(false))
			const { container } = render(<PixelScene scene={scene} animated />)
			const svg = container.querySelector("svg")
			expect(svg).toHaveAttribute("aria-hidden", "true")
			expect(svg).toHaveAttribute("focusable", "false")
			expect(svg).toHaveAttribute("shape-rendering", "crispEdges")
			expect(svg).toHaveAttribute("data-scene", scene)
			expect(container.querySelectorAll(".pixel-scene-beam").length).toBeGreaterThan(0)
			expect(container.querySelectorAll(".pixel-scene-window").length).toBeGreaterThan(0)
			expect(container.querySelectorAll("rect").length).toBeGreaterThan(10)
		})

		test(`cena ${scene}: todo retângulo usa coordenadas inteiras e cor só por token`, () => {
			vi.mocked(useSceneMotion).mockReturnValue(motion(false))
			const { container } = render(<PixelScene scene={scene} />)
			for (const rect of Array.from(container.querySelectorAll("rect"))) {
				for (const attribute of ["x", "y", "width", "height"]) {
					const raw = rect.getAttribute(attribute)
					expect(Number.isInteger(Number(raw)), `${attribute}=${raw}`).toBe(true)
				}
			}
			for (const painted of Array.from(container.querySelectorAll("[fill]"))) {
				expect(painted.getAttribute("fill")).toMatch(/^var\(--color-[a-z0-9-]+\)$/)
			}
		})

		test(`cena ${scene}: duas renderizações produzem exatamente o mesmo DOM`, () => {
			vi.mocked(useSceneMotion).mockReturnValue(motion(false))
			const first = render(<PixelScene scene={scene} animated />)
			const second = render(<PixelScene scene={scene} animated />)
			expect(first.container.innerHTML).toBe(second.container.innerHTML)
		})
	}

	test("não usa Math.random na renderização", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const random = vi.spyOn(Math, "random")
		render(<PixelScene scene="login" animated />)
		expect(random).not.toHaveBeenCalled()
	})

	test("animated com hook livre: data-paused é false", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const { container } = render(<PixelScene scene="hero" animated />)
		expect(container.querySelector("svg")).toHaveAttribute("data-paused", "false")
	})

	test("animated com o hook pausado: data-paused é true", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(true))
		const { container } = render(<PixelScene scene="hero" animated />)
		expect(container.querySelector("svg")).toHaveAttribute("data-paused", "true")
	})

	test("sem animated a cena é estática mesmo com o hook livre", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const { container } = render(<PixelScene scene="hero" />)
		expect(container.querySelector("svg")).toHaveAttribute("data-paused", "true")
	})

	test("repassa className ao svg", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const { container } = render(<PixelScene scene="empty" className="opacity-60" />)
		expect(container.querySelector("svg")).toHaveClass("pixel-scene", "opacity-60")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/components/ui/pixel-scene.test.tsx`
Expected: FAIL com `Failed to resolve import "./pixel-scene"`.

- **Step 3: Write minimal implementation**

Criar `apps/frontend/src/components/ui/pixel-scene.tsx`:

```tsx
"use client"

import { useRef } from "react"
import { cn } from "@/lib/cn"
import { useSceneMotion } from "@/lib/hooks/use-scene-motion"

export type PixelSceneName = "login" | "hero" | "empty"

export interface PixelSceneProps {
	scene: PixelSceneName
	animated?: boolean
	className?: string
}

type Building = readonly [x: number, top: number, width: number]
type Point = readonly [x: number, y: number]
type BeamTone = "accent" | "primary"

interface Beam {
	x: number
	width: number
	tone: BeamTone
}

interface SceneDefinition {
	far: ReadonlyArray<Building>
	near: ReadonlyArray<Building>
	windowsAccent: ReadonlyArray<Point>
	windowsPrimary: ReadonlyArray<Point>
	beams: ReadonlyArray<Beam>
}

const VIEWBOX_WIDTH = 64
const VIEWBOX_HEIGHT = 32

const FAR_SKYLINE: ReadonlyArray<Building> = [
	[0, 16, 8],
	[8, 12, 6],
	[14, 18, 10],
	[24, 10, 7],
	[31, 15, 9],
	[40, 11, 8],
	[48, 17, 7],
	[55, 13, 9],
]

const NEAR_SKYLINE: ReadonlyArray<Building> = [
	[0, 22, 10],
	[10, 18, 7],
	[17, 24, 9],
	[26, 20, 8],
	[34, 25, 8],
	[42, 19, 9],
	[51, 23, 6],
	[57, 17, 7],
]

const WINDOWS_ACCENT: ReadonlyArray<Point> = [
	[2, 24],
	[5, 26],
	[12, 20],
	[14, 23],
	[20, 26],
	[28, 22],
	[30, 25],
	[36, 27],
	[44, 21],
	[47, 24],
	[53, 25],
	[59, 19],
	[61, 22],
]

const WINDOWS_PRIMARY: ReadonlyArray<Point> = [
	[3, 29],
	[13, 21],
	[45, 26],
	[58, 24],
]

const SCENES: Record<PixelSceneName, SceneDefinition> = {
	login: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT,
		windowsPrimary: WINDOWS_PRIMARY,
		beams: [
			{ x: 12, width: 4, tone: "accent" },
			{ x: 40, width: 3, tone: "primary" },
		],
	},
	hero: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 8),
		windowsPrimary: WINDOWS_PRIMARY.slice(0, 2),
		beams: [
			{ x: 20, width: 4, tone: "accent" },
			{ x: 50, width: 3, tone: "primary" },
		],
	},
	empty: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 4),
		windowsPrimary: [],
		beams: [{ x: 28, width: 5, tone: "accent" }],
	},
}

const TONE_FILL: Record<BeamTone, string> = {
	accent: "var(--color-accent)",
	primary: "var(--color-primary)",
}

// Dither 1x1 em xadrez nas quatro linhas de baixo, num único <path> determinístico.
function buildDitherPath(): string {
	const cells: string[] = []
	for (let y = VIEWBOX_HEIGHT - 4; y < VIEWBOX_HEIGHT; y += 1) {
		for (let x = y % 2; x < VIEWBOX_WIDTH; x += 2) {
			cells.push(`M${x} ${y}h1v1h-1z`)
		}
	}
	return cells.join("")
}

const DITHER_PATH = buildDitherPath()

function Skyline({
	buildings,
	fill,
}: {
	buildings: ReadonlyArray<Building>
	fill: string
}) {
	return (
		<>
			{buildings.map(([x, top, width]) => (
				<rect
					key={`${x}-${top}`}
					x={x}
					y={top}
					width={width}
					height={VIEWBOX_HEIGHT - top}
					fill={fill}
				/>
			))}
		</>
	)
}

function Windows({
	points,
	fill,
	delayOffset,
}: {
	points: ReadonlyArray<Point>
	fill: string
	delayOffset: number
}) {
	return (
		<>
			{points.map(([x, y], index) => (
				<rect
					key={`${x}-${y}`}
					className="pixel-scene-window"
					x={x}
					y={y}
					width={1}
					height={1}
					fill={fill}
					style={{ animationDelay: `${((index + delayOffset) % 5) * 0.8}s` }}
				/>
			))}
		</>
	)
}

function SceneArt({
	scene,
	animated,
	className,
}: {
	scene: PixelSceneName
	animated: boolean
	className?: string
}) {
	const ref = useRef<SVGSVGElement>(null)
	const { paused } = useSceneMotion(ref)
	const definition = SCENES[scene]

	return (
		<svg
			ref={ref}
			viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
			preserveAspectRatio="xMidYMax slice"
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
			data-scene={scene}
			data-paused={!animated || paused}
			className={cn("pixel-scene block h-full w-full", className)}
		>
			<rect
				x={0}
				y={0}
				width={VIEWBOX_WIDTH}
				height={VIEWBOX_HEIGHT}
				fill="var(--color-surface)"
			/>
			{definition.beams.map((beam) => (
				<g key={`${beam.tone}-${beam.x}`} className="pixel-scene-beam">
					<rect
						x={beam.x}
						y={0}
						width={beam.width}
						height={VIEWBOX_HEIGHT}
						fill={TONE_FILL[beam.tone]}
						fillOpacity={0.18}
						transform="skewX(-20)"
					/>
				</g>
			))}
			<Skyline buildings={definition.far} fill="var(--color-surface-3)" />
			<Skyline buildings={definition.near} fill="var(--color-surface-2)" />
			<Windows
				points={definition.windowsAccent}
				fill="var(--color-accent)"
				delayOffset={0}
			/>
			<Windows
				points={definition.windowsPrimary}
				fill="var(--color-primary)"
				delayOffset={2}
			/>
			<path d={DITHER_PATH} fill="var(--color-background)" fillOpacity={0.5} />
		</svg>
	)
}

export function PixelScene({
	scene,
	animated = false,
	className,
}: PixelSceneProps) {
	return <SceneArt scene={scene} animated={animated} className={className} />
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/components/ui/pixel-scene.test.tsx`
Expected: PASS

- **Step 5: Review Focus: Cena inválida ou erro ao renderizar `PixelScene` → tela normal com fundo liso, sem quebrar a página — Write the failing test**

Acrescentar ao `describe("PixelScene", ...)` do arquivo de teste:

```tsx
	test("cena inválida: mostra o fundo liso e a página segue normal", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		render(
			<main>
				<h1>Página normal</h1>
				{/* @ts-expect-error cena inválida em tempo de execução (dado vindo de fora do tipo) */}
				<PixelScene scene="desconhecida" animated />
			</main>,
		)
		expect(screen.getByRole("heading", { name: "Página normal" })).toBeInTheDocument()
		const fallback = screen.getByTestId("pixel-scene-fallback")
		expect(fallback).toHaveAttribute("aria-hidden", "true")
		expect(document.querySelector("svg")).toBeNull()
	})

	test("erro ao renderizar a cena: o limite de erro mostra o fundo liso sem derrubar a página", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
		vi.mocked(useSceneMotion).mockImplementation(() => {
			throw new Error("falha simulada ao renderizar a cena")
		})
		render(
			<main>
				<h1>Página normal</h1>
				<PixelScene scene="login" animated className="opacity-60" />
			</main>,
		)
		expect(screen.getByRole("heading", { name: "Página normal" })).toBeInTheDocument()
		expect(screen.getByTestId("pixel-scene-fallback")).toHaveClass("opacity-60")
		expect(document.querySelector("svg")).toBeNull()
	})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend test src/components/ui/pixel-scene.test.tsx -t "cena inválida|erro ao renderizar"`
Expected: FAIL. Cena inválida: `TypeError: Cannot read properties of undefined (reading 'beams')`; erro ao renderizar: o `Error("falha simulada ao renderizar a cena")` do hook sobe sem limite de erro e derruba a árvore.

- **Step 7: Write minimal implementation**

Em `pixel-scene.tsx`, trocar o import de `react` por `import { Component, type ReactNode, useRef } from "react"` e substituir a função `PixelScene` final por:

```tsx
function SceneFallback({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			data-testid="pixel-scene-fallback"
			className={cn("h-full w-full bg-surface-2", className)}
		/>
	)
}

interface BoundaryProps {
	children: ReactNode
	className?: string
}

interface BoundaryState {
	failed: boolean
}

class PixelSceneBoundary extends Component<BoundaryProps, BoundaryState> {
	state: BoundaryState = { failed: false }

	static getDerivedStateFromError(): BoundaryState {
		return { failed: true }
	}

	render(): ReactNode {
		if (this.state.failed) {
			return <SceneFallback className={this.props.className} />
		}
		return this.props.children
	}
}

export function PixelScene({
	scene,
	animated = false,
	className,
}: PixelSceneProps) {
	if (!Object.hasOwn(SCENES, scene)) {
		return <SceneFallback className={className} />
	}
	return (
		<PixelSceneBoundary className={className}>
			<SceneArt scene={scene} animated={animated} className={className} />
		</PixelSceneBoundary>
	)
}
```

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend test src/components/ui/pixel-scene.test.tsx`
Expected: PASS

- **Step 9: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/pixel-scene.tsx apps/frontend/src/components/ui/pixel-scene.test.tsx
git commit -m "feat(frontend): PixelScene estático com fallback de erro"
```

## Critérios de Sucesso

- Cada cena (`login`, `hero`, `empty`) renderiza um SVG `aria-hidden` com retângulos de coordenadas inteiras e cores só por token; duas renderizações produzem o mesmo DOM e `Math.random` não é usado (FR-010).
- `data-paused` reflete `!animated || paused` do `useSceneMotion`.
- Cena inválida ou erro de renderização mostra `div[data-testid="pixel-scene-fallback"]` liso e a página continua (FR-011).
