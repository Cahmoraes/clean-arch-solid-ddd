# Task 6: Card "agora" com condição, sensação, umidade, vento e número nítido [FR-002, FR-003, FR-009]

**Status:** PENDING

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** standard

## Visão Geral

`CurrentWeatherDisplay` passa a mostrar ícone da condição, temperatura grande nítida em VT323 com espaçamento entre letras, rótulo da condição, sensação, umidade, vento com direção, mínima e máxima, já na unidade escolhida. Esta task também exporta o tipo `WeatherResponse` e deixa o stub de MSW com o payload completo, para as demais tasks de tela.

## Arquivos

- Modify: `apps/frontend/src/features/weather/api/use-weather-query.ts`
- Modify: `apps/frontend/src/features/weather/components/current-weather-display.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`
- Modify: `apps/frontend/src/app/(public)/clima/page.tsx` (só a chamada de `CurrentWeatherDisplay`)
- Test: `apps/frontend/src/features/weather/components/current-weather-display.test.tsx`
- Test: `apps/frontend/src/app/(public)/clima/page.test.tsx` e `apps/frontend/src/app/(public)/clima/page-globe-failure.test.tsx` (payloads de sucesso)

## Interfaces

- **Consome:**
  - `paths["/weather"]["get"]["responses"][200]["content"]["application/json"]` de `@repo/api-types`, com `temperature {current, apparent, min, max}`, `condition {code, isDay}`, `humidity`, `wind {speed, directionDegrees}`, `hourly[]`, `daily[]`, `latitude`, `longitude` (task-02)
  - `resolveCondition(code: number, isDay: boolean): { category: ConditionCategory; label: string; Icon: PixelIcon }` (task-05)
  - de `@/features/weather/lib/units`: `UnitSystem`, `convertTemperature(celsius: number, units: UnitSystem): number`, `convertWindSpeed(kmh: number, units: UnitSystem): number`, `temperatureSuffix(units: UnitSystem): "°C" | "°F"`, `windSuffix(units: UnitSystem): "km/h" | "mph"`, `windDirectionLabel(degrees: number): string`, `formatValue(value: number): string` (task-03)
- **Produz:**
  ```ts
  // use-weather-query.ts
  export type WeatherResponse = paths["/weather"]["get"]["responses"][200]["content"]["application/json"]
  // current-weather-display.tsx
  export interface CurrentWeatherDisplayProps {
  	city: string
  	weather: Pick<WeatherResponse, "temperature" | "condition" | "humidity" | "wind">
  	units: UnitSystem
  	actions?: React.ReactNode // canto superior direito do card (botão de unidade, task 9)
  }
  export function CurrentWeatherDisplay(props: CurrentWeatherDisplayProps): JSX.Element
  // test/msw/handlers.ts
  export function makeWeatherStub(city?: string): WeatherResponse // padrão "São Paulo"
  ```
  `makeWeatherStub`: `temperature {current:24, apparent:22, min:18, max:27}`, `condition {code:1, isDay:true}`, `humidity 64`, `wind {speed:12, directionDegrees:45}`, `latitude -23.5505`, `longitude -46.6333`, `hourly` de 24 itens (`time` `"2026-10-18T15:00"` a `"2026-10-19T14:00"`, `temperature` `19 + (índice % 4)`, `code 1`, `isDay true`), `daily` de 7 itens (`date` `"2026-10-18"` a `"2026-10-24"`, `min 18`, `max 27`, `code 1`). O handler `GET /weather` passa a responder `makeWeatherStub(city)`.

### Skills a invocar

- `vercel-composition-patterns`: o botão de unidade entra por slot (`actions`), sem prop booleana.
- `vercel-react-best-practices`: componente de apresentação sem estado, conversão na renderização.
- `wcag-audit-patterns`: ícone decorativo e texto como fonte do significado.
- `test-antipatterns`: asserções sobre o que o usuário lê, não sobre implementação.
- `tanstack-query-best-practices`: o tipo da resposta vem de `useWeatherQuery`, sem segunda fonte.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/clima-detalhado-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** card com nome da cidade (`text-sm text-muted-foreground`), ícone da condição de 64px (`h-16 w-16`) ao lado da temperatura; número em uma linha só `font-display text-[80px] tracking-[0.04em] leading-none` (sem `font-bold`); condição em `font-display text-accent`; grade de 3 caixas (Sensação, Umidade, Vento) e de 2 (Mínima, Máxima) com `rounded-md border border-border p-3`, rótulo `text-[11px] text-muted-foreground` e valor `font-display text-2xl`; sem glow em texto; só tokens do tema.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual`, confirmar com o usuário se há fonte de design original; sem fonte nem ferramenta, construir a partir do mockup.

- **Step 1: Write the failing test — reescrever `current-weather-display.test.tsx`**

```tsx
const weather = {
	temperature: { current: 22.4, apparent: 21.8, min: 18, max: 27 },
	condition: { code: 1, isDay: true },
	humidity: 64,
	wind: { speed: 12, directionDegrees: 45 },
}

