# Task 9: Botão de unidade, integração na página e crédito à Open-Meteo [FR-006, FR-007, FR-008, FR-010]

**Status:** PENDING

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** standard

## Visão Geral

A página `/clima` passa a ler a unidade da URL (`?units=imperial`; ausente ou inválida é métrico), mostra agora, horas e dias na unidade ativa, oferece o botão que alterna °C/°F reescrevendo a URL sem nova requisição, mantém os erros existentes sem resultado parcial e exibe o crédito à Open-Meteo.

## Arquivos

- Create: `apps/frontend/src/features/weather/components/unit-toggle-button.tsx`
- Modify: `apps/frontend/src/app/(public)/clima/page.tsx`
- Test: `apps/frontend/src/features/weather/components/unit-toggle-button.test.tsx`
- Test: `apps/frontend/src/app/(public)/clima/page.test.tsx`

## Interfaces

- **Consome:**
  - `CurrentWeatherDisplay({ city, weather, units, actions }: CurrentWeatherDisplayProps)` com `weather: Pick<WeatherResponse, "temperature" | "condition" | "humidity" | "wind">`, `units: UnitSystem`, `actions?: React.ReactNode` (task-06); `makeWeatherStub(city?: string): WeatherResponse` de `@/test/msw/handlers` (temperature atual 24, apparent 22, min 18, max 27, humidity 64, wind 12 km/h a 45 graus) (task-06)
  - `HourlyForecast({ hourly, units }: HourlyForecastProps)` de `@/features/weather/components/hourly-forecast`, título "Próximas horas" (task-07)
  - `DailyForecast({ daily, units }: DailyForecastProps)` de `@/features/weather/components/daily-forecast` (task-08)
  - de `@/features/weather/lib/units`: `UnitSystem`, `parseUnits(value: string | null): UnitSystem`, `convertTemperature(celsius: number, units: UnitSystem): number`, `formatValue(value: number): string` (task-03)
- **Produz:**
  ```ts
  export interface UnitToggleButtonProps { units: UnitSystem; onToggle: () => void }
  export function UnitToggleButton(props: UnitToggleButtonProps): JSX.Element
  ```

### Skills a invocar

- `vercel-composition-patterns`: o botão entra no card pelo slot `actions`; resultado extraído em componente local para respeitar a complexidade cognitiva máxima de 5 do Biome.
- `vercel-react-best-practices`: a unidade deriva de `useSearchParams`, sem estado duplicado.
- `tanstack-query-best-practices`: alternar a unidade não toca na query (`queryKey ["weather", city]` não inclui `units`).
- `wcag-audit-patterns`: botão com `aria-pressed` e nome acessível que contém o rótulo visível; link do crédito.
- `test-antipatterns`: asserções sobre `router.replace` e texto visível.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/clima-detalhado-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** três cards empilhados na coluna `max-w-md` (agora, horas, dias) abaixo da busca e do globo; botão de unidade no canto superior direito do card "agora" (`Button variant="outline" size="sm"`); rodapé do resultado em linha pequena `text-xs text-muted-foreground` com o crédito; só tokens do tema, sem glow.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual`, confirmar com o usuário se há fonte de design original; sem fonte nem ferramenta, construir a partir do mockup.

- **Step 1: Write the failing test — `unit-toggle-button.test.tsx`**

```tsx
test("deve mostrar °F e aria-pressed falso no sistema métrico, e chamar onToggle ao clicar", async () => {
	const onToggle = vi.fn()
	render(<UnitToggleButton units="metric" onToggle={onToggle} />)

	const button = screen.getByRole("button", { name: "Mudar para °F e mph" })
	expect(button).toHaveTextContent("°F")
	expect(button).toHaveAttribute("aria-pressed", "false")
	await userEvent.click(button)
	expect(onToggle).toHaveBeenCalledTimes(1)
})

test("deve mostrar °C e aria-pressed verdadeiro no sistema imperial", () => {
	render(<UnitToggleButton units="imperial" onToggle={vi.fn()} />)

	const button = screen.getByRole("button", { name: "Mudar para °C e km/h" })
	expect(button).toHaveTextContent("°C")
	expect(button).toHaveAttribute("aria-pressed", "true")
})
```

- **Step 2: Write the failing test — `page.test.tsx`**

Helper no arquivo: `function setUrl(query: string) { vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(query) as unknown as ReturnType<typeof useSearchParams>) }`. O handler MSW padrão devolve `makeWeatherStub(city)`. Os testes usam `userEvent.setup()` e `replaceMock` como nos testes existentes do arquivo.

```tsx
test("AC-03: deve mostrar 24 °C como 75,2 °F e 12 km/h como 7 mph com ?units=imperial", async () => {
	setUrl("city=São Paulo&units=imperial")
	renderWithProviders(<WeatherPage />)

	expect(await screen.findByText("75,2°F")).toBeInTheDocument()
	expect(screen.getByText("7 mph NE")).toBeInTheDocument()
})

