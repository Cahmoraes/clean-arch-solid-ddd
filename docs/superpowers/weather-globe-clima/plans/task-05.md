# Task 5: `WeatherGlobe` — `ErrorBoundary` local, perda de contexto WebGL e cleanup no unmount [FR-008, FR-010]

**Status:** DONE
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** task-03, task-04

## Visão Geral

Três garantias de robustez, ainda ausentes: (1) um erro em tempo de execução dentro do globo
(por exemplo, uma falha do `react-globe.gl`/Three.js) não pode derrubar o restante da página,
incluindo a exibição da temperatura — isso exige um `ErrorBoundary` local, o primeiro do repo
(`class extends React.Component` com `getDerivedStateFromError`/`componentDidCatch`), que
renderiza o mesmo fallback estático da Task 3/4 quando captura uma exceção; (2) o modo de falha
dominante do WebGL — **perda de contexto GPU** (aba em background por muito tempo, driver
reiniciado, limite de contextos do navegador atingido) — não passa pelo ciclo de render do React
e portanto **não** é capturado pelo `ErrorBoundary`: o canvas simplesmente congela. Para cobri-lo,
o componente escuta o evento nativo `webglcontextlost` no canvas (`renderer().domElement`) e troca
para o mesmo fallback estático; (3) ao desmontar, o efeito que liga a auto-rotação (Task 4)
precisa desfazer o que fez e liberar o contexto WebGL, para não deixar recursos gráficos presos.

`WeatherGlobe` passa a ser exportado, para o consumo externo (Task 6), como o componente já
envolto pelo `ErrorBoundary` — o boundary reexporta com o mesmo nome `WeatherGlobe` para que o
import dinâmico da Task 6 não precise saber que existe um boundary por baixo.

**Restrição de ciclo de vida (não violar na Task 6):** o componente do globo nunca deve ser
remontado a cada nova busca. Nada de `key={city}`/`key={\`${latitude}-${longitude}\`}` no ponto de
consumo: cada montagem cria um novo contexto WebGL, e navegadores limitam o número de contextos
simultâneos (tipicamente ~8-16) — remontar por busca esgota esse limite e derruba o globo (e,
potencialmente, outros canvases da aba). A coordenada muda **por prop**, e a câmera reage por
efeito imperativo (`pointOfView`), exatamente como na Task 4.

## Arquivos

- Create: `apps/frontend/src/features/weather/components/weather-globe-error-boundary.tsx`
- Create: `apps/frontend/src/features/weather/components/weather-globe-error-boundary.test.tsx`
- Modify: `apps/frontend/src/features/weather/components/weather-globe.tsx`
- Modify: `apps/frontend/src/features/weather/components/weather-globe.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: `ErrorBoundary` de classe é a única forma suportada pelo React para capturar erros de renderização de uma subárvore (hooks não substituem isso) — usar exatamente a API mínima (`getDerivedStateFromError` + `componentDidCatch`), sem estado ou lógica além do necessário para trocar para o fallback.
- `typescript-advanced`: o `ErrorBoundary` reutiliza o tipo `WeatherGlobeProps` já definido em `weather-globe.tsx` (via `type` import) para expor exatamente a mesma API pública que `WeatherGlobe`, sem duplicar a interface.
- `no-workarounds`: o cleanup no unmount deve chamar os métodos reais de liberação expostos pelo `react-globe.gl`/Three.js (`renderer().forceContextLoss()`), não um `window.location.reload()` ou remoção manual de nós do DOM como substituto de uma liberação de contexto WebGL real. A instância do globo é **capturada em variável local no setup do efeito** (`const globe = globeRef.current`) e é essa variável que o cleanup usa — ler `globeRef.current` dentro do cleanup é frágil, porque o React já pode ter desanexado o ref (`undefined`) quando ele roda.
- `test-antipatterns`: o teste do `ErrorBoundary` mocka o módulo `./weather-globe` inteiro para forçar um `throw` controlado (não usa `try/catch` manual nem espera um erro "de verdade" do `react-globe.gl`); o teste de cleanup do `weather-globe.test.tsx` assere sobre o mesmo `forceContextLossMock` estável exposto pelo mock do módulo (a instância que o componente capturou), não sobre um mock de ref genérico recriado a cada chamada; o teste de perda de contexto dispara um `Event("webglcontextlost")` real no canvas exposto pelo mock, em vez de chamar o handler interno diretamente.

## Passos

- **Step 1: Write the failing test**

Crie `apps/frontend/src/features/weather/components/weather-globe-error-boundary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("./weather-globe", () => ({
	WeatherGlobe: () => {
		throw new Error("falha simulada no WeatherGlobe")
	},
	WeatherGlobeFallback: () => (
		<div aria-hidden="true" data-testid="weather-globe-fallback" />
	),
}))

