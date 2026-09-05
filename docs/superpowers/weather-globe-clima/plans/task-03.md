# Task 3: `WeatherGlobe` — esqueleto, hook de capacidade e fallback estático acessível [FR-005, FR-006, FR-007]

**Status:** DONE
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria o componente `WeatherGlobe`, que renderiza o globo 3D decorativo via `react-globe.gl`
(dependência ainda não instalada no monorepo) ou, quando WebGL não está disponível no navegador
ou `prefers-reduced-motion: reduce` está ativo, um fallback estático simples com as mesmas cores
do mockup. Ambos os ramos são marcados como puramente decorativos para tecnologia assistiva
(`aria-hidden="true"`) e, quando o globo real é renderizado, ele recebe
`enablePointerInteraction={false}` para não capturar foco/interação. Esta task não implementa
ainda rotação automática nem animação de câmera (Task 4) nem `ErrorBoundary`/cleanup (Task 5) —
só o esqueleto de detecção + fallback.

A decisão "globo real vs. fallback" mora num **hook nomeado** próprio,
`useGlobeCapability()` (arquivo `use-globe-capability.ts`, ao lado do componente), que retorna
`"webgl" | "fallback"`. Esse hook é o seam de injeção da feature: sem ele, a detecção ficaria
inline no componente e o caminho interativo seria impossível de exercitar em teste, porque
`happy-dom` sempre reporta WebGL indisponível (`canvas.getContext("webgl")` → `null`). Com o
hook isolado, os testes de renderização do componente (aqui e nas Tasks 4/5) apenas stubam o
módulo do hook, e a detecção real é testada uma única vez, no teste do próprio hook. O padrão
segue o precedente real do repo em `apps/frontend/src/lib/hooks/use-is-desktop.ts`: estado em
`useState`, `matchMedia(...)` assinado por evento `change` no `useEffect` (não leitura única na
montagem) e cleanup removendo o listener — assim uma mudança de `prefers-reduced-motion` durante
a sessão também é respeitada.

`react-globe.gl` não está instalada em nenhum `package.json` do monorepo, mas o pacote publica
types oficiais (`dist/react-globe.gl.d.ts`, verificado na versão 2.38.0): o export default é
`Globe: FCwithRef<GlobeProps, GlobeMethods>`, com `ref?: MutableRefObject<GlobeMethods | undefined>`,
e `GlobeProps` inclui `width`, `height`, `backgroundColor`, `globeMaterial`,
`enablePointerInteraction` e `pointsData`. Os types importam de `three` e
`three/examples/jsm/controls/OrbitControls.js`; como o pacote `three` (0.185.x) **não** publica
types próprios, `@types/three` é necessário para o `tsc:check` passar (ver Step 1).

## Arquivos

