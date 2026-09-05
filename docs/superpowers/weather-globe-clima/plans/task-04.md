# Task 4: `WeatherGlobe` — rotação automática e animação de câmera até a busca [FR-001, FR-003, FR-009, FR-012, FR-013]

**Status:** DONE
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** task-03

## Visão Geral

> **Nota (2026-09-05, task-08):** `enableRotate = false` descrito nesta task foi revertido
> por D5.1 da spec — a revisão de textura/rotação manual liga `enableRotate = true`,
> mantendo `enableZoom`/`enablePan` em `false`. Esta task registra o estado histórico em
> que foi implementada; o estado atual do código está em `task-08.md`.

Estende `weather-globe.tsx` (criado na Task 3) para: (1) ativar auto-rotação do globo e
desabilitar arrastar/zoom/pan (`controls().enableZoom/enablePan/enableRotate = false`, mantendo
`controls().enabled = true`) sempre que o ramo
interativo está montado (FR-001); (2) animar a câmera até `latitude`/`longitude` via
`globeRef.current.pointOfView({ lat, lng, altitude }, ms)` sempre que essas props mudam (FR-003);
(3) renderizar um marcador simples na cor primária (`#39e58c`) na coordenada buscada; (4) sem
`latitude`/`longitude` (antes de qualquer busca), o globo gira sem marcador (FR-012); (5) uma
nova busca sempre sobrescreve o alvo de câmera anterior — não há fila, garantido pela própria
natureza do `useEffect` com essas dependências (FR-013); (6) quando uma busca falhar, o componente
pai (Task 6) simplesmente não atualiza `latitude`/`longitude`, então o globo mantém a última
posição válida sem lógica de erro própria (FR-009).

A API imperativa usada aqui vem dos types oficiais publicados pelo pacote
(`react-globe.gl/dist/react-globe.gl.d.ts`, verificado na versão 2.38.0):

```ts
interface GlobeMethods {
	pointOfView(): GeoCoords
	pointOfView(pov: { lat?: number; lng?: number; altitude?: number }, transitionMs?: number): GlobeInstance
	renderer(): WebGLRenderer
	controls(): OrbitControls
	// ...
}
declare const Globe: FCwithRef<GlobeProps, GlobeMethods> // ref?: MutableRefObject<GlobeMethods | undefined>
export type { GlobeMethods, GlobeProps }
```

Portanto **não** se define nenhum tipo local para o ref: importe `type GlobeMethods` do próprio
pacote e use `useRef<GlobeMethods | undefined>(undefined)` — `MutableRefObject<GlobeMethods | null>`
não é atribuível ao `ref` do componente (`null` ≠ `undefined`). `controls()` é tipado como
`OrbitControls` do Three.js, então `autoRotate`, `autoRotateSpeed`, `enabled`, `enableZoom`,
`enablePan` e `enableRotate` são propriedades tipadas, sem cast.

Além da auto-rotação, o mesmo efeito desabilita arrastar/zoom/pan com
`enableZoom = false`, `enablePan = false` e `enableRotate = false`:
`enablePointerInteraction={false}` (Task 3) cobre apenas o rastreamento de ponteiro para
hover/click/tooltip, não o arrastar/zoom dos `OrbitControls`. `controls().enabled` **precisa
continuar `true`**: o `three-render-objects` só chama `controls.update()` enquanto `enabled` é
`true`, e a auto-rotação do `OrbitControls` só é aplicada dentro de `update()` — desligar `enabled`
mataria o giro automático (ver D5 do spec). Os três flags acima gateiam apenas os event handlers de
mouse/touch, então desligá-los mata a interação sem matar a rotação.

## Arquivos

