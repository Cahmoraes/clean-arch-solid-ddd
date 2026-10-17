# Task 1: Regra pura de dia selecionado [FR-006]

**Status:** DONE

**PRD:** `../prd/prd-calendario-redesign-painel-gaveta.md`

**Spec:** `../specs/calendario-redesign-painel-gaveta-design.md`

**Tier:** cheap

## Visão Geral

Entrega a função pura que decide qual dia do calendário está selecionado: o dia clicado quando ele pertence ao mês exibido; senão hoje, se o mês exibido contém hoje; senão o dia 1. É a rede de segurança que impede o painel de ficar sem dia ao trocar de mês, e é consumida pela página na task-06.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/lib/resolve-selected-day.ts`
- Test: `apps/frontend/src/features/calendario-feriados/lib/resolve-selected-day.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** `resolveSelectedDay(input: { clicked: string | null; year: number; monthIndex: number; today: Date }): string` em `features/calendario-feriados/lib/resolve-selected-day.ts`. `monthIndex` é 0-based; o retorno é `YYYY-MM-DD` com zero à esquerda. Usada pela `CalendarPage` (task-06).

### Skills a invocar

- `typescript-advanced`: tipar o objeto de entrada e o retorno sem afrouxar para `string` genérico onde o tipo de entrada já resolve.
- `test-antipatterns`: a função é pura; os testes não usam mock e cada um assere o que o nome diz.

## Passos

- **Step 1: Write the failing test**

Em `resolve-selected-day.test.ts` (`describe("resolveSelectedDay")`). `hoje` é `new Date(2026, 9, 17)` (17/out/2026, dia local).

```ts
import { describe, expect, test } from "vitest"
import { resolveSelectedDay } from "./resolve-selected-day"

const hoje = new Date(2026, 9, 17)

describe("resolveSelectedDay", () => {
	test("devolve o dia clicado quando ele pertence ao mês exibido", () => {
		expect(
			resolveSelectedDay({ clicked: "2026-10-12", year: 2026, monthIndex: 9, today: hoje }),
		).toBe("2026-10-12")
	})

	test("clicado em outro mês com o mês atual exibido devolve hoje", () => {
		expect(
			resolveSelectedDay({ clicked: "2026-09-30", year: 2026, monthIndex: 9, today: hoje }),
		).toBe("2026-10-17")
	})

	test("clicado em outro ano com o mês atual exibido devolve hoje", () => {
		expect(
			resolveSelectedDay({ clicked: "2025-10-12", year: 2026, monthIndex: 9, today: hoje }),
		).toBe("2026-10-17")
	})

	test("mês exibido sem hoje devolve o dia 1 com zero à esquerda", () => {
		expect(
			resolveSelectedDay({ clicked: null, year: 2026, monthIndex: 2, today: hoje }),
		).toBe("2026-03-01")
	})

	test("clicado nulo no mês de hoje devolve hoje", () => {
		expect(
			resolveSelectedDay({ clicked: null, year: 2026, monthIndex: 9, today: hoje }),
		).toBe("2026-10-17")
	})

	test("virada de ano: clicado em janeiro seguinte com dezembro exibido devolve o dia 1", () => {
		expect(
			resolveSelectedDay({ clicked: "2027-01-05", year: 2026, monthIndex: 11, today: hoje }),
		).toBe("2026-12-01")
	})

	test("mesmo mês em outro ano não conta como pertencente ao mês exibido", () => {
		expect(
			resolveSelectedDay({ clicked: "2027-10-12", year: 2026, monthIndex: 9, today: hoje }),
		).toBe("2026-10-17")
	})
})
```

- **Step 2: Review Focus: Dia clicado em outro mês, ou mês exibido sem hoje, nunca deixa o painel sem dia: cai em hoje ou no dia 1 — Write the failing test**

Enumeração determinística dos 12 meses de 2026 com cliques que nunca pertencem ao mês exibido (outro ano) e com `null`:

```ts
test("Review Focus: clicado fora do mês ou mês sem hoje nunca deixa sem dia", () => {
	for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
		const prefixo = `2026-${String(monthIndex + 1).padStart(2, "0")}-`
		for (const clicked of [null, "2025-10-12", "2027-12-01"]) {
			const dia = resolveSelectedDay({ clicked, year: 2026, monthIndex, today: hoje })
			expect(dia).toMatch(/^\d{4}-\d{2}-\d{2}$/)
			expect(dia).toBe(monthIndex === 9 ? "2026-10-17" : `${prefixo}01`)
		}
	}
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/lib/resolve-selected-day.test.ts`
Expected: FAIL: o módulo `./resolve-selected-day` não existe (`resolveSelectedDay` não definido).

- **Step 4: Implement `resolveSelectedDay(input: { clicked: string | null; year: number; monthIndex: number; today: Date }): string` in `apps/frontend/src/features/calendario-feriados/lib/resolve-selected-day.ts`**

Compare por prefixo `YYYY-MM` construído de `year` e `monthIndex + 1` (com zero à esquerda) contra `clicked.slice(0, 7)`; para `today` use `getFullYear()`, `getMonth()` e `getDate()` locais. Nunca `toISOString` (fuso). Complexidade cognitiva máxima 5 (Biome): extraia um helper `pertenceAoMes(data, prefixo)` se precisar.

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario-feriados/lib/resolve-selected-day.test.ts`
Expected: PASS: 8 testes.

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario-feriados/lib/resolve-selected-day.ts apps/frontend/src/features/calendario-feriados/lib/resolve-selected-day.test.ts
git commit -m "feat(calendario): regra pura de dia selecionado"
```

## Critérios de Sucesso

- `resolveSelectedDay` devolve o dia clicado quando pertence ao mês exibido, hoje quando o mês exibido contém hoje, e o dia 1 (`YYYY-MM-01`) nos demais casos.
- A comparação é por dia de calendário local, sem fuso (nenhum `toISOString`).
- Um dia clicado em outro mês ou outro ano nunca é devolvido para o mês exibido (FR-006); a regra completa em nível de página (AC-03) é verificada na task-06.