- Create: `apps/frontend/src/features/weather/components/use-globe-capability.ts`
- Test: `apps/frontend/src/features/weather/components/use-globe-capability.test.ts`
- Create: `apps/frontend/src/features/weather/components/weather-globe.tsx`
- Test: `apps/frontend/src/features/weather/components/weather-globe.test.tsx`
- Modify: `apps/frontend/package.json` (novas dependências `react-globe.gl` e `three`,
  devDependency `@types/three`)

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: a detecção de suporte (WebGL/`prefers-reduced-motion`) roda em `useEffect` dentro de `useGlobeCapability` (efeito colateral que depende do browser), com estado inicial seguro (`"fallback"`) para não assumir suporte antes da checagem, e assinatura do evento `change` do `matchMedia` com cleanup — mesmo padrão de `lib/hooks/use-is-desktop.ts`.
- `vercel-composition-patterns`: `WeatherGlobe` isola a decisão "globo real vs. fallback" atrás de uma única API de componente (`WeatherGlobeProps`) e de um único hook (`useGlobeCapability`), preparando o terreno para a Task 5 envolver isso num `ErrorBoundary` sem vazar detalhes de implementação para quem consome o componente.
- `wcag-audit-patterns`: elemento puramente decorativo exige `aria-hidden="true"` em ambos os ramos (globo real e fallback) e não deve ser alcançável por teclado nem por leitor de tela — é exatamente o requisito desta task (FR-007).
- `typescript-advanced`: tipagem de `WeatherGlobeProps` e do retorno do hook (`GlobeCapability = "webgl" | "fallback"`) sem `any`; o ref e as props do `Globe` usam os types oficiais do pacote (`GlobeMethods`, `GlobeProps`), sem redefinir tipos locais.
- `tailwindcss`: dimensões e `border-radius` do fallback e do container do globo usam classes utilitárias (`h-32 w-32 rounded-full`), consistentes com a escala de radius do design system do frontend.
- `no-workarounds`: a detecção de WebGL deve realmente tentar criar um contexto (`canvas.getContext("webgl")`) — não pode assumir suporte via `navigator.userAgent` ou qualquer heurística indireta. O hook existe como seam de teste legítimo, não como atalho para "forçar" o caminho interativo em produção.
- `test-antipatterns`: o teste do hook mocka apenas as bordas reais do ambiente (`HTMLCanvasElement.prototype.getContext`, `window.matchMedia` via `vi.stubGlobal`); o teste do componente mocka o módulo `react-globe.gl` (biblioteca pesada de WebGL) e o módulo `./use-globe-capability` (colaborador com dependência de ambiente, testado separadamente) — nenhum dos dois mocka o próprio `WeatherGlobe` sendo testado.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-globe-clima-visual.md` (baseline de layout/spacing/hierarquia/tokens).
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** cor primária `#39e58c` (marcador e brilho); fundo do globo em gradiente radial escuro (`#123a2c` → `#061410` → `#020403`) com brilho externo sutil `rgba(57, 229, 140, 0.18)`; globo como hero, sempre visível, acima da busca; auto-rotação por padrão e animação até a cidade buscada (comportamento entregue na Task 4, não nesta).
- **Dimensionamento (fechado nesta task):** `GLOBE_SIZE_PX = 128` — o mockup indica ~120px de diâmetro para a coluna de ~448px, e 128px é o valor equivalente na escala do Tailwind (`h-32 w-32`), evitando um número fora da escala. Esse valor é passado **explicitamente** como `width`/`height` ao `<Globe>` (o default do `react-globe.gl` é o viewport inteiro, que quebraria o layout da coluna) e é o mesmo número que a Task 6 usa na altura do wrapper reservado antes do carregamento do chunk. Mudar o tamanho exige mudar os dois lugares juntos.
- **Superfície do globo (fechado no spec, D1 "Fechamento adicional — textura do globo"):** sem `globeImageUrl`/textura fotográfica; superfície via `globeMaterial` (`MeshPhongMaterial` na cor `#061410`) e o mesmo gradiente radial do fallback aplicado ao container do globo real — nenhuma requisição de rede para asset de textura.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Este mockup é o único norte de layout disponível (sem fonte de design original nem ferramenta de
design-to-code configurada neste repo). Confirme com o usuário se existe uma fonte de design
original antes de prosseguir; na ausência de uma, implemente manualmente a partir do mockup
curado, reaproveitando as decisões já registradas acima sem re-derivá-las.

- **Step 1: Instalar as dependências**

Run: `pnpm --filter frontend add react-globe.gl three`
Run: `pnpm --filter frontend add -D @types/three`
Expected: `react-globe.gl` e `three` em `dependencies` de `apps/frontend/package.json`,
`@types/three` em `devDependencies`, e o lockfile do monorepo atualizado. `three` é dependência
direta porque o componente importa `MeshPhongMaterial` para o `globeMaterial`; `@types/three` é
necessário porque o pacote `three` não publica types próprios e o `.d.ts` do `react-globe.gl`
importa de `three` e de `three/examples/jsm/controls/OrbitControls.js`.

- **Step 2: Write the failing test**

Crie `apps/frontend/src/features/weather/components/use-globe-capability.test.ts` — é aqui
(e só aqui) que a detecção real de ambiente é exercitada:

