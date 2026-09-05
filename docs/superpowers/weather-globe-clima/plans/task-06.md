# Task 6: Integrar `WeatherGlobe` na página `/clima` via `next/dynamic({ ssr: false })` [FR-002]

**Status:** DONE
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** task-02, task-03, task-04, task-05

## Visão Geral

Integra o `WeatherGlobe` (já com fallback, rotação, animação de câmera, `ErrorBoundary` e cleanup
das tasks anteriores) na página pública `/clima`, carregado via `next/dynamic({ ssr: false })`
para manter o chunk de `react-globe.gl`/Three.js fora do bundle inicial da rota (D4 do spec). O
globo é renderizado acima do `WeatherSearchForm`, sempre visível, recebendo `latitude`/`longitude`
do resultado de `useWeatherQuery` (tipado via `@repo/api-types` desde a Task 2) quando há uma
busca com sucesso, e `undefined` quando ainda não houve busca ou a busca falhou — preservando o
comportamento de FR-009/FR-012 sem nenhuma lógica adicional na página.

O mock de `next/dynamic` usado nos testes do frontend
(`apps/frontend/src/test/mocks/next-dynamic.tsx`, aliasado em `vitest.config.ts`) só reconhece o
formato `{ default: Component }` — por isso o `import(...).then(...)` abaixo precisa envelopar o
export nomeado `WeatherGlobe` nesse formato, o que também é o padrão documentado do
`next/dynamic` real para módulos sem `export default`.

Duas consequências desse mock, que ditam o formato desta task:

1. **Ele executa o `import()` de verdade.** Sem interceptar o módulo do globo, o teste da página
   avaliaria `react-globe.gl`/Three.js dentro do `happy-dom`. Por isso o teste desta task faz
   `vi.mock(...)` do módulo carregado dinamicamente
   (`@/features/weather/components/weather-globe-error-boundary`), seguindo o precedente já
   existente no repo em
   `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx`, que faz
   `vi.mock("./leaflet-map", ...)` exatamente pelo mesmo motivo.
2. **Ele ignora a opção `loading`.** Reservar altura via `loading` seria invisível para o teste e
   não garantiria nada. A reserva de espaço é feita por um `div` wrapper de altura fixa em volta
   do componente dinâmico — presente no DOM independentemente do carregamento do chunk, e por
   isso verificável.

A altura reservada é **exatamente** a mesma da Task 3 (`GLOBE_SIZE_PX = 128`, `h-32 w-32`);
mudar o tamanho do globo exige mudar os dois lugares juntos.