test("AC-09: deve mostrar °C e km/h quando units é inválido ou ausente", async () => {
	for (const query of ["city=São Paulo&units=banana", "city=São Paulo"]) {
		setUrl(query)
		const { unmount } = renderWithProviders(<WeatherPage />)

		expect(await screen.findByText("24°C")).toBeInTheDocument()
		expect(screen.getByText("12 km/h NE")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Mudar para °F e mph" })).toHaveAttribute("aria-pressed", "false")
		unmount()
	}
})

test("AC-06: deve adicionar units=imperial à URL ao alternar, sem nova requisição", async () => {
	const user = userEvent.setup()
	const replaceMock = vi.fn()
	vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
	setUrl("city=São Paulo")
	let requests = 0
	server.use(http.get(`${apiBaseUrl}/weather`, () => {
		requests += 1
		return HttpResponse.json(makeWeatherStub("São Paulo"))
	}))
	renderWithProviders(<WeatherPage />)

	await user.click(await screen.findByRole("button", { name: "Mudar para °F e mph" }))

	expect(replaceMock).toHaveBeenCalledWith("?city=S%C3%A3o+Paulo&units=imperial")
	expect(requests).toBe(1)
})

test("AC-06: deve remover units da URL ao voltar para o métrico, sem nova requisição", async () => {
	const user = userEvent.setup()
	const replaceMock = vi.fn()
	vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
	setUrl("city=São Paulo&units=imperial")
	let requests = 0
	server.use(http.get(`${apiBaseUrl}/weather`, () => {
		requests += 1
		return HttpResponse.json(makeWeatherStub("São Paulo"))
	}))
	renderWithProviders(<WeatherPage />)

	await user.click(await screen.findByRole("button", { name: "Mudar para °C e km/h" }))

	expect(replaceMock).toHaveBeenCalledWith("?city=S%C3%A3o+Paulo")
	expect(requests).toBe(1)
})

test("AC-10: deve exibir o crédito à Open-Meteo com link quando o resultado aparece", async () => {
	setUrl("city=São Paulo")
	renderWithProviders(<WeatherPage />)

	const link = await screen.findByRole("link", { name: "Open-Meteo" })
	expect(link).toHaveAttribute("href", "https://open-meteo.com/")
	expect(link.parentElement?.textContent).toBe("Dados: Open-Meteo (CC BY 4.0)")
})

test("deve mostrar agora, próximas horas e próximos 7 dias juntos", async () => {
	setUrl("city=São Paulo")
	renderWithProviders(<WeatherPage />)

	await screen.findByText("24°C")
	expect(screen.getByRole("heading", { name: "Próximas horas" })).toBeInTheDocument()
	expect(screen.getByRole("heading", { name: "Próximos 7 dias" })).toBeInTheDocument()
	expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(31)
})

test("deve anunciar a temperatura na unidade ativa", async () => {
	setUrl("city=São Paulo&units=imperial")
	renderWithProviders(<WeatherPage />)

	expect(await screen.findByText("Temperatura de São Paulo: 75,2 graus")).toBeInTheDocument()
})
```

Renomear o teste existente de 503 para `AC-07: ...` e acrescentar a ele `expect(screen.queryByRole("heading", { name: "Próximas horas" })).not.toBeInTheDocument()` e `expect(screen.queryByText("Sensação")).not.toBeInTheDocument()`.

- **Step 3: Review Focus: Alternar a unidade mantém `?city=` na URL e consultar outra cidade mantém `?units=` — Write the failing test**

Em `page.test.tsx`, com os mesmos helpers:

```tsx
test("Review Focus: Alternar a unidade mantém `?city=` na URL e consultar outra cidade mantém `?units=` — alternar mantém city", async () => {
	const user = userEvent.setup()
	const replaceMock = vi.fn()
	vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
	setUrl("city=São Paulo")
	renderWithProviders(<WeatherPage />)

	await user.click(await screen.findByRole("button", { name: "Mudar para °F e mph" }))

	const params = new URLSearchParams(String(replaceMock.mock.calls[0][0]).replace(/^\?/, ""))
	expect(params.get("city")).toBe("São Paulo")
	expect(params.get("units")).toBe("imperial")
})

test("Review Focus: Alternar a unidade mantém `?city=` na URL e consultar outra cidade mantém `?units=` — consultar outra cidade mantém units", async () => {
	const user = userEvent.setup()
	const replaceMock = vi.fn()
	vi.mocked(useRouter).mockReturnValue({ replace: replaceMock } as unknown as ReturnType<typeof useRouter>)
	setUrl("city=São Paulo&units=imperial")
	renderWithProviders(<WeatherPage />)
	await screen.findByText("75,2°F")

	await user.clear(screen.getByLabelText("Cidade (obrigatório)"))
	await user.type(screen.getByLabelText("Cidade (obrigatório)"), "Curitiba")
	await user.click(screen.getByRole("button", { name: "Consultar" }))

	const params = new URLSearchParams(String(replaceMock.mock.calls[0][0]).replace(/^\?/, ""))
	expect(params.get("city")).toBe("Curitiba")
	expect(params.get("units")).toBe("imperial")
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/unit-toggle-button.test.tsx`
Expected: FAIL — `./unit-toggle-button` não existe.
Run: `cd apps/frontend && pnpm exec vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: FAIL — `75,2°F`, o botão "Mudar para °F e mph", os títulos das listas e o crédito não existem na página.

- **Step 5: Implement `UnitToggleButton({ units, onToggle }: UnitToggleButtonProps)` em `unit-toggle-button.tsx`**

`Button variant="outline" size="sm" type="button"` com `aria-pressed={units === "imperial"}`, texto visível `°F` (métrico) ou `°C` (imperial) e `aria-label` `Mudar para °F e mph` (métrico) ou `Mudar para °C e km/h` (imperial).

- **Step 6: Integrar em `page.tsx`**

`const units = parseUnits(searchParams.get("units"))`. `handleToggleUnits`: copia `searchParams` para `URLSearchParams`, `units === "imperial"` ? `delete("units")` : `set("units", "imperial")`, e `router.replace(\`?${params.toString()}\`)`. `handleSearch` segue como está (já parte de `searchParams`, então preserva `units`). O resultado vira um componente local `WeatherResult({ data, units, onToggleUnits })` que renderiza `<CurrentWeatherDisplay city={data.city} weather={data} units={units} actions={<UnitToggleButton units={units} onToggle={onToggleUnits} />} />`, `<HourlyForecast hourly={data.hourly} units={units} />`, `<DailyForecast daily={data.daily} units={units} />` e, por último, `<p className="text-center text-xs text-muted-foreground">Dados: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (CC BY 4.0)</p>`. O anúncio sr-only passa a ser `` `Temperatura de ${data.city}: ${formatValue(convertTemperature(data.temperature.current, units))} graus` ``. Erros, `EmptyState`, globo e formulário ficam como estão.

- **Step 7: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/unit-toggle-button.test.tsx`
Expected: PASS
Run: `cd apps/frontend && pnpm exec vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: PASS

- **Step 8: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/src/features/weather/components/unit-toggle-button.tsx apps/frontend/src/features/weather/components/unit-toggle-button.test.tsx "apps/frontend/src/app/(public)/clima/page.tsx" "apps/frontend/src/app/(public)/clima/page.test.tsx"
git commit -m "feat(weather): botão de unidade, previsão na página e crédito Open-Meteo

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- A página mostra agora, 24 horas e 7 dias; alternar a unidade só reescreve a URL, preservando `city`, e consultar outra cidade preserva `units`.
- Os erros de cidade não encontrada e de serviço indisponível seguem sem resultado parcial.
- AC-03 [unit]: WHEN a unidade é imperial THEN 22,4 °C aparece como 72,3 °F e 12 km/h como 7 mph
- AC-06 [unit]: WHEN o usuário alterna a unidade THEN a URL ganha ou perde `units=imperial` e nenhuma requisição nova é feita
- AC-07 [unit]: WHEN a Open-Meteo falha THEN a resposta é 503 `weather_provider_unavailable` e a tela mostra o erro de serviço indisponível
- AC-09 [unit]: WHEN `units` na URL é inválido ou ausente THEN a tela mostra °C, km/h
- AC-10 [unit]: WHEN o resultado aparece THEN o crédito à Open-Meteo está visível
