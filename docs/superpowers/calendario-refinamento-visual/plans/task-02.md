# Task 2: Lista de feriados agrupada por semana [FR-003, FR-004, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-refinamento-visual.md`
**Spec:** `../specs/calendario-refinamento-visual-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

A lista lateral de feriados (`HolidayList`) hoje renderiza uma lista plana. Esta task adiciona
um helper puro `getSemanaDoMes`/`agruparFeriadosPorSemana` (cálculo local, sem chamada de API
nova — mantém a decisão fechada de `calendario-feriados` D1) e reestrutura `HolidayList` para
agrupar os feriados por semana do mês, com um divisor visual acessível (`role="group"`) entre
grupos. Nenhuma mudança em `page.tsx`: a estrutura de duas colunas (`xl:grid-cols-[minmax(0,1fr)_320px]`)
e o comportamento responsivo (FR-006) já são cobertos por um teste existente em `page.test.tsx`
que verifica `grid.className` conter `"grid"` no elemento pai de `role="complementary"` — como
`page.tsx` não é tocado, essa cobertura continua válida sem alteração.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.ts`
- Create: `apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.test.ts`
- Modify: `apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx`
- Create: `apps/frontend/src/features/calendario-feriados/ui/holiday-list.test.tsx`

### Conformidade com as Skills Padrão

- `wcag-audit-patterns`: o agrupamento por semana precisa nascer acessível (`role="group"` + `aria-label`, evitando duplicar o rótulo visual e o de leitor de tela).
- `tailwindcss`: classes utilitárias do divisor e do espaçamento entre grupos (Tailwind v4).
- `vercel-react-best-practices`: reestruturação de um componente de lista React — manter chaves estáveis (`key`) e evitar recomputar o agrupamento sem necessidade.
- `test-antipatterns`: os testes novos (helper puro + componente) devem testar comportamento observável (agrupamento, texto, roles), não detalhes de implementação.
- `shadcn`: `HolidayList` continua dentro de `Card`/`CardHeader`/`CardContent` do design system — manter as convenções de `rounded-[22px]`/`bg-muted` já em uso.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-refinamento-visual-visual.md` (seção "Núcleo HTML/JSX representativo" — `week-group`/`week-divider`/`holiday-items`).
- **Fonte de design original:** nenhuma — seguir o mockup curado.
- **Confirmar com o usuário:** não há fonte de design original a confirmar (já registrado no spec).
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code ou regressão visual configurada neste repositório — construir manualmente a partir do mockup e do código existente.
- **Decisões visuais já tomadas (não refazer):** manter `rounded-[14px]`/`bg-muted` no item, `rounded-[10px]`/`bg-card`/`font-mono` no badge de data — só o agrupamento e o divisor são novos.

## Passos

- **Step 1: Escrever o teste que falha para `getSemanaDoMes`/`agruparFeriadosPorSemana`**

Criar `apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import { agruparFeriadosPorSemana, getSemanaDoMes } from "./get-semana-do-mes"

describe("getSemanaDoMes", () => {
	test("primeiro dia do mês (setembro/2026, mês que começa numa terça) retorna semana 1", () => {
		expect(getSemanaDoMes("2026-09-01")).toBe(1)
	})

	test("dia perto do fim do mês cai em semana avançada", () => {
		expect(getSemanaDoMes("2026-09-30")).toBe(5)
	})
})

describe("agruparFeriadosPorSemana", () => {
	test("agrupa feriados por semana e ordena os grupos por número da semana", () => {
		const feriados = [
			{
				date: "2026-09-21",
				name: "Feriado B",
				type: "national" as const,
				isNational: true,
			},
			{
				date: "2026-09-07",
				name: "Feriado A",
				type: "national" as const,
				isNational: true,
			},
		]

		const grupos = agruparFeriadosPorSemana(feriados)

		expect(grupos.map((g) => g.semana)).toEqual([2, 4])
		expect(grupos[0].feriados[0].name).toBe("Feriado A")
		expect(grupos[1].feriados[0].name).toBe("Feriado B")
	})
})
```

- **Step 2: Rodar o teste para confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/lib/get-semana-do-mes.test.ts`
Expected: FAIL — `Cannot find module './get-semana-do-mes'` (o arquivo ainda não existe).

- **Step 3: Implementar `getSemanaDoMes`/`agruparFeriadosPorSemana`**

Criar `apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.ts`:

```typescript
import type { Feriado } from "@/features/calendario-feriados/model/feriado"

export function getSemanaDoMes(date: string): number {
	const day = Number(date.slice(8, 10))
	const firstOfMonth = new Date(`${date.slice(0, 7)}-01T12:00:00`)
	const firstWeekday = firstOfMonth.getDay()
	return Math.ceil((day + firstWeekday) / 7)
}

export function agruparFeriadosPorSemana(
	feriados: ReadonlyArray<Feriado>,
): Array<{ semana: number; feriados: Feriado[] }> {
	const grupos = new Map<number, Feriado[]>()
	for (const feriado of feriados) {
		const semana = getSemanaDoMes(feriado.date)
		const grupo = grupos.get(semana) ?? []
		grupo.push(feriado)
		grupos.set(semana, grupo)
	}
	return Array.from(grupos.entries())
		.sort(([a], [b]) => a - b)
		.map(([semana, feriadosDaSemana]) => ({
			semana,
			feriados: feriadosDaSemana,
		}))
}
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/lib/get-semana-do-mes.test.ts`
Expected: PASS