```tsx
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useGlobeCapability } from "./use-globe-capability"

function stubMatchMedia(initialMatches: boolean) {
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	const mediaQueryList = {
		matches: initialMatches,
		addEventListener: (
			_type: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.add(listener)
		},
		removeEventListener: (
			_type: string,
			listener: (event: MediaQueryListEvent) => void,
		) => {
			listeners.delete(listener)
		},
	}
	vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mediaQueryList))
	return function emitChange(matches: boolean) {
		mediaQueryList.matches = matches
		for (const listener of listeners) {
			listener({ matches } as MediaQueryListEvent)
		}
	}
}

function stubWebgl(available: boolean) {
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
		available ? ({} as unknown as RenderingContext) : null,
	)
}

describe("useGlobeCapability", () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	test("retorna 'webgl' quando WebGL está disponível e reduced-motion não está ativo", () => {
		stubWebgl(true)
		stubMatchMedia(false)

		const { result } = renderHook(() => useGlobeCapability())

		expect(result.current).toBe("webgl")
	})

	test("retorna 'fallback' quando WebGL não está disponível", () => {
		stubWebgl(false)
		stubMatchMedia(false)

		const { result } = renderHook(() => useGlobeCapability())

		expect(result.current).toBe("fallback")
	})

	test("retorna 'fallback' quando prefers-reduced-motion está ativo mesmo com WebGL disponível", () => {
		stubWebgl(true)
		stubMatchMedia(true)

		const { result } = renderHook(() => useGlobeCapability())

		expect(result.current).toBe("fallback")
	})

	test("passa para 'fallback' quando o usuário ativa prefers-reduced-motion depois da montagem", () => {
		stubWebgl(true)
		const emitChange = stubMatchMedia(false)

		const { result } = renderHook(() => useGlobeCapability())
		act(() => {
			emitChange(true)
		})

		expect(result.current).toBe("fallback")
	})
})
```

Crie `apps/frontend/src/features/weather/components/weather-globe.test.tsx` — aqui a
capacidade é stubada pelo hook, nunca pelo ambiente:

```tsx
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { WeatherGlobe } from "./weather-globe"

const { globePropsSpy, useGlobeCapabilityMock } = vi.hoisted(() => ({
	globePropsSpy: vi.fn(),
	useGlobeCapabilityMock: vi.fn(),
}))

vi.mock("./use-globe-capability", () => ({
	useGlobeCapability: useGlobeCapabilityMock,
}))

vi.mock("react-globe.gl", () => ({
	default: (props: Record<string, unknown>) => {
		globePropsSpy(props)
		return <div data-testid="mock-globe" />
	},
}))

describe("WeatherGlobe", () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		globePropsSpy.mockClear()
		useGlobeCapabilityMock.mockReset()
	})

	test("renderiza fallback estático com aria-hidden quando a capacidade é 'fallback'", () => {
		useGlobeCapabilityMock.mockReturnValue("fallback")

		render(<WeatherGlobe />)

		expect(screen.getByTestId("weather-globe-fallback")).toHaveAttribute(
			"aria-hidden",
			"true",
		)
	})

	test("renderiza o globo interativo com aria-hidden e enablePointerInteraction desativado quando a capacidade é 'webgl'", () => {
		useGlobeCapabilityMock.mockReturnValue("webgl")

		render(<WeatherGlobe />)

		expect(screen.getByTestId("weather-globe-canvas")).toHaveAttribute(
			"aria-hidden",
			"true",
		)
		expect(globePropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({ enablePointerInteraction: false }),
		)
	})

	test("renderiza o globo sem textura externa, usando globeMaterial sólido", () => {
		useGlobeCapabilityMock.mockReturnValue("webgl")

		render(<WeatherGlobe />)

		const globeProps = globePropsSpy.mock.calls[0][0]
		expect(globeProps.globeImageUrl).toBeUndefined()
		expect(globeProps.globeMaterial).toBeDefined()
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/use-globe-capability.test.ts src/features/weather/components/weather-globe.test.tsx`
Expected: FAIL — `Failed to resolve import "./use-globe-capability"` e
`Failed to resolve import "./weather-globe"` (nem o hook nem o componente existem ainda).

- **Step 4: Write minimal implementation**

```tsx
// apps/frontend/src/features/weather/components/use-globe-capability.ts
"use client"

import { useEffect, useState } from "react"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export type GlobeCapability = "webgl" | "fallback"

function isWebglSupported(): boolean {
	try {
		const canvas = document.createElement("canvas")
		return Boolean(canvas.getContext("webgl") ?? canvas.getContext("webgl2"))
	} catch {
		return false
	}
}

function resolveCapability(prefersReducedMotion: boolean): GlobeCapability {
	if (prefersReducedMotion) return "fallback"
	return isWebglSupported() ? "webgl" : "fallback"
}

export function useGlobeCapability(): GlobeCapability {
	const [capability, setCapability] = useState<GlobeCapability>("fallback")

	useEffect(() => {
		const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY)
		const handleChange = (event: MediaQueryListEvent) => {
			setCapability(resolveCapability(event.matches))
		}
		setCapability(resolveCapability(mediaQueryList.matches))
		mediaQueryList.addEventListener("change", handleChange)
		return () => mediaQueryList.removeEventListener("change", handleChange)
	}, [])

	return capability
}
```

