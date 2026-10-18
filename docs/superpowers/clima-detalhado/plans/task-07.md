# Task 7: Faixa das próximas 24 horas [FR-002, FR-004]

**Status:** DONE

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** cheap

## Visão Geral

Componente de apresentação com as próximas 24 horas numa faixa de rolagem horizontal: o primeiro item é "Agora" (borda primária), os demais mostram a hora local ("16h"), o ícone da condição e a temperatura na unidade ativa.

## Arquivos

- Create: `apps/frontend/src/features/weather/components/hourly-forecast.tsx`
- Test: `apps/frontend/src/features/weather/components/hourly-forecast.test.tsx`

## Interfaces

- **Consome:**
  - `type WeatherResponse` de `@/features/weather/api/use-weather-query`, com `hourly: { time: string; temperature: number; code: number; isDay: boolean }[]` (task-06)
  - `resolveCondition(code: number, isDay: boolean): { category: ConditionCategory; label: string; Icon: PixelIcon }` (task-05)
  - `UnitSystem`, `convertTemperature(celsius: number, units: UnitSystem): number`, `formatValue(value: number): string` de `@/features/weather/lib/units` (task-03)
- **Produz:**
  ```ts
  export interface HourlyForecastProps { hourly: WeatherResponse["hourly"]; units: UnitSystem }
  export function HourlyForecast(props: HourlyForecastProps): JSX.Element
  ```

### Skills a invocar

- `vercel-react-best-practices`: componente sem estado; `key` pelo `time`.
- `wcag-audit-patterns`: região rolável focável com nome, lista semântica, rótulo textual da condição.
- `test-antipatterns`: asserções sobre o texto visível por item.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/clima-detalhado-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** card com título "Próximas horas" (`CardTitle as="h2"`); faixa de rolagem horizontal com 24 itens de 58px (`w-[58px]`), cada um com hora, ícone de 24px (`h-6 w-6`) e temperatura; item "Agora" com `border-primary`; caixas `rounded-md border`; só tokens do tema, sem glow.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual`, confirmar com o usuário se há fonte de design original; sem fonte nem ferramenta, construir a partir do mockup.

- **Step 1: Write the failing test**

```tsx
const hourly: WeatherResponse["hourly"] = Array.from({ length: 24 }, (_, i) => ({
	time: new Date(Date.UTC(2026, 9, 18, 15 + i)).toISOString().slice(0, 16),
	temperature: 20 + (i % 3),
	code: i === 0 ? 1 : 61,
	isDay: true,
}))

test("AC-02: deve mostrar 24 itens em ordem, com Agora no primeiro e a hora local nos demais", () => {
	render(<HourlyForecast hourly={hourly} units="metric" />)

	const items = screen.getAllByRole("listitem")
	expect(items).toHaveLength(24)
	expect(within(items[0]).getByText("Agora")).toBeInTheDocument()
	expect(within(items[0]).getByText("20°")).toBeInTheDocument()
	expect(within(items[0]).getByText("Céu limpo")).toBeInTheDocument()
	expect(within(items[1]).getByText("16h")).toBeInTheDocument()
	expect(within(items[1]).getByText("Chuva")).toBeInTheDocument()
	expect(within(items[9]).getByText("0h")).toBeInTheDocument()
	expect(within(items[23]).getByText("14h")).toBeInTheDocument()
	expect(items[0].className).toContain("border-primary")
	expect(items[1].className).not.toContain("border-primary")
})

test("deve converter a temperatura de cada hora para °F no sistema imperial", () => {
	render(<HourlyForecast hourly={hourly} units="imperial" />)

	expect(within(screen.getAllByRole("listitem")[2]).getByText("71,6°")).toBeInTheDocument()
})

test("deve expor a faixa como região rolável focável com título", () => {
	render(<HourlyForecast hourly={hourly} units="metric" />)

	const region = screen.getByRole("region", { name: "Próximas 24 horas" })
	expect(region).toHaveAttribute("tabindex", "0")
	expect(region.className).toContain("overflow-x-auto")
	expect(screen.getByRole("heading", { level: 2, name: "Próximas horas" })).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/hourly-forecast.test.tsx`
Expected: FAIL — `./hourly-forecast` não existe.

- **Step 3: Implement `HourlyForecast({ hourly, units }: HourlyForecastProps)` em `hourly-forecast.tsx`**

Hora: `` `${Number(time.slice(11, 13))}h` `` (sem conversão de fuso), "Agora" no índice 0. Temperatura: `` `${formatValue(convertTemperature(temperature, units))}°` `` (sem letra de unidade). Cada item é um `li` dentro de um `ul` na região (`role="region"`, `aria-label="Próximas 24 horas"`, `tabIndex={0}`, `overflow-x-auto`); o ícone é decorativo e o rótulo de `resolveCondition(...).label` entra num `span className="sr-only"`. Respeitar os guards de `src/test/` (linha com `font-display` sem `font-bold`/`text-sm`/`text-xs`, sem `rounded` solto, sem tamanho de ícone fora de `h-3/4/5/6`).

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/hourly-forecast.test.tsx`
Expected: PASS

- **Step 5: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/src/features/weather/components/hourly-forecast.tsx apps/frontend/src/features/weather/components/hourly-forecast.test.tsx
git commit -m "feat(weather): faixa das próximas 24 horas

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- A faixa mostra 24 itens em ordem, o primeiro como "Agora", com ícone e temperatura na unidade ativa.
- AC-02 [unit]: WHEN a resposta traz `hourly` THEN a primeira hora é a hora atual local da cidade e são 24 itens em ordem crescente