- **Step 5: Escrever o teste que falha para o agrupamento visual em `HolidayList`**

Criar `apps/frontend/src/features/calendario-feriados/ui/holiday-list.test.tsx`:

```typescript
import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { HolidayList } from "./holiday-list"

describe("HolidayList", () => {
	test("agrupa feriados do mês por semana, com divisor visual acessível", () => {
		render(
			<HolidayList
				feriados={[
					{
						date: "2026-09-07",
						name: "Feriado A",
						type: "national",
						isNational: true,
					},
					{
						date: "2026-09-21",
						name: "Feriado B",
						type: "national",
						isNational: true,
					},
				]}
				monthIndex={8}
				year={2026}
			/>,
		)

		const semana2 = screen.getByRole("group", { name: "Semana 2" })
		const semana4 = screen.getByRole("group", { name: "Semana 4" })

		expect(within(semana2).getByText("Feriado A")).toBeInTheDocument()
		expect(within(semana4).getByText("Feriado B")).toBeInTheDocument()
	})
})
```

- **Step 6: Rodar o teste para confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/ui/holiday-list.test.tsx`
Expected: FAIL — `screen.getByRole("group", { name: "Semana 2" })` não encontra nenhum elemento (a lista ainda é plana, sem agrupamento).

- **Step 7: Implementar o agrupamento em `HolidayList`**

Em `apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx`, adicionar o import do
helper e substituir o bloco do `<ol>` plano por grupos por semana:

```typescript
import { agruparFeriadosPorSemana } from "@/features/calendario-feriados/lib/get-semana-do-mes"
```

Substituir:

```typescript
				{list.length > 0 ? (
					<ol className="flex flex-col gap-3">
						{list.map((feriado) => (
							<li
								key={`${feriado.date}-${feriado.name}`}
								className="flex items-center gap-3 rounded-[14px] bg-muted p-3"
							>
								<time
									dateTime={feriado.date}
									className="rounded-[10px] bg-card px-2 py-1 font-mono text-xs font-medium"
								>
									{formatDateBR(feriado.date)}
								</time>
								<div className="flex flex-col">
									<strong className="text-sm text-foreground">
										{feriado.name}
									</strong>
									<span className="text-xs text-muted-foreground">
										nacional · {getWeekday(feriado.date)}
									</span>
								</div>
							</li>
						))}
					</ol>
				) : (
```

por:

```typescript
				{list.length > 0 ? (
					<div className="flex flex-col gap-4">
						{agruparFeriadosPorSemana(list).map(({ semana, feriados: feriadosDaSemana }) => (
							<div key={semana} role="group" aria-label={`Semana ${semana}`}>
								<p
									aria-hidden="true"
									className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
								>
									Semana {semana}
								</p>
								<ol className="flex flex-col gap-3">
									{feriadosDaSemana.map((feriado) => (
										<li
											key={`${feriado.date}-${feriado.name}`}
											className="flex items-center gap-3 rounded-[14px] bg-muted p-3"
										>
											<time
												dateTime={feriado.date}
												className="rounded-[10px] bg-card px-2 py-1 font-mono text-xs font-medium"
											>
												{formatDateBR(feriado.date)}
											</time>
											<div className="flex flex-col">
												<strong className="text-sm text-foreground">
													{feriado.name}
												</strong>
												<span className="text-xs text-muted-foreground">
													nacional · {getWeekday(feriado.date)}
												</span>
											</div>
										</li>
									))}
								</ol>
							</div>
						))}
					</div>
				) : (
```

O restante do arquivo (import de `Card`/`CardHeader`/etc., `formatDateBR`, `getWeekday`,
`HolidayListProps`, o branch de lista vazia `"Nenhum feriado neste mês."`) permanece inalterado.

- **Step 8: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/ui/holiday-list.test.tsx`
Expected: PASS

- **Step 9: Commit** *(execução sequencial — se esta task rodar em uma wave paralela, pular este passo e reportar os arquivos alterados em vez de commitar)*

```bash
git add apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.ts apps/frontend/src/features/calendario-feriados/lib/get-semana-do-mes.test.ts apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx apps/frontend/src/features/calendario-feriados/ui/holiday-list.test.tsx
git commit -m "feat(calendario): agrupa lista de feriados por semana"
```

## Critérios de Sucesso

- `getSemanaDoMes` calcula a semana do mês a partir da data, sem chamada de API nova (FR-004).
- `agruparFeriadosPorSemana` agrupa e ordena os feriados por semana (FR-004).
- `HolidayList` renderiza os feriados agrupados por semana com um divisor visual identificando cada grupo, exposto a leitores de tela via `role="group"`/`aria-label` (FR-003).
- `apps/frontend/src/app/(authenticated)/calendario/page.tsx` não é modificado; a estrutura de duas colunas e o comportamento responsivo continuam cobertos pelo teste existente em `page.test.tsx` que verifica `grid.className` conter `"grid"` no pai de `role="complementary"` (FR-006).