O `WeatherGlobe` também **não** recebe `key` derivada de cidade/coordenada (ver Task 5): remontar
o componente a cada busca criaria um novo contexto WebGL por busca e esgotaria o limite de
contextos do navegador. As coordenadas mudam por prop.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/clima/page.tsx`
- Modify: `apps/frontend/src/app/(public)/clima/page.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: `next/dynamic({ ssr: false })` é o mecanismo correto do Next.js para isolar um componente client-only pesado (WebGL) do SSR e do bundle inicial; o espaço é reservado por um wrapper de altura fixa em volta do componente dinâmico (não pela opção `loading`, ignorada pelo mock de teste do repo), evitando layout shift enquanto o chunk carrega.
- `tanstack-query-best-practices`: `latitude`/`longitude` são derivados diretamente do `data` já retornado por `useWeatherQuery` (sem novo estado local nem nova query) — a página continua sendo a única responsável por orquestrar o resultado da busca.
- `tailwindcss`: o wrapper reservado usa a mesma classe utilitária de tamanho (`h-32 w-32`, equivalente ao `GLOBE_SIZE_PX = 128` da Task 3) do `WeatherGlobe` real, evitando reflow quando o chunk termina de carregar.
- `wcag-audit-patterns`: o wrapper reservado também precisa de `aria-hidden="true"` (é o mesmo elemento decorativo, só que antes do chunk carregar) — não introduzir um elemento focável/anunciado por leitor de tela nesse meio-tempo.
- `no-workarounds`: o `import(...).then((mod) => ({ default: mod.WeatherGlobe }))` é a forma correta de adaptar um export nomeado para `next/dynamic` — não trocar `WeatherGlobe` para `export default` só para simplificar essa linha (quebraria a convenção de exports nomeados do restante do repo).
- `test-antipatterns`: o teste novo usa MSW (via `server.use`) para simular a resposta real de `/weather` com `latitude`/`longitude`, sem mockar `useWeatherQuery` — o que se verifica aqui é o fluxo integrado da página. O único módulo mockado é o do globo, e por um motivo de ambiente, não de conveniência: o mock de `next/dynamic` do repo executa o `import()` real, e `react-globe.gl`/Three.js não roda em `happy-dom`. É a mesma fronteira que `gym-location-picker.test.tsx` já mocka para o mapa Leaflet. O comportamento interno do globo continua coberto pelos testes das Tasks 3-5.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-globe-clima-visual.md` (baseline de layout/spacing/hierarquia/tokens).
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** globo como hero, sempre visível, acima do formulário de busca, na coluna centralizada (~448px) já existente da página `/clima`; nenhuma alteração na ordem título → descrição → globo → busca → card de resultado.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Sem fonte de design original nem ferramenta configurada neste repo (mesma situação das Tasks 3 e
4). O único ajuste de layout desta task é inserir o globo, já pronto, entre o cabeçalho e o
`WeatherSearchForm` — reaproveitar a ordem e o espaçamento (`gap-8`) já definidos em `page.tsx`.

- **Step 1: Write the failing test**

Adicione em `apps/frontend/src/app/(public)/clima/page.test.tsx`, ao lado do
`vi.mock("next/navigation", ...)` que já existe no topo do arquivo, o mock do módulo do globo — o
mesmo módulo que a página carrega via `next/dynamic` (o mock de `next/dynamic` do repo executa o
`import()` de verdade, então sem isto o teste avaliaria `react-globe.gl` no `happy-dom`):

```tsx
vi.mock("@/features/weather/components/weather-globe-error-boundary", () => ({
	WeatherGlobe: ({
		latitude,
		longitude,
	}: {
		latitude?: number
		longitude?: number
	}) => (
		<div
			aria-hidden="true"
			data-testid="weather-globe"
			data-latitude={latitude ?? ""}
			data-longitude={longitude ?? ""}
		/>
	),
}))
```

Adicione então ao describe `WeatherPage` existente:

```tsx
test("renderiza o WeatherGlobe acima do formulário de busca sem regressão no fluxo existente", async () => {
	vi.mocked(useSearchParams).mockReturnValue(
		new URLSearchParams("city=São Paulo") as unknown as ReturnType<
			typeof useSearchParams
		>,
	)
	server.use(
		http.get(`${apiBaseUrl}/weather`, () =>
			HttpResponse.json(
				{
					city: "São Paulo",
					temperature: { current: 24, min: 18, max: 27 },
					latitude: -23.5505,
					longitude: -46.6333,
				},
				{ status: 200 },
			),
		),
	)

	renderWithProviders(<WeatherPage />)

	const globe = await screen.findByTestId("weather-globe")
	expect(globe).toBeInTheDocument()
	expect(screen.getByTestId("weather-globe-slot")).toBeInTheDocument()
	expect(await screen.findByText("24°C")).toBeInTheDocument()
	expect(screen.getByText("São Paulo")).toBeInTheDocument()
	expect(globe).toHaveAttribute("data-latitude", "-23.5505")
	expect(globe).toHaveAttribute("data-longitude", "-46.6333")
})
```

(O que esta task valida é que o globo é montado no lugar certo, recebe as coordenadas do
resultado da query e que o fluxo de busca/exibição de temperatura continua funcionando ao lado
dele — o comportamento interno do globo, incluindo o fallback, é coberto pelas Tasks 3-5.)

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run src/app/\(public\)/clima/page.test.tsx`
Expected: FAIL — `screen.findByTestId("weather-globe")` nunca resolve (timeout), porque
`WeatherPage` ainda não renderiza nenhum `WeatherGlobe`.

- **Step 3: Write minimal implementation**