import { WeatherGlobe } from "./weather-globe-error-boundary"

describe("WeatherGlobeErrorBoundary", () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	test("renderiza o fallback estático quando o WeatherGlobe lança uma exceção em tempo de execução", () => {
		vi.spyOn(console, "error").mockImplementation(() => {})

		render(<WeatherGlobe />)

		expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()
	})
})
```

Em `apps/frontend/src/features/weather/components/weather-globe.test.tsx`, o mock de
`react-globe.gl` da Task 4 precisa expor um `forceContextLoss` **estável** e um canvas estável
como `renderer().domElement` (o alvo do listener de `webglcontextlost`). Ajuste o bloco
`vi.hoisted` e o `afterEach`:

```tsx
const {
	globePropsSpy,
	useGlobeCapabilityMock,
	pointOfViewMock,
	controlsState,
	forceContextLossMock,
	globeCanvas,
	rendererMock,
} = vi.hoisted(() => {
	const forceContextLossMock = vi.fn()
	const globeCanvas = document.createElement("canvas")
	return {
		globePropsSpy: vi.fn(),
		useGlobeCapabilityMock: vi.fn(),
		pointOfViewMock: vi.fn(),
		controlsState: { autoRotate: false, autoRotateSpeed: 0, enabled: true },
		forceContextLossMock,
		globeCanvas,
		rendererMock: vi.fn(() => ({
			forceContextLoss: forceContextLossMock,
			domElement: globeCanvas,
		})),
	}
})
```

(no `afterEach`, acrescente `forceContextLossMock.mockClear()` às limpezas já existentes.)

Adicione então, ao describe existente, os dois novos testes:

```tsx
test("libera o contexto WebGL e desativa a auto-rotação ao desmontar", () => {
	mockWebglSupported()

	const { unmount } = render(<WeatherGlobe />)
	unmount()

	expect(forceContextLossMock).toHaveBeenCalledTimes(1)
	expect(controlsState.autoRotate).toBe(false)
})

test("troca para o fallback estático quando o contexto WebGL é perdido", () => {
	mockWebglSupported()

	render(<WeatherGlobe />)
	act(() => {
		globeCanvas.dispatchEvent(new Event("webglcontextlost"))
	})

	expect(screen.getByTestId("weather-globe-fallback")).toBeInTheDocument()
	expect(screen.queryByTestId("weather-globe-canvas")).not.toBeInTheDocument()
})
```

(`act` vem de `@testing-library/react` — acrescente-o ao import já existente no arquivo.)

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe-error-boundary.test.tsx`
Expected: FAIL — `Failed to resolve import "./weather-globe-error-boundary"` (o arquivo ainda não
existe).

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe.test.tsx`
Expected: FAIL nos dois novos testes — `forceContextLossMock` nunca é chamado e
`controlsState.autoRotate` continua `true` após o `unmount` (o `useEffect` de auto-rotação ainda
não retorna uma função de cleanup); e o `webglcontextlost` não troca nada, porque ainda não há
listener nem estado de perda de contexto.

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/features/weather/components/weather-globe-error-boundary.tsx
"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import {
	WeatherGlobe as WeatherGlobeImpl,
	WeatherGlobeFallback,
	type WeatherGlobeProps,
} from "./weather-globe"

interface WeatherGlobeErrorBoundaryState {
	hasError: boolean
}

class WeatherGlobeErrorBoundary extends Component<
	WeatherGlobeProps,
	WeatherGlobeErrorBoundaryState
> {
	public state: WeatherGlobeErrorBoundaryState = { hasError: false }

	public static getDerivedStateFromError(): WeatherGlobeErrorBoundaryState {
		return { hasError: true }
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("WeatherGlobe falhou ao renderizar", error, errorInfo)
	}

	public render(): ReactNode {
		if (this.state.hasError) {
			return <WeatherGlobeFallback />
		}
		return <WeatherGlobeImpl {...this.props} />
	}
}

export { WeatherGlobeErrorBoundary as WeatherGlobe }
export type { WeatherGlobeProps }
```