- Modify: `apps/frontend/src/features/weather/components/weather-globe.tsx`
- Modify: `apps/frontend/src/features/weather/components/weather-globe.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: dois `useEffect` distintos e com dependências corretas — um para ligar a auto-rotação ao montar o ramo interativo, outro para animar a câmera reagindo só a mudanças de `latitude`/`longitude` — evita re-execuções desnecessárias e mantém cada efeito com uma única responsabilidade.
- `typescript-advanced`: o ref imperativo usa o type oficial exportado pelo pacote — `import Globe, { type GlobeMethods } from "react-globe.gl"` + `useRef<GlobeMethods | undefined>(undefined)` — sem `any` e sem redefinir tipos locais que divergiriam da API real.
- `tanstack-query-best-practices`: embora esta task não chame `useQuery` diretamente, o design de `WeatherGlobeProps` (props derivadas do resultado de uma query, sem estado próprio de "buscando") é o padrão correto para consumir dados de uma query do componente pai sem duplicar cache/estado — relevante para como a Task 6 vai alimentar `latitude`/`longitude`.
- `no-workarounds`: a "sobrescrita" da busca mais recente (FR-013) deve vir naturalmente da dependência do `useEffect` em `[latitude, longitude]` — não implementar uma fila, debounce ou cancelamento manual que não é pedido pelo requisito.
- `test-antipatterns`: o mock de `react-globe.gl` expõe apenas os métodos imperativos realmente usados (`pointOfView`, `controls`, `renderer`) via `useImperativeHandle` — não mocka `WeatherGlobe` em si, e os asserts verificam o comportamento observável (chamada de `pointOfView` com os argumentos esperados), não detalhes internos do mock. O caminho interativo é habilitado stubando o hook `useGlobeCapability` (criado na Task 3) para retornar `"webgl"`; sem esse seam o teste seria impossível, porque `happy-dom` sempre reporta WebGL indisponível — a detecção real continua coberta pelo teste do próprio hook.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Sem fonte de design original nem ferramenta configurada neste repo (mesma situação da Task 3).
Esta task não adiciona elementos visuais novos além do marcador na cor `#39e58c` já decidida no
mockup — reaproveitar essa decisão, sem redefinir tokens.

- **Step 1: Write the failing test**

Substitua o bloco de mock de `react-globe.gl` no topo de
`apps/frontend/src/features/weather/components/weather-globe.test.tsx` (a versão da Task 3 não
suporta `ref`), mantendo o `vi.mock("./use-globe-capability", ...)` já criado lá, e adicione os
novos testes ao describe existente:

```tsx
import { forwardRef, useImperativeHandle } from "react"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { WeatherGlobe } from "./weather-globe"

const {
	globePropsSpy,
	useGlobeCapabilityMock,
	pointOfViewMock,
	controlsState,
	rendererMock,
} = vi.hoisted(() => ({
	globePropsSpy: vi.fn(),
	useGlobeCapabilityMock: vi.fn(),
	pointOfViewMock: vi.fn(),
	controlsState: {
		autoRotate: false,
		autoRotateSpeed: 0,
		enabled: true,
		enableZoom: true,
		enablePan: true,
		enableRotate: true,
	},
	rendererMock: vi.fn(() => ({ forceContextLoss: vi.fn(), dispose: vi.fn() })),
}))

vi.mock("./use-globe-capability", () => ({
	useGlobeCapability: useGlobeCapabilityMock,
}))

vi.mock("react-globe.gl", () => ({
	default: forwardRef(function MockGlobe(
		props: Record<string, unknown>,
		ref: React.Ref<unknown>,
	) {
		globePropsSpy(props)
		useImperativeHandle(ref, () => ({
			pointOfView: pointOfViewMock,
			controls: () => controlsState,
			renderer: rendererMock,
		}))
		return <div data-testid="mock-globe" />
	}),
}))

function mockWebglSupported() {
	useGlobeCapabilityMock.mockReturnValue("webgl")
}

describe("WeatherGlobe", () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		globePropsSpy.mockClear()
		useGlobeCapabilityMock.mockReset()
		pointOfViewMock.mockClear()
		rendererMock.mockClear()
		controlsState.autoRotate = false
		controlsState.autoRotateSpeed = 0
		controlsState.enabled = true
		controlsState.enableZoom = true
		controlsState.enablePan = true
		controlsState.enableRotate = true
	})

	// ... os 3 testes da Task 3 (fallback quando a capacidade é "fallback", globo interativo
	// com enablePointerInteraction, globo sem textura externa) continuam aqui, inalterados —
	// eles já usam `useGlobeCapabilityMock`.

	test("ativa auto-rotação e desabilita arrastar/zoom/pan ao montar o ramo interativo", () => {
		mockWebglSupported()

		render(<WeatherGlobe />)

		expect(controlsState.autoRotate).toBe(true)
		expect(controlsState.autoRotateSpeed).toBe(0.4)
		expect(controlsState.enableZoom).toBe(false)
		expect(controlsState.enablePan).toBe(false)
		expect(controlsState.enableRotate).toBe(false)
		// `enabled` precisa continuar `true`, senão o loop de update nunca aplica a rotação.
		expect(controlsState.enabled).toBe(true)
	})

	test("anima a câmera até a coordenada buscada quando latitude/longitude são informadas", () => {
		mockWebglSupported()

		render(<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />)

		expect(pointOfViewMock).toHaveBeenCalledWith(
			{ lat: -23.5505, lng: -46.6333, altitude: 1.5 },
			1000,
		)
	})

	test("não anima a câmera e não renderiza marcador quando latitude/longitude não são informadas", () => {
		mockWebglSupported()

		render(<WeatherGlobe />)

		expect(pointOfViewMock).not.toHaveBeenCalled()
		expect(globePropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({ pointsData: [] }),
		)
	})

	test("uma nova busca sobrescreve o alvo de câmera anterior sem enfileirar chamadas", () => {
		mockWebglSupported()

		const { rerender } = render(
			<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />,
		)
		rerender(<WeatherGlobe latitude={-22.9068} longitude={-43.1729} />)

		expect(pointOfViewMock).toHaveBeenLastCalledWith(
			{ lat: -22.9068, lng: -43.1729, altitude: 1.5 },
			1000,
		)
	})

	test("uma busca que falha (props não mudam) mantém a última posição sem nova chamada a pointOfView", () => {
		mockWebglSupported()

		const { rerender } = render(
			<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />,
		)
		pointOfViewMock.mockClear()
		rerender(<WeatherGlobe latitude={-23.5505} longitude={-46.6333} />)

		expect(pointOfViewMock).not.toHaveBeenCalled()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe.test.tsx`
