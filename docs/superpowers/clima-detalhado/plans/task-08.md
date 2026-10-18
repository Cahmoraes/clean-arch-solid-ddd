# Task 8: Lista dos próximos 7 dias [FR-002, FR-005]

**Status:** PENDING

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** cheap

## Visão Geral

Componente de apresentação com 7 linhas: dia da semana ("Hoje" no primeiro), ícone da condição, barra de faixa de temperatura e "mín° / máx°" na unidade ativa.

## Arquivos

- Create: `apps/frontend/src/features/weather/components/daily-forecast.tsx`
- Test: `apps/frontend/src/features/weather/components/daily-forecast.test.tsx`

## Interfaces

- **Consome:**
  - `type WeatherResponse` de `@/features/weather/api/use-weather-query`, com `daily: { date: string; min: number; max: number; code: number }[]` (task-06)
  - `resolveCondition(code: number, isDay: boolean): { category: ConditionCategory; label: string; Icon: PixelIcon }` (task-05)
  - `UnitSystem`, `convertTemperature(celsius: number, units: UnitSystem): number`, `formatValue(value: number): string` de `@/features/weather/lib/units` (task-03)
- **Produz:**
  ```ts
  export interface DailyForecastProps { daily: WeatherResponse["daily"]; units: UnitSystem }
  export function DailyForecast(props: DailyForecastProps): JSX.Element
  ```

### Skills a invocar

- `vercel-react-best-practices`: componente sem estado; `key` pelo `date`.
- `wcag-audit-patterns`: lista semântica, barra decorativa, rótulo textual da condição.
- `test-antipatterns`: asserções sobre o texto visível por linha.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/clima-detalhado-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** card com título "Próximos 7 dias" (`CardTitle as="h2"`); linhas com dia da semana, ícone de 24px (`h-6 w-6`), barra fina (trilho `bg-muted`, preenchimento `bg-accent`) e `mín° / máx°`; só tokens do tema, sem glow.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual`, confirmar com o usuário se há fonte de design original; sem fonte nem ferramenta, construir a partir do mockup.

- **Step 1: Write the failing test**

```tsx
// 2026-10-18 é domingo; a faixa da semana vai de 10 a 30
const daily: WeatherResponse["daily"] = [
	{ date: "2026-10-18", min: 10, max: 20, code: 1 },
	{ date: "2026-10-19", min: 20, max: 30, code: 61 },
	...["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"].map((date) => ({
		date, min: 15, max: 25, code: 3,
	})),
]

test("AC-01: deve mostrar os 7 dias com dia da semana, condição, mínima e máxima", () => {
	render(<DailyForecast daily={daily} units="metric" />)

	const rows = screen.getAllByRole("listitem")
	expect(rows).toHaveLength(7)
	expect(within(rows[0]).getByText("Hoje")).toBeInTheDocument()
	expect(within(rows[0]).getByText("10° / 20°")).toBeInTheDocument()
	expect(within(rows[0]).getByText("Céu limpo")).toBeInTheDocument()
	expect(within(rows[1]).getByText("Seg")).toBeInTheDocument()
	expect(within(rows[1]).getByText("Chuva")).toBeInTheDocument()
	expect(within(rows[6]).getByText("Sáb")).toBeInTheDocument()
	expect(screen.getByRole("heading", { level: 2, name: "Próximos 7 dias" })).toBeInTheDocument()
})

test("deve converter mínima e máxima para °F no sistema imperial", () => {
	render(<DailyForecast daily={daily} units="imperial" />)

	expect(within(screen.getAllByRole("listitem")[0]).getByText("50° / 68°")).toBeInTheDocument()
})

test("deve posicionar a barra de cada dia dentro da faixa mínima/máxima da semana", () => {
	render(<DailyForecast daily={daily} units="metric" />)

	const fills = screen.getAllByTestId("daily-range-fill")
	expect(fills[0].style.marginLeft).toBe("0%")
	expect(fills[0].style.width).toBe("50%")
	expect(fills[1].style.marginLeft).toBe("50%")
	expect(fills[1].style.width).toBe("50%")
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/daily-forecast.test.tsx`
Expected: FAIL — `./daily-forecast` não existe.

- **Step 3: Implement `DailyForecast({ daily, units }: DailyForecastProps)` em `daily-forecast.tsx`**

Dia da semana de `date` sem fuso: `["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]`, com "Hoje" no índice 0. Texto `` `${formatValue(convertTemperature(min, units))}° / ${formatValue(convertTemperature(max, units))}°` ``. Barra: `lo`/`hi` são o menor `min` e o maior `max` da semana (em °C); o preenchimento (`data-testid="daily-range-fill"`) usa `marginLeft = (min - lo) / (hi - lo) * 100 + "%"` e `width = (max - min) / (hi - lo) * 100 + "%"` via `style`, e 100% de largura quando `hi === lo`. A barra e o ícone são decorativos; o rótulo da condição vai num `span className="sr-only"`. Respeitar os guards de `src/test/` (linha com `font-display` sem `font-bold`/`text-sm`/`text-xs`, sem `rounded` solto).

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/components/daily-forecast.test.tsx`
Expected: PASS

- **Step 5: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/src/features/weather/components/daily-forecast.tsx apps/frontend/src/features/weather/components/daily-forecast.test.tsx
git commit -m "feat(weather): lista dos próximos 7 dias

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- A lista mostra 7 dias com dia da semana, ícone, barra e mínima/máxima na unidade ativa.
- AC-01 [unit]: WHEN uma cidade é consultada THEN a resposta traz condição, sensação, umidade, vento, 24 horas e 7 dias, além dos campos que já existiam
