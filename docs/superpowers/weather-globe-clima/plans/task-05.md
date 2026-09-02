# Task 5: Criar globo 3D interativo view-only [FR-001, FR-002, FR-003, FR-007, FR-008, FR-013]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** capable
**Depends on:** task-02, task-04

## Visão Geral

Cria o componente interativo do globo 3D usado em `/clima`. É dividido em duas peças, seguindo o mesmo padrão já usado no repositório para mapas client-only (`apps/frontend/src/features/gyms/components/gym-location-picker.tsx` + `leaflet-map.tsx`): `weather-globe.tsx` decide, no client, entre renderizar o fallback estático da Task 4 (`prefers-reduced-motion` ativo ou WebGL indisponível) ou carregar via `next/dynamic` (`ssr: false`) o `weather-globe-canvas.tsx`, que contém a cena `@react-three/fiber` real — esfera, marcador posicionado com `latLonToVector3`, rotação inicial calculada com `rotationForCoordinate` (Task 2) e controles manuais view-only (arrastar para girar, roda do mouse para zoom, botão para resetar), sem alterar cidade, URL, query ativa ou disparar nova busca (FR-008).

## Arquivos

- Create: `apps/frontend/src/features/weather/components/weather-globe.tsx`
- Create: `apps/frontend/src/features/weather/components/weather-globe-canvas.tsx`
- Test: `apps/frontend/src/features/weather/components/weather-globe.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: a detecção de WebGL e `prefers-reduced-motion` deve ser real (via `matchMedia`/`HTMLCanvasElement.getContext`), não um `true`/`false` fixo; os controles de câmera não podem alterar estado fora do componente (cidade/URL/query).
- `test-antipatterns`: o teste de `weather-globe.tsx` mocka apenas o módulo pesado (`./weather-globe-canvas`, via `vi.mock`, mesmo padrão de `gym-location-picker.test.tsx`), não a lógica de decisão do próprio componente sob teste.
- `typescript-advanced`: props e estado tipados explicitamente (`WeatherGlobeProps`, `GlobeRotation` de `globe-coordinates.ts`), sem `any` fora dos limites estritamente necessários (ex.: cast de contexto WebGL em teste).
- `vercel-react-best-practices`: `@react-three/fiber`/`three` só entram no bundle client-only via `dynamic(..., { ssr: false })`; `weather-globe.tsx` (o wrapper) não importa `three` diretamente, mantendo o chunk pesado isolado do restante da página.
- `tailwindcss`: painel do globo usa os mesmos tokens do mockup (`border-border`, radius `~22px`) já usados no fallback da Task 4, para manter consistência visual entre os dois estados.
- `vitest`: teste cobre as três decisões (reduced motion, WebGL indisponível, ambos disponíveis) sem depender de renderização real de WebGL.
- `impeccable`: preservar a intenção visual do mockup (globo escuro, marcador único, texto de destino) na variante interativa.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-globe-clima-visual.md` (bloco `.globe-panel`, `.globe`, `.marker`).
- **Fonte de design original:** nenhuma; mockup criado no Visual Companion (ver nota de fonte no próprio arquivo do mockup).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? Caso a resposta seja não, seguir o mockup curado como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `impeccable` disponível para revisão de fidelidade visual; browser/Playwright disponíveis via skill `playwright-cli` para validar visualmente a interação de arrastar/zoom/resetar, caso necessário.
- **Decisões visuais já tomadas (não refazer):** painel escuro (`#080808`), radius grande (~`22px`), borda `border-border`, marcador único em `#ffb443`, texto "Destino selecionado: {city}" sempre visível sobre o canvas — reaproveitar exatamente o mesmo texto/posição usados no fallback da Task 4.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a subseção `### Fidelidade Visual` acima. Não há fonte de design original além do mockup curado — confirme isso com o usuário antes de prosseguir. Como não há ferramenta de design-to-code configurada neste ambiente para esta tela, construa manualmente a partir do HTML/tokens do mockup e reaproveite as decisões visuais já usadas no `WeatherGlobeFallback` (Task 4) para manter os dois estados visualmente equivalentes.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/weather/components/weather-globe.test.tsx
import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { WeatherGlobe } from "./weather-globe"

vi.mock("./weather-globe-canvas", () => ({
	WeatherGlobeCanvas: ({ city }: { city: string }) => (
		<div data-testid="mock-weather-globe-canvas">{city}</div>
	),
}))

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({
			matches,
			media: "(prefers-reduced-motion: reduce)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		} as unknown as MediaQueryList),
	)
}