```tsx
"use client"

import { useIsFetching } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { useWeatherQuery } from "@/features/weather/api/use-weather-query"
import { CurrentWeatherDisplay } from "@/features/weather/components/current-weather-display"
import { WeatherSearchForm } from "@/features/weather/components/weather-search-form"

// Mesma altura de GLOBE_SIZE_PX (128) em weather-globe.tsx — mudar os dois juntos.
const GLOBE_SLOT_CLASS = "mx-auto h-32 w-32"

const WeatherGlobe = dynamic(
	() =>
		import("@/features/weather/components/weather-globe-error-boundary").then(
			(mod) => ({ default: mod.WeatherGlobe }),
		),
	{ ssr: false },
)

function weatherErrorMessage(code: string): string {
	if (code === "city_not_found") {
		return "Cidade não encontrada. Verifique o nome e tente novamente."
	}
	return "Serviço de meteorologia indisponível no momento. Tente novamente em instantes."
}

function weatherResultAnnouncement(
	city: string | null,
	data: { city: string; temperature: { current: number } } | undefined,
): string {
	if (!city || !data) return ""
	return `Temperatura de ${data.city}: ${data.temperature.current} graus`
}

function WeatherPageContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const city = searchParams.get("city")

	const { data, error } = useWeatherQuery(city)
	const isPending = useIsFetching({ queryKey: ["weather"] }) > 0

	function handleSearch(nextCity: string) {
		const params = new URLSearchParams(searchParams.toString())
		params.set("city", nextCity)
		router.replace(`?${params.toString()}`)
	}

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Consulta de clima
				</h1>
				<p className="text-sm text-muted-foreground">
					Digite o nome de uma cidade para ver a temperatura atual.
				</p>
			</header>

			<div
				aria-hidden="true"
				data-testid="weather-globe-slot"
				className={GLOBE_SLOT_CLASS}
			>
				<WeatherGlobe latitude={data?.latitude} longitude={data?.longitude} />
			</div>

			<WeatherSearchForm
				onSearch={handleSearch}
				isPending={isPending}
				defaultCity={city ?? undefined}
			/>

			{!city && <EmptyState title="Digite uma cidade para começar" />}
			{city && error && (
				<p role="alert" className="text-sm text-destructive">
					{weatherErrorMessage(error.code)}
				</p>
			)}
			{city && data && (
				<CurrentWeatherDisplay
					city={data.city}
					temperature={data.temperature}
				/>
			)}
			<div role="status" aria-live="polite" className="sr-only">
				{weatherResultAnnouncement(city, data)}
			</div>
		</section>
	)
}

export default function WeatherPage() {
	return (
		<Suspense
			fallback={<div data-testid="weather-page-loading" aria-busy="true" />}
		>
			<WeatherPageContent />
		</Suspense>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run src/app/\(public\)/clima/page.test.tsx`
Expected: PASS (todos os testes existentes do describe `WeatherPage` + o novo teste, sem
regressão nos 5 testes já existentes).

- **Step 5: Commit**

```bash
git add apps/frontend/src/app/\(public\)/clima/page.tsx apps/frontend/src/app/\(public\)/clima/page.test.tsx
git commit -m "feat(weather): integra WeatherGlobe na página /clima via next/dynamic"
```

## Critérios de Sucesso

- `WeatherGlobe` é carregado via `next/dynamic({ ssr: false })` a partir de
  `@/features/weather/components/weather-globe-error-boundary`, nunca importado estaticamente em
  `page.tsx` [FR-002].
- O espaço do globo é reservado por um wrapper `div` de altura fixa (`h-32 w-32`, o mesmo
  `GLOBE_SIZE_PX = 128` da Task 3) com `aria-hidden="true"`, presente no DOM independentemente do
  carregamento do chunk — não pela opção `loading` do `next/dynamic`, que o mock de teste do repo
  ignora.
- `WeatherGlobe` não recebe `key` derivada de cidade/coordenada: uma nova busca atualiza props,
  nunca remonta o componente (preserva um único contexto WebGL, ver Task 5).
- O teste da página mocka o módulo carregado dinamicamente
  (`vi.mock("@/features/weather/components/weather-globe-error-boundary", ...)`), porque o mock de
  `next/dynamic` do repo executa o `import()` real e `react-globe.gl` não roda em `happy-dom` —
  mesmo precedente de `gym-location-picker.test.tsx`.
- O globo é renderizado sempre, acima do `WeatherSearchForm`, independentemente de já ter havido
  uma busca, sem exibir marcador antes de qualquer busca (regressão do comportamento já
  implementado nas tasks 3-4, não uma nova cobertura de FR).
- Quando `useWeatherQuery` retorna dado com sucesso, `WeatherGlobe` recebe `latitude`/`longitude`
  desse resultado; quando não há busca ou a busca falha, recebe `undefined` em ambas as props,
  mantendo a última posição válida sem regressão na animação de câmera nem no fallback ao erro
  (regressão do comportamento já implementado nas tasks 3-4, não uma nova cobertura de FR).
- O fluxo de busca existente (mensagens de erro, exibição de `CurrentWeatherDisplay`, anúncio de
  status) continua funcionando sem regressão com o globo presente.
