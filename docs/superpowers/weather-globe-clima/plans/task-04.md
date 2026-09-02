# Task 4: Criar fallback estático acessível do globo [FR-006, FR-009, FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Quando `prefers-reduced-motion` está ativo ou WebGL não está disponível, a página `/clima` precisa exibir uma versão estática e acessível do painel do globo: mesmo painel visual do mockup (`globe-panel`), sem rotação contínua, com o marcador da cidade posicionado por uma projeção equiretangular simples e o texto "Destino selecionado: {city}" sempre em texto real (não apenas visual). Este componente não depende de Three.js/`@react-three/fiber` nem do utilitário da Task 2 — é standalone e pode ser usado tanto pela Task 5 (fallback de WebGL) quanto isoladamente.

## Arquivos

- Create: `apps/frontend/src/features/weather/components/weather-globe-fallback.tsx`
- Test: `apps/frontend/src/features/weather/components/weather-globe-fallback.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: o posicionamento do marcador deve usar uma fórmula real de projeção (não um valor fixo tipo `top: 50%`), para refletir a coordenada recebida.
- `test-antipatterns`: testar o texto/atributos renderizados (comportamento observável), não a fórmula interna de posicionamento isolada do componente.
- `typescript-advanced`: props tipadas explicitamente (`city: string`, `latitude: number`, `longitude: number`), sem `any`.
- `vercel-react-best-practices`: componente puro e leve (sem estado, sem efeitos), seguro para renderizar em SSR já que não depende de `window`/Canvas.
- `tailwindcss`: usar os tokens do design system (`bg-card`, `border-border`, `text-muted-foreground`) em vez de cores hardcoded, mobile-first (painel ocupa `w-full` e usa `aspect-[16/9]` para manter proporção panorâmica em qualquer largura).
- `vitest`: testes de render com Testing Library validando texto e posição do marcador.
- `impeccable`: preservar a intenção visual do mockup (painel escuro, marcador destacado, texto de destino) mesmo na variante estática.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-globe-clima-visual.md` (bloco `.globe-panel` com `.globe`, `.marker` e o texto "Destino selecionado: {city}").
- **Fonte de design original:** nenhuma; mockup criado no Visual Companion (ver nota de fonte no próprio arquivo do mockup).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? Caso a resposta seja não, seguir o mockup curado como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `impeccable` disponível no repositório para revisão de fidelidade visual; browser/Playwright disponíveis via skill `playwright-cli` caso seja necessário validar visualmente a renderização.
- **Decisões visuais já tomadas (não refazer):** fundo escuro do painel (`#080808`/`bg-card`), marcador único em acento `#ffb443`/`warning`, radius grande (~`22px`) no painel, texto de destino sempre visível abaixo do globo — não redesenhar a paleta nem a hierarquia.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a subseção `### Fidelidade Visual` acima. Não há fonte de design original além do mockup curado (`../specs/mockups/weather-globe-clima-visual.md`) — confirme isso com o usuário antes de prosseguir. Como não há URL de ferramenta de design nem MCP de design-to-code configurado neste ambiente para esta tela, construa manualmente a partir do HTML/tokens do mockup, reutilizando as decisões visuais já tomadas (não redefinir cores, radius ou hierarquia).

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/weather/components/weather-globe-fallback.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { WeatherGlobeFallback } from "./weather-globe-fallback"

describe("WeatherGlobeFallback", () => {
	test("mostra o texto de destino selecionado com a cidade consultada", () => {
		render(
			<WeatherGlobeFallback
				city="Lisboa"
				latitude={38.7223}
				longitude={-9.1393}
			/>,
		)

		expect(
			screen.getByText("Destino selecionado: Lisboa"),
		).toBeInTheDocument()
	})

	test("expõe o painel com aria-label descrevendo o mapa estático da cidade", () => {
		render(
			<WeatherGlobeFallback
				city="Lisboa"
				latitude={38.7223}
				longitude={-9.1393}
			/>,
		)

		expect(
			screen.getByLabelText("Mapa estático centrado em Lisboa"),
		).toBeInTheDocument()
	})

	test("posiciona o marcador via projeção equiretangular a partir de lat/lon", () => {
		render(
			<WeatherGlobeFallback
				city="Lisboa"
				latitude={38.7223}
				longitude={-9.1393}
			/>,
		)

		const marker = screen.getByTestId("weather-globe-fallback-marker")
		expect(marker.style.left).toBe("47.461305555555555%")
		expect(marker.style.top).toBe("28.48761111111111%")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe-fallback.test.tsx`
Expected: FAIL with "Failed to resolve import \"./weather-globe-fallback\"" (o componente ainda não existe)

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/features/weather/components/weather-globe-fallback.tsx
import { cn } from "@/lib/cn"

export interface WeatherGlobeFallbackProps {
	city: string
	latitude: number
	longitude: number
	className?: string
}

/**
 * Projeção equiretangular simples: mapeia longitude [-180,180] para o eixo
 * horizontal [0,100]% e latitude [-90,90] para o eixo vertical [0,100]%,
 * suficiente para posicionar um único marcador estático sobre o painel.
 */
function markerPosition(
	latitude: number,
	longitude: number,
): { left: string; top: string } {
	const left = ((longitude + 180) / 360) * 100
	const top = ((90 - latitude) / 180) * 100
	return { left: `${left}%`, top: `${top}%` }
}

export function WeatherGlobeFallback({
	city,
	latitude,
	longitude,
	className,
}: WeatherGlobeFallbackProps) {
	const position = markerPosition(latitude, longitude)

	return (
		<div
			aria-label={`Mapa estático centrado em ${city}`}
			className={cn(
				"relative flex aspect-[16/9] w-full flex-col justify-end overflow-hidden rounded-[22px] border border-border bg-card p-4",
				className,
			)}
		>
			<div
				aria-hidden="true"
				className="absolute inset-4 rounded-full border border-border/60"
			/>
			<div
				data-testid="weather-globe-fallback-marker"
				aria-hidden="true"
				className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffb443]"
				style={position}
			/>
			<p className="relative text-sm text-muted-foreground">
				Destino selecionado: {city}
			</p>
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/features/weather/components/weather-globe-fallback.test.tsx`
Expected: PASS (3 tests)

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule este passo e reporte os arquivos alterados ao orquestrador.)*

```bash
git add apps/frontend/src/features/weather/components/weather-globe-fallback.tsx \
  apps/frontend/src/features/weather/components/weather-globe-fallback.test.tsx
git commit -m "feat(weather): add static accessible globe fallback panel"
```

## Critérios de Sucesso

- `WeatherGlobeFallback` renderiza sempre o texto "Destino selecionado: {city}" em texto real, visível independentemente de CSS/animação.
- O marcador é posicionado por uma fórmula de projeção real a partir de `latitude`/`longitude`, não por um valor fixo.
- O componente não importa `three`/`@react-three/fiber` nem acessa `window`/Canvas, podendo renderizar em SSR.
- Os testes passam isoladamente com `npx vitest run src/features/weather/components/weather-globe-fallback.test.tsx`.