Em `weather-globe.tsx` (a partir do estado definido na Task 4), adicione o cleanup no `useEffect`
de auto-rotação — capturando a instância no **setup**, nunca lendo `globeRef.current` dentro do
cleanup — e um segundo efeito para o `webglcontextlost`:

```tsx
	const [hasLostContext, setHasLostContext] = useState(false)

	useEffect(() => {
		if (capability !== "webgl") return
		const globe = globeRef.current
		if (!globe) return
		const controls = globe.controls()
		controls.autoRotate = true
		controls.autoRotateSpeed = AUTO_ROTATE_SPEED
		controls.enabled = false
		return () => {
			controls.autoRotate = false
			globe.renderer().forceContextLoss()
		}
	}, [capability])

	useEffect(() => {
		if (capability !== "webgl") return
		const globe = globeRef.current
		if (!globe) return
		const canvas = globe.renderer().domElement
		const handleContextLost = () => setHasLostContext(true)
		canvas.addEventListener("webglcontextlost", handleContextLost)
		return () => canvas.removeEventListener("webglcontextlost", handleContextLost)
	}, [capability])
```

E troque a condição de fallback para cobrir também a perda de contexto:

```tsx
	if (capability !== "webgl" || hasLostContext) {
		return <WeatherGlobeFallback />
	}
```

`globe` e `controls` são as referências capturadas no setup do efeito: quando o cleanup roda, o
React já pode ter desanexado o ref (`globeRef.current === undefined`), então ler o ref lá dentro
perderia a chamada de liberação silenciosamente. `renderer()` é tipado como `WebGLRenderer`
(type oficial de `GlobeMethods`), então `forceContextLoss()` e `domElement` existem sem optional
chaining nem cast. O `useState` volta ao import de `react` em `weather-globe.tsx` (a Task 4
deixou o arquivo só com `useEffect`/`useMemo`/`useRef`).

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe-error-boundary.test.tsx`
Expected: PASS.

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe.test.tsx`
Expected: PASS (os 8 testes já existentes + os 2 novos, total 10).

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/weather/components/weather-globe-error-boundary.tsx apps/frontend/src/features/weather/components/weather-globe-error-boundary.test.tsx apps/frontend/src/features/weather/components/weather-globe.tsx apps/frontend/src/features/weather/components/weather-globe.test.tsx
git commit -m "feat(weather): adiciona ErrorBoundary e cleanup de contexto WebGL ao WeatherGlobe"
```

## Critérios de Sucesso

- Um erro lançado durante a renderização do `WeatherGlobe` interativo é capturado pelo
  `ErrorBoundary` e substituído pelo fallback estático, sem propagar a exceção para o restante da
  árvore de componentes (o card de clima continua renderizável) [FR-008].
- Um `webglcontextlost` disparado no canvas (`renderer().domElement`) troca o globo pelo fallback
  estático sem nenhum erro de render — o modo de falha que o `ErrorBoundary` sozinho não alcança
  [FR-008]; o listener é removido no cleanup do efeito.
- Ao desmontar o componente, `renderer().forceContextLoss()` é chamado e `controls().autoRotate`
  é definido como `false`, liberando o contexto WebGL e interrompendo o loop de animação
  [FR-010]. A instância usada no cleanup é a capturada no setup do efeito (`const globe =
  globeRef.current`), não uma leitura de `globeRef.current` dentro do cleanup.
- O componente do globo não é remontado a cada busca: nenhum ponto de consumo (Task 6) usa `key`
  derivada de cidade/coordenada — a coordenada muda por prop e a câmera reage via `pointOfView`,
  preservando um único contexto WebGL durante toda a vida da página [FR-010].
- O módulo `weather-globe-error-boundary.tsx` exporta `WeatherGlobe` (o boundary já envolvendo o
  componente real) como export nomeado, mantendo a mesma API pública (`WeatherGlobeProps`) do
  componente interno.