function stubWebglAvailable(available: boolean) {
	if (!available) {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
		return
	}
	vi.stubGlobal("WebGLRenderingContext", class {})
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		// biome-ignore lint/suspicious/noExplicitAny: stub de contexto WebGL para teste
		{} as any,
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe("WeatherGlobe", () => {
	test("renderiza o fallback estático quando prefers-reduced-motion está ativo", () => {
		stubReducedMotion(true)
		stubWebglAvailable(true)

		renderWithProviders(
			<WeatherGlobe city="Lisboa" latitude={38.7223} longitude={-9.1393} />,
		)

		expect(
			screen.getByLabelText("Mapa estático centrado em Lisboa"),
		).toBeInTheDocument()
	})

	test("renderiza o fallback estático quando WebGL não está disponível", () => {
		stubReducedMotion(false)
		stubWebglAvailable(false)

		renderWithProviders(
			<WeatherGlobe city="Lisboa" latitude={38.7223} longitude={-9.1393} />,
		)

		expect(
			screen.getByLabelText("Mapa estático centrado em Lisboa"),
		).toBeInTheDocument()
	})

	test("carrega o canvas interativo quando WebGL está disponível e não há reduced-motion", async () => {
		stubReducedMotion(false)
		stubWebglAvailable(true)

		renderWithProviders(
			<WeatherGlobe city="Lisboa" latitude={38.7223} longitude={-9.1393} />,
		)

		await waitFor(() =>
			expect(
				screen.getByTestId("mock-weather-globe-canvas"),
			).toBeInTheDocument(),
		)
		expect(screen.getByText("Lisboa")).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe.test.tsx`
Expected: FAIL with "Failed to resolve import \"./weather-globe\"" (nem `weather-globe.tsx` nem `weather-globe-canvas.tsx` existem ainda)

- **Step 3: Write minimal implementation (canvas 3D)**

```tsx
// apps/frontend/src/features/weather/components/weather-globe-canvas.tsx
"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type * as THREE from "three"
import {
	type GlobeRotation,
	latLonToVector3,
	rotationForCoordinate,
} from "@/features/weather/lib/globe-coordinates"

export interface WeatherGlobeCanvasProps {
	city: string
	latitude: number
	longitude: number
}

const GLOBE_RADIUS = 1
const MARKER_RADIUS = GLOBE_RADIUS * 1.02
const MIN_ZOOM = 2.2
const MAX_ZOOM = 4.5
const INITIAL_ZOOM = 3.2
const ROTATION_DRAG_SPEED = 0.005
const ZOOM_WHEEL_SPEED = 0.002

function CameraRig({ zoom }: { zoom: number }) {
	const { camera } = useThree()
	useFrame(() => {
		camera.position.z = zoom
	})
	return null
}

function GlobeGroup({
	latitude,
	longitude,
	rotation,
}: {
	latitude: number
	longitude: number
	rotation: GlobeRotation
}) {
	const groupRef = useRef<THREE.Group>(null)
	const markerPosition = useMemo(
		() => latLonToVector3(latitude, longitude, MARKER_RADIUS),
		[latitude, longitude],
	)

	useFrame(() => {
		if (!groupRef.current) return
		groupRef.current.rotation.x = rotation.x
		groupRef.current.rotation.y = rotation.y
	})

	return (
		<group ref={groupRef}>
			<mesh>
				<sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
				<meshStandardMaterial
					color="#161616"
					emissive="#1d1d1d"
					emissiveIntensity={0.15}
				/>
			</mesh>
			<mesh>
				<sphereGeometry args={[GLOBE_RADIUS, 16, 16]} />
				<meshBasicMaterial
					color="#2a2a2a"
					wireframe
					transparent
					opacity={0.4}
				/>
			</mesh>
			<mesh
				position={[markerPosition.x, markerPosition.y, markerPosition.z]}
			>
				<sphereGeometry args={[0.045, 12, 12]} />
				<meshBasicMaterial color="#ffb443" />
			</mesh>
		</group>
	)
}

export function WeatherGlobeCanvas({
	city,
	latitude,
	longitude,
}: WeatherGlobeCanvasProps) {
	const [rotation, setRotation] = useState<GlobeRotation>(() =>
		rotationForCoordinate(latitude, longitude),
	)
	const [zoom, setZoom] = useState(INITIAL_ZOOM)
	const dragOrigin = useRef<{ x: number; y: number } | null>(null)

	useEffect(() => {
		setRotation(rotationForCoordinate(latitude, longitude))
		setZoom(INITIAL_ZOOM)
	}, [latitude, longitude])

	function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
		dragOrigin.current = { x: event.clientX, y: event.clientY }
	}

	function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
		if (!dragOrigin.current) return
		const deltaX = event.clientX - dragOrigin.current.x
		const deltaY = event.clientY - dragOrigin.current.y
		dragOrigin.current = { x: event.clientX, y: event.clientY }
		setRotation((current) => ({
			x: current.x + deltaY * ROTATION_DRAG_SPEED,
			y: current.y + deltaX * ROTATION_DRAG_SPEED,
		}))
	}

	function handlePointerUp() {
		dragOrigin.current = null
	}

	function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
		setZoom((current) =>
			Math.min(
				MAX_ZOOM,
				Math.max(MIN_ZOOM, current + event.deltaY * ZOOM_WHEEL_SPEED),
			),
		)
	}

	function handleReset() {
		setRotation(rotationForCoordinate(latitude, longitude))
		setZoom(INITIAL_ZOOM)
	}

	return (
		<div
			aria-label={`Mapa 3D centrado em ${city}`}
			className="relative aspect-[16/9] w-full touch-none overflow-hidden rounded-[22px] border border-border bg-[#080808]"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
			onWheel={handleWheel}
		>
			<Canvas
				dpr={[1, 1.5]}
				camera={{ position: [0, 0, INITIAL_ZOOM], fov: 45 }}
			>
				<ambientLight intensity={0.6} />
				<directionalLight position={[2, 2, 3]} intensity={0.8} />
				<CameraRig zoom={zoom} />
				<GlobeGroup
					latitude={latitude}
					longitude={longitude}
					rotation={rotation}
				/>
			</Canvas>
			<button
				type="button"
				onClick={handleReset}
				className="absolute bottom-3 right-3 rounded-[14px] border border-border bg-card px-3 py-1.5 text-xs text-foreground"
			>
				Resetar visualização
			</button>
			<p className="absolute left-3 top-3 text-xs text-muted-foreground">
				Destino selecionado: {city}
			</p>
		</div>
	)
}
```

- **Step 4: Write minimal implementation (wrapper client-only)**

```tsx
// apps/frontend/src/features/weather/components/weather-globe.tsx
"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { WeatherGlobeFallback } from "./weather-globe-fallback"

const WeatherGlobeCanvas = dynamic(
	() =>
		import("./weather-globe-canvas").then((mod) => ({
			default: mod.WeatherGlobeCanvas,
		})),
	{ ssr: false },
)

export interface WeatherGlobeProps {
	city: string
	latitude: number
	longitude: number
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function getPrefersReducedMotion(): boolean {
	if (typeof window === "undefined" || !window.matchMedia) return false
	return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function isWebglAvailable(): boolean {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return false
	}
	try {
		const canvas = document.createElement("canvas")
		return Boolean(
			window.WebGLRenderingContext &&
				(canvas.getContext("webgl") ||
					canvas.getContext("experimental-webgl")),
		)
	} catch {
		return false
	}
}

function useShouldRenderStaticFallback(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
		getPrefersReducedMotion,
	)
	const [webglAvailable] = useState<boolean>(isWebglAvailable)

	useEffect(() => {
		const mql = window.matchMedia(REDUCED_MOTION_QUERY)
		const handleChange = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches)
		}
		setPrefersReducedMotion(mql.matches)
		mql.addEventListener("change", handleChange)
		return () => mql.removeEventListener("change", handleChange)
	}, [])

	return prefersReducedMotion || !webglAvailable
}

