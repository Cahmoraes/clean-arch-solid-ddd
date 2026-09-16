# Task 2: Converter feriados em modifiers da grade [FR-002]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Cria a função pura `feriadosParaModifiers`, que filtra a lista de feriados de `useFeriadosDoAno` para o mês exibido e a converte em `modifiers`/`modifiersClassNames` do `react-day-picker`, para o `Calendar` do shadcn destacar visualmente os dias de feriado.

API confirmada de `react-day-picker@10.0.1` (verificada via `.d.ts` do pacote — a mesma versão que a Task 3 instalará via shadcn CLI): a prop `modifiers` do `DayPicker`/`Calendar` tem o tipo `Record<string, Matcher | Matcher[] | undefined>`, onde `Matcher` aceita `Date[]` entre outras formas; `modifiersClassNames` tem o tipo `Record<string, string>`. Ambas continuam suportadas na v10 (confirmado em `types/props.d.ts` e `types/shared.d.ts` do pacote).

## Arquivos

- Create: `apps/frontend/src/features/calendario/lib/feriados-para-modifiers.ts`
- Test: `apps/frontend/src/features/calendario/lib/feriados-para-modifiers.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipagem de `FeriadosModifiers` usando `Record<"feriado", ...>` e o tipo `Matcher` importado de `react-day-picker`.
- `test-antipatterns`: função pura, sem I/O — os testes devem exercitar comportamento real com fixtures de dados, sem mocks.

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/frontend/src/features/calendario/lib/feriados-para-modifiers.test.ts
import { describe, expect, test } from "vitest"
import type { Feriado } from "../schemas/feriado.schema"
import { feriadosParaModifiers } from "./feriados-para-modifiers"

const feriados2025: Feriado[] = [
	{ data: "2025-01-01", nome: "Ano Novo" },
	{ data: "2025-04-18", nome: "Sexta-Feira Santa" },
	{ data: "2025-04-21", nome: "Dia de Tiradentes" },
	{ data: "2025-12-25", nome: "Natal" },
]

describe("feriadosParaModifiers", () => {
	test("retorna apenas os feriados do mês exibido como modifiers", () => {
		const { modifiers } = feriadosParaModifiers(feriados2025, new Date(2025, 3, 1))

		expect(modifiers.feriado).toEqual([
			new Date(2025, 3, 18),
			new Date(2025, 3, 21),
		])
	})

	test("retorna modifiers vazio para mês sem feriado", () => {
		const { modifiers } = feriadosParaModifiers(feriados2025, new Date(2025, 1, 1))

		expect(modifiers.feriado).toEqual([])
	})

	test("inclui feriado no primeiro e no último dia do mês exibido", () => {
		const feriadosDeBorda: Feriado[] = [
			{ data: "2025-04-01", nome: "Feriado no primeiro dia" },
			{ data: "2025-04-30", nome: "Feriado no último dia" },
		]

		const { modifiers } = feriadosParaModifiers(
			feriadosDeBorda,
			new Date(2025, 3, 1),
		)

		expect(modifiers.feriado).toEqual([
			new Date(2025, 3, 1),
			new Date(2025, 3, 30),
		])
	})

	test("na virada de ano, considera apenas os feriados do ano/mês exibido", () => {
		const feriadosDeDezJan: Feriado[] = [
			{ data: "2025-12-25", nome: "Natal" },
			{ data: "2026-01-01", nome: "Ano Novo" },
		]

		const { modifiers } = feriadosParaModifiers(
			feriadosDeDezJan,
			new Date(2026, 0, 1),
		)

		expect(modifiers.feriado).toEqual([new Date(2026, 0, 1)])
	})

	test("retorna modifiersClassNames com a chave feriado", () => {
		const { modifiersClassNames } = feriadosParaModifiers(feriados2025, new Date(2025, 3, 1))

		expect(modifiersClassNames.feriado).toBeTypeOf("string")
		expect(modifiersClassNames.feriado.length).toBeGreaterThan(0)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/lib/feriados-para-modifiers.test.ts`
Expected: FAIL com `Cannot find module './feriados-para-modifiers'` (arquivo ainda não existe)

- **Step 3: Write minimal implementation**

```typescript
// apps/frontend/src/features/calendario/lib/feriados-para-modifiers.ts
import type { Matcher } from "react-day-picker"
import {
	FERIADO_HIGHLIGHT_CLASSNAME,
	type Feriado,
} from "../schemas/feriado.schema"

export interface FeriadosModifiers {
	modifiers: Record<"feriado", Matcher[]>
	modifiersClassNames: Record<"feriado", string>
}

function paraDataLocal(feriado: Feriado): Date {
	const [ano, mes, dia] = feriado.data.split("-").map(Number)
	return new Date(ano, mes - 1, dia)
}

export function feriadosParaModifiers(
	feriados: Feriado[],
	mesExibido: Date,
): FeriadosModifiers {
	const anoExibido = mesExibido.getFullYear()
	const mesExibidoIndex = mesExibido.getMonth()

	const datasDoMes = feriados
		.filter((feriado) => {
			const [ano, mes] = feriado.data.split("-").map(Number)
			return ano === anoExibido && mes - 1 === mesExibidoIndex
		})
		.map(paraDataLocal)

	return {
		modifiers: { feriado: datasDoMes },
		modifiersClassNames: { feriado: FERIADO_HIGHLIGHT_CLASSNAME },
	}
}
```

**Nota (achado da revisão de spec):** `modifiersClassNames.feriado` é aplicado pelo `react-day-picker` à célula `role="gridcell"` (`components.Day`), não ao botão interativo (`components.DayButton`) — confirmado lendo o código-fonte real do pacote (`DayPicker.js`: `getClassNamesForModifiers` alimenta o `className` de `components.Day`; `components.DayButton` recebe só `classNames[UI.DayButton]`, fixo). O destaque visível que o usuário vê no botão é responsabilidade exclusiva de `DiaComFeriado` (Task 3), que reaplica a mesma constante `FERIADO_HIGHLIGHT_CLASSNAME` (importada de `../schemas/feriado.schema`, criada na Task 1) para manter os dois nós de DOM consistentes sem duplicar a string literal.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/lib/feriados-para-modifiers.test.ts`
Expected: `Test Files  1 passed (1)` / `Tests  5 passed (5)`

- **Step 5: Commit** *(execução sequencial apenas — em uma wave paralela o orquestrador commita na barreira de integração; se seu prompt indicar que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/features/calendario/lib/feriados-para-modifiers.ts apps/frontend/src/features/calendario/lib/feriados-para-modifiers.test.ts
git commit -m "feat(calendario): converte feriados do mes exibido em modifiers do react-day-picker"
```

## Critérios de Sucesso

- `feriadosParaModifiers(feriados, mesExibido)` retorna apenas os feriados cujo ano/mês batem com `mesExibido`, como `Date[]` em `modifiers.feriado` [FR-002].
- Casos de borda cobertos por teste: mês sem feriado, feriado no primeiro dia do mês, feriado no último dia do mês, virada de ano (dezembro → janeiro).
- `modifiersClassNames.feriado` é uma string de classes Tailwind não vazia, usada pelo `Calendar` para destacar visualmente o dia.