```tsx
// apps/frontend/src/features/weather/components/weather-globe.tsx
"use client"

import { useMemo } from "react"
import Globe from "react-globe.gl"
import { MeshPhongMaterial } from "three"
import { useGlobeCapability } from "./use-globe-capability"

const GLOBE_SIZE_PX = 128
const GLOBE_SURFACE_COLOR = "#061410"

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

export function WeatherGlobe(_props: WeatherGlobeProps) {
	const capability = useGlobeCapability()
	const globeMaterial = useMemo(
		() => new MeshPhongMaterial({ color: GLOBE_SURFACE_COLOR }),
		[],
	)

	if (capability !== "webgl") {
		return <WeatherGlobeFallback />
	}

	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-canvas"
			className="mx-auto h-32 w-32 overflow-hidden rounded-full"
			style={GLOBE_BACKGROUND_STYLE}
		>
			<Globe
				width={GLOBE_SIZE_PX}
				height={GLOBE_SIZE_PX}
				backgroundColor="rgba(0,0,0,0)"
				globeMaterial={globeMaterial}
				enablePointerInteraction={false}
			/>
		</div>
	)
}
```

Nenhum `globeImageUrl` é passado: a superfície vem do `globeMaterial` sólido e o gradiente
radial/glow do mockup vem do container (o mesmo `GLOBE_BACKGROUND_STYLE` do fallback), sem
nenhuma requisição de rede — decisão fechada em D1 do spec.

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/use-globe-capability.test.ts src/features/weather/components/weather-globe.test.tsx`
Expected: PASS (os 4 testes de `useGlobeCapability` + os 3 testes de `WeatherGlobe`).

- **Step 6: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml apps/frontend/src/features/weather/components/use-globe-capability.ts apps/frontend/src/features/weather/components/use-globe-capability.test.ts apps/frontend/src/features/weather/components/weather-globe.tsx apps/frontend/src/features/weather/components/weather-globe.test.tsx
git commit -m "feat(weather): adiciona esqueleto do WeatherGlobe com fallback acessível"
```

## Critérios de Sucesso

- `useGlobeCapability()` retorna `"fallback"` quando `canvas.getContext("webgl")` retorna `null`
  [FR-005] e quando `window.matchMedia("(prefers-reduced-motion: reduce)").matches` é `true`
  mesmo com WebGL disponível [FR-006]; retorna `"webgl"` só quando as duas condições são
  favoráveis.
- `useGlobeCapability()` reage a uma mudança posterior de `prefers-reduced-motion` (evento
  `change` do `matchMedia`), não apenas à leitura na montagem, e remove o listener no cleanup
  [FR-006].
- `WeatherGlobe` renderiza o `Globe` de `react-globe.gl` com `enablePointerInteraction={false}`
  quando o hook retorna `"webgl"` [FR-005, FR-007], e o fallback estático quando retorna
  `"fallback"` [FR-005, FR-006] — a decisão vem exclusivamente do hook, que é o seam stubado
  pelos testes das Tasks 4 e 5.
- O `<Globe>` recebe `width`/`height` explícitos (`GLOBE_SIZE_PX = 128`), nunca o default de
  viewport inteiro; o mesmo número é usado pela Task 6 no wrapper reservado.
- Nenhum `globeImageUrl`/textura externa é usado: a superfície vem de `globeMaterial`
  (`MeshPhongMaterial` sólido) e o gradiente/glow do mockup é aplicado ao container tanto do
  globo real quanto do fallback (D1 do spec).
- Ambos os ramos (globo real e fallback) têm `aria-hidden="true"` [FR-007].
- `react-globe.gl` e `three` estão declaradas em `apps/frontend/package.json`, com
  `@types/three` em `devDependencies`.