Expected: FAIL nos 5 novos testes — `controlsState.autoRotate` continua `false`,
`controlsState.enableZoom/enablePan/enableRotate` continuam `true` e `pointOfViewMock` nunca é
chamado, porque
`WeatherGlobe` ainda não usa `ref`/`useEffect` para isso.

- **Step 3: Write minimal implementation**

```tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import Globe, { type GlobeMethods } from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import { useGlobeCapability } from "./use-globe-capability"

const GLOBE_SIZE_PX = 128
const GLOBE_SURFACE_COLOR = "#061410"
const CAMERA_ALTITUDE = 1.5
const CAMERA_TRANSITION_MS = 1000
const AUTO_ROTATE_SPEED = 0.4
const MARKER_COLOR = "#39e58c"

const GLOBE_BACKGROUND_STYLE = {
	background:
		"radial-gradient(circle at center, #123a2c 0%, #061410 55%, #020403 100%)",
	boxShadow: "0 0 24px 4px rgba(57, 229, 140, 0.18)",
}

export interface WeatherGlobeProps {
	latitude?: number
	longitude?: number
}

export function WeatherGlobeFallback() {
	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-fallback"
			className="mx-auto h-32 w-32 rounded-full"
			style={GLOBE_BACKGROUND_STYLE}
		/>
	)
}

export function WeatherGlobe({ latitude, longitude }: WeatherGlobeProps) {
	const capability = useGlobeCapability()
	const globeRef = useRef<GlobeMethods | undefined>(undefined)
	const globeMaterial = useMemo(
		() => new MeshPhongMaterial({ color: GLOBE_SURFACE_COLOR }),
		[],
	)

	useEffect(() => {
		if (capability !== "webgl") return
		const globe = globeRef.current
		if (!globe) return
		const controls = globe.controls()
		controls.autoRotate = true
		controls.autoRotateSpeed = AUTO_ROTATE_SPEED
		// `controls.enabled` continua `true`: o loop de render só chama
		// `controls.update()` com os controles habilitados, e é dentro de `update()`
		// que a auto-rotação é aplicada. Só os handlers de mouse/touch são desligados.
		controls.enableZoom = false
		controls.enablePan = false
		controls.enableRotate = false
	}, [capability])

	useEffect(() => {
		if (capability !== "webgl") return
		const globe = globeRef.current
		if (!globe) return
		if (latitude === undefined || longitude === undefined) return
		globe.pointOfView(
			{ lat: latitude, lng: longitude, altitude: CAMERA_ALTITUDE },
			CAMERA_TRANSITION_MS,
		)
	}, [capability, latitude, longitude])

	if (capability !== "webgl") {
		return <WeatherGlobeFallback />
	}

	const markerData =
		latitude === undefined || longitude === undefined
			? []
			: [{ lat: latitude, lng: longitude }]

	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-canvas"
			className="mx-auto h-32 w-32 overflow-hidden rounded-full"
			style={GLOBE_BACKGROUND_STYLE}
		>
			<Globe
				ref={globeRef}
				width={GLOBE_SIZE_PX}
				height={GLOBE_SIZE_PX}
				backgroundColor="rgba(0,0,0,0)"
				globeMaterial={globeMaterial}
				enablePointerInteraction={false}
				pointsData={markerData}
				pointColor={() => MARKER_COLOR}
				pointRadius={0.4}
				pointAltitude={0.01}
			/>
		</div>
	)
}
```

