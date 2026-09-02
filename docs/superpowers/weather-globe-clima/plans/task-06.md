# Task 6: Integrar layout panorâmico na rota `/clima` [FR-001, FR-002, FR-004, FR-005, FR-006, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** task-03, task-05

## Visão Geral

Integra o `WeatherGlobe` (Task 5) na página `/clima` (`apps/frontend/src/app/(public)/clima/page.tsx`), seguindo o layout B do mockup: copy + busca no topo, globo panorâmico logo abaixo da busca, resultado climático (`CurrentWeatherDisplay`) por último. A busca textual continua sendo a única origem da cidade consultada — o globo só recebe `city`/`latitude`/`longitude` da resposta já carregada por `useWeatherQuery` e nunca altera `router`/`searchParams`. Quando a resposta não tem coordenadas válidas (ausência do dado, ou globo indisponível), a página continua funcional só com busca e resultado (FR-006).

## Arquivos

- Modify: `apps/frontend/src/app/(public)/clima/page.tsx`
- Modify: `apps/frontend/src/app/(public)/clima/page.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: a renderização condicional do globo deve checar os dados reais (`Number.isFinite(data.latitude)`), não uma flag fixa; nenhum handler do globo deve chamar `router.replace`/`useSearchParams`.
- `test-antipatterns`: os testes validam o comportamento observável da página (o que aparece na tela conforme a resposta mockada via MSW), não a implementação interna do `WeatherGlobe`.
- `typescript-advanced`: usar diretamente os campos tipados de `WeatherResponse` (`data.latitude`, `data.longitude`, ambos `number` após a Task 3), sem cast.
- `vercel-react-best-practices`: o globo já é client-only e carregado via `next/dynamic` dentro do próprio `WeatherGlobe` (Task 5); a página não precisa (e não deve) adicionar um segundo `dynamic()`/`Suspense` para o mesmo componente.
- `tailwindcss`: ajustar a largura do container principal (`max-w-3xl` em vez de `max-w-md`) para acomodar o globo panorâmico, mantendo mobile-first (o globo continua acima do resultado em qualquer largura, sem `grid`/`flex-row` que exigiriam breakpoints adicionais).
- `vitest`: testes cobrindo presença/ausência do globo conforme os dados da resposta.
- `tanstack-query-best-practices`: nenhuma mudança na key/config de `useWeatherQuery` — o globo consome apenas o `data` já resolvido pelo hook existente, sem nova query.
- `impeccable`: preservar a intenção visual do mockup (hero panorâmico) sem quebrar os estados de loading/erro já existentes na página.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-globe-clima-visual.md` (bloco `.clima-hero` completo: `.copy` + `.search-row`, `.globe-panel`, `.weather-result`).
- **Fonte de design original:** nenhuma; mockup criado no Visual Companion (ver nota de fonte no próprio arquivo do mockup).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? Caso a resposta seja não, seguir o mockup curado como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `impeccable` disponível para revisão de fidelidade visual; browser/Playwright disponíveis via skill `playwright-cli` para validar visualmente o layout completo, caso necessário.
- **Decisões visuais já tomadas (não refazer):** ordem vertical copy → busca → globo → resultado; globo largo acima do resultado tanto em desktop quanto mobile; busca sempre visível antes do resultado, independente do estado do globo.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a subseção `### Fidelidade Visual` acima. Não há fonte de design original além do mockup curado — confirme isso com o usuário antes de prosseguir. Sem ferramenta de design-to-code configurada neste ambiente para esta tela, monte o layout manualmente a partir do HTML/tokens do mockup, reaproveitando a ordem copy → busca → globo → resultado já decidida.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/app/(public)/clima/page.test.tsx
// Adicionar dentro do describe("WeatherPage", ...) já existente, após os testes atuais.

	test("mostra o globo quando a consulta retorna latitude e longitude", async () => {
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

		expect(
			await screen.findByLabelText("Mapa estático centrado em São Paulo"),
		).toBeInTheDocument()
	})

	test("não mostra o globo quando a resposta não traz coordenadas válidas", async () => {
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("city=São Paulo") as unknown as ReturnType<
				typeof useSearchParams
			>,
		)
		server.use(
			http.get(`${apiBaseUrl}/weather`, () =>
				HttpResponse.json(
					{ city: "São Paulo", temperature: { current: 24, min: 18, max: 27 } },
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<WeatherPage />)

		await waitFor(() => expect(screen.getByText("24°C")).toBeInTheDocument())
		expect(
			screen.queryByLabelText(/Mapa (3D|estático) centrado em/),
		).not.toBeInTheDocument()
	})
```

O teste "não mostra o globo..." usa uma resposta sem `latitude`/`longitude` para validar a guarda defensiva de FR-006 (independentemente de o contrato real, pós Task 1/3, sempre enviar esses campos).

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && npx vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: FAIL — o primeiro teste novo falha com "Unable to find a label with the text: Mapa estático centrado em São Paulo" porque a página ainda não renderiza `WeatherGlobe` (os demais testes do arquivo continuam passando).

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/app/(public)/clima/page.tsx
"use client"

import { useIsFetching } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { useWeatherQuery } from "@/features/weather/api/use-weather-query"
import { CurrentWeatherDisplay } from "@/features/weather/components/current-weather-display"
import { WeatherGlobe } from "@/features/weather/components/weather-globe"
import { WeatherSearchForm } from "@/features/weather/components/weather-search-form"

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
	const hasValidCoordinates =
		Boolean(data) &&
		Number.isFinite(data?.latitude) &&
		Number.isFinite(data?.longitude)

	function handleSearch(nextCity: string) {
		const params = new URLSearchParams(searchParams.toString())
		params.set("city", nextCity)
		router.replace(`?${params.toString()}`)
	}

	return (
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16 sm:px-6">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Consulta de clima
				</h1>
				<p className="text-sm text-muted-foreground">
					Digite o nome de uma cidade para ver a temperatura atual.
				</p>
			</header>

			<WeatherSearchForm
				onSearch={handleSearch}
				isPending={isPending}
				defaultCity={city ?? undefined}
			/>

			{city && data && hasValidCoordinates && (
				<WeatherGlobe
					city={data.city}
					latitude={data.latitude}
					longitude={data.longitude}
				/>
			)}

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

`hasValidCoordinates` é a única mudança de decisão nova: garante que a ausência de `latitude`/`longitude` (FR-006) não impede a renderização de busca/resultado, e que o globo só aparece com coordenadas numéricas válidas, atendendo FR-002/FR-013 (marcador corresponde à consulta atual).

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && npx vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: PASS (8 tests)

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule este passo e reporte os arquivos alterados ao orquestrador.)*

```bash
git add apps/frontend/src/app/\(public\)/clima/page.tsx \
  apps/frontend/src/app/\(public\)/clima/page.test.tsx
git commit -m "feat(weather): integrate panoramic globe layout into /clima"
```

## Critérios de Sucesso

- `/clima` mantém busca textual como única origem da cidade consultada; nenhum handler do globo chama `router.replace`.
- O globo aparece somente quando a resposta atual tem `latitude`/`longitude` numéricos, logo abaixo da busca e acima do resultado climático (ordem do mockup).
- `CurrentWeatherDisplay`, mensagens de erro (`city_not_found`/`weather_provider_unavailable`) e o `EmptyState` continuam funcionando exatamente como antes desta task.
- Os testes passam isoladamente com `npx vitest run "src/app/(public)/clima/page.test.tsx"`.