export function WeatherGlobe({ city, latitude, longitude }: WeatherGlobeProps) {
	const shouldRenderStaticFallback = useShouldRenderStaticFallback()

	if (shouldRenderStaticFallback) {
		return (
			<WeatherGlobeFallback
				city={city}
				latitude={latitude}
				longitude={longitude}
			/>
		)
	}

	return (
		<WeatherGlobeCanvas city={city} latitude={latitude} longitude={longitude} />
	)
}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe.test.tsx`
Expected: PASS (3 tests)

- **Step 6: Commit** *(sequential execution only — em wave paralela, pule este passo e reporte os arquivos alterados ao orquestrador.)*

```bash
git add apps/frontend/src/features/weather/components/weather-globe.tsx \
  apps/frontend/src/features/weather/components/weather-globe-canvas.tsx \
  apps/frontend/src/features/weather/components/weather-globe.test.tsx
git commit -m "feat(weather): add interactive view-only 3D globe with static fallback"
```

## Critérios de Sucesso

- `WeatherGlobe` renderiza `WeatherGlobeFallback` quando `prefers-reduced-motion` está ativo ou WebGL está indisponível, e carrega `WeatherGlobeCanvas` via `next/dynamic` (`ssr: false`) apenas quando ambos permitem animação.
- `WeatherGlobeCanvas` posiciona o marcador com `latLonToVector3` e a rotação inicial com `rotationForCoordinate`, ambos de `globe-coordinates.ts`.
- Arrastar (`pointer*`) gira o globo e a roda do mouse ajusta o zoom dentro de `[MIN_ZOOM, MAX_ZOOM]`; nenhuma dessas interações chama roteamento, altera `city`/query ou dispara nova consulta — nenhum handler recebe `router`/`onSearch`.
- O botão "Resetar visualização" restaura rotação e zoom iniciais sem alterar `city`/`latitude`/`longitude`.
- Os testes passam isoladamente com `npx vitest run src/features/weather/components/weather-globe.test.tsx`.