Notas de tipo (verificadas contra `react-globe.gl@2.38.0`): o ref é
`useRef<GlobeMethods | undefined>(undefined)` — o componente é declarado como
`FCwithRef<GlobeProps, GlobeMethods>` com `ref?: MutableRefObject<GlobeMethods | undefined>`, e
um `useRef<... | null>(null)` **não** é atribuível a isso. `controls()` retorna `OrbitControls`
(type real do Three.js), então `autoRotate`/`autoRotateSpeed`/`enableZoom`/`enablePan`/
`enableRotate` existem tipados. A
checagem `if (!globe) return` continua idêntica — só a fonte do valor mudou de `null` para
`undefined`.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe.test.tsx`
Expected: PASS (os 3 testes da Task 3 continuam passando + os 5 novos testes desta task, total
8).

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/weather/components/weather-globe.tsx apps/frontend/src/features/weather/components/weather-globe.test.tsx
git commit -m "feat(weather): adiciona auto-rotação e animação de câmera ao WeatherGlobe"
```

## Critérios de Sucesso

- O ramo interativo do `WeatherGlobe` ativa `controls().autoRotate = true` ao montar, sem
  depender de `latitude`/`longitude` [FR-001].
- O mesmo efeito seta `controls().enableZoom = false`, `enablePan = false` e `enableRotate = false`,
  desabilitando arrastar/zoom de verdade (`enablePointerInteraction={false}` sozinho só desliga
  hover/click/tooltip), e **mantém `controls().enabled = true`** — desligar `enabled` impediria o
  `controls.update()` do loop e mataria junto a auto-rotação [FR-001, FR-007, D5 do spec].
- O ref imperativo usa o type oficial `GlobeMethods` (`useRef<GlobeMethods | undefined>(undefined)`),
  sem nenhum tipo local redefinido para a instância do globo.
- Quando `latitude`/`longitude` mudam (nova busca com sucesso), `pointOfView({ lat, lng, altitude:
  1.5 }, 1000)` é chamado com os novos valores [FR-003].
- Sem `latitude`/`longitude`, nenhum marcador é renderizado (`pointsData` vazio) e
  `pointOfView` nunca é chamado [FR-012].
- Uma nova busca (novas `latitude`/`longitude`) sempre sobrescreve o alvo de câmera anterior —
  `pointOfView` é chamado apenas com o valor mais recente, sem fila [FR-013].
- Quando as props não mudam entre re-renderizações (equivalente a uma busca que falhou e não
  atualizou o resultado), `pointOfView` não é chamado novamente — a última posição válida é
  preservada [FR-009].
- Quando as props voltam a `undefined` (busca pendente ou com erro) **durante** a transição de
  câmera, o efeito retoma `controls().autoRotate = true` no caminho sem alvo — a auto-rotação
  nunca fica desligada permanentemente [FR-001, FR-009].