test("deve mostrar cidade, condição, sensação, umidade, vento e mínima/máxima no padrão métrico", () => {
	render(<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" />)

	expect(screen.getByText("Cajamar")).toBeInTheDocument()
	expect(screen.getByText("22,4°C")).toBeInTheDocument()
	expect(screen.getByText("Céu limpo")).toBeInTheDocument()
	expect(screen.getByText("Sensação")).toBeInTheDocument()
	expect(screen.getByText("21,8°C")).toBeInTheDocument()
	expect(screen.getByText("Umidade")).toBeInTheDocument()
	expect(screen.getByText("64%")).toBeInTheDocument()
	expect(screen.getByText("Vento")).toBeInTheDocument()
	expect(screen.getByText("12 km/h NE")).toBeInTheDocument()
	expect(screen.getByText("Mínima")).toBeInTheDocument()
	expect(screen.getByText("18°C")).toBeInTheDocument()
	expect(screen.getByText("Máxima")).toBeInTheDocument()
	expect(screen.getByText("27°C")).toBeInTheDocument()
})

test("deve converter temperaturas e vento para °F e mph no sistema imperial", () => {
	render(<CurrentWeatherDisplay city="Cajamar" weather={weather} units="imperial" />)

	expect(screen.getByText("72,3°F")).toBeInTheDocument()
	expect(screen.getByText("71,2°F")).toBeInTheDocument()
	expect(screen.getByText("7 mph NE")).toBeInTheDocument()
	expect(screen.getByText("64,4°F")).toBeInTheDocument()
	expect(screen.getByText("80,6°F")).toBeInTheDocument()
})

test("AC-11: deve exibir o número grande em font-display, tamanho múltiplo de 16px, tracking positivo e sem font-bold", () => {
	render(<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" />)

	const big = screen.getByText("22,4°C")
	const size = Number(/text-\[(\d+)px\]/.exec(big.className)?.[1])
	expect(big.className).toContain("font-display")
	expect(size % 16).toBe(0)
	expect(big.className).toMatch(/tracking-\[0\.\d+em\]/)
	expect(big.className).not.toMatch(/font-(bold|semibold|medium|black|extrabold)/)
})

test("deve mostrar o rótulo da condição em text-accent e o ícone de 64px decorativo", () => {
	const { container } = render(<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" />)

	expect(screen.getByText("Céu limpo").className).toContain("text-accent")
	const icon = container.querySelector("svg")
	expect(icon).toHaveAttribute("aria-hidden", "true")
	expect(icon?.getAttribute("class")).toContain("h-16")
})

test("deve renderizar o slot actions no card", () => {
	render(<CurrentWeatherDisplay city="Cajamar" weather={weather} units="metric" actions={<button type="button">ação</button>} />)

	expect(screen.getByRole("button", { name: "ação" })).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/current-weather-display.test.tsx`
Expected: FAIL — o componente ainda espera a prop `temperature`; `weather` é ignorado e `22,4°C` não aparece.

- **Step 3: Export `WeatherResponse` em `use-weather-query.ts` e adicionar `makeWeatherStub` em `handlers.ts`**

`export type WeatherResponse = ...` (o tipo local passa a exportado) e `makeWeatherStub(city = "São Paulo"): WeatherResponse` com os valores de `## Interfaces`; o handler `http.get(endpoint("/weather"), ...)` devolve `HttpResponse.json(makeWeatherStub(city), { status: 200 })`.

- **Step 4: Implement `CurrentWeatherDisplay` conforme `CurrentWeatherDisplayProps` em `current-weather-display.tsx`**

Valores formatados com `formatValue(convertTemperature(x, units)) + temperatureSuffix(units)`; vento como um só texto `` `${convertWindSpeed(speed, units)} ${windSuffix(units)} ${windDirectionLabel(directionDegrees)}` ``; umidade `` `${humidity}%` ``; ícone e rótulo vêm de `resolveCondition(condition.code, condition.isDay)`, `<Icon className="h-16 w-16" />`; `actions` ocupa o canto superior direito do `Card`. Respeitar os guards de `src/test/` (sem `rounded` solto, sem `crt-scanlines`, linha com `font-display` sem `font-bold` nem `text-sm`/`text-xs`).

- **Step 5: Adaptar o consumidor em `page.tsx` e os payloads de sucesso dos testes de página**

Em `page.tsx`, trocar a chamada por `<CurrentWeatherDisplay city={data.city} weather={data} units="metric" />`. Em `page.test.tsx` e `page-globe-failure.test.tsx`, trocar cada payload de sucesso inline (`{ city, temperature: {...} }`) por `makeWeatherStub("São Paulo")`, mantendo as demais asserções.

- **Step 6: Run tests to verify they pass**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/current-weather-display.test.tsx`
Expected: PASS
Run: `cd apps/frontend && pnpm exec vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: PASS
Run: `cd apps/frontend && pnpm exec vitest run "src/app/(public)/clima/page-globe-failure.test.tsx"`
Expected: PASS

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/src/features/weather/api/use-weather-query.ts apps/frontend/src/features/weather/components/current-weather-display.tsx apps/frontend/src/features/weather/components/current-weather-display.test.tsx apps/frontend/src/test/msw/handlers.ts "apps/frontend/src/app/(public)/clima/page.tsx" "apps/frontend/src/app/(public)/clima/page.test.tsx" "apps/frontend/src/app/(public)/clima/page-globe-failure.test.tsx"
git commit -m "feat(weather): card agora com condição, sensação, umidade e vento

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- O card mostra ícone, condição, sensação, umidade, vento com direção, mínima e máxima, nas unidades recebidas.
- O número grande fica numa linha só, sem `font-bold`, com tracking positivo.
- AC-11 [unit]: WHEN o resultado aparece THEN o número grande da temperatura usa `font-display` em tamanho múltiplo de 16px com tracking positivo, sem `font-bold`
