# Task 1: Obter feriados nacionais do ano via `date-holidays` [FR-003]

**Status:** PENDING
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria o hook `useFeriadosDoAno(ano)`, que calcula localmente (sem rede) a lista de feriados nacionais do Brasil para um ano informado, usando a biblioteca `date-holidays`, memoizado por ano com `useMemo`. O shape do feriado é validado por um schema Zod (`feriadoSchema`), usado por este hook e reutilizado pelas tasks seguintes.

API confirmada de `date-holidays@3.36.1` (verificada via `.d.ts` do pacote): `new Holidays(country: string, opts?: { types?: HolidayType[] })`; `getHolidays(year?: number): Holiday[]` retorna objetos `{ date: string /* "YYYY-MM-DD hh:mm:ss" local, sem timezone */, name: string, type: 'public'|'bank'|'optional'|'school'|'observance', ... }`. Passar `types: ["public"]` restringe às feriados nacionais oficiais (o que a spec chama de "feriados nacionais"), excluindo `observance`/`optional`/`school`/`bank`.

Dados reais confirmados via execução da lib para `BR`, ano 2025 (usados nos testes abaixo): `2025-01-01 Ano Novo`, `2025-04-18 Sexta-Feira Santa` (data móvel, calculada a partir da Páscoa), `2025-04-21 Dia de Tiradentes` (data fixa), `2025-12-25 Natal`. Para 2026: `2026-04-21 Dia de Tiradentes` (mesma data fixa, ano diferente).

## Arquivos

- Modify: `apps/frontend/package.json` (adiciona dependência `date-holidays`)
- Create: `apps/frontend/src/features/calendario/schemas/feriado.schema.ts`
- Create: `apps/frontend/src/features/calendario/hooks/use-feriados-do-ano.ts`
- Test: `apps/frontend/src/features/calendario/hooks/use-feriados-do-ano.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o tipo `Feriado` é derivado do schema Zod via `z.infer<typeof feriadoSchema>` — modelagem de tipo a partir de validação em runtime.
- `test-antipatterns`: o teste de memoização deve verificar o comportamento real do hook (igualdade de referência entre renders) em vez de mockar `date-holidays` — a lib é pura/local e barata de rodar de verdade.
- `vercel-react-best-practices`: uso de `useMemo` com a chave de dependência correta (`[ano]`) para evitar recomputar a lista de feriados a cada render.

## Passos

- **Step 1: Instalar a dependência `date-holidays`**

```bash
cd apps/frontend && pnpm add date-holidays@3.36.1
```

Expected: `apps/frontend/package.json` ganha `"date-holidays": "3.36.1"` em `dependencies`; `pnpm-lock.yaml` é atualizado.

- **Step 2: Write the failing test**

```typescript
// apps/frontend/src/features/calendario/hooks/use-feriados-do-ano.test.ts
import { renderHook } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { useFeriadosDoAno } from "./use-feriados-do-ano"

describe("useFeriadosDoAno", () => {
	test("retorna os feriados nacionais fixos e móveis do ano informado", () => {
		const { result } = renderHook(() => useFeriadosDoAno(2025))

		expect(result.current).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ data: "2025-01-01", nome: "Ano Novo" }),
				expect.objectContaining({
					data: "2025-04-18",
					nome: "Sexta-Feira Santa",
				}),
				expect.objectContaining({
					data: "2025-04-21",
					nome: "Dia de Tiradentes",
				}),
				expect.objectContaining({ data: "2025-12-25", nome: "Natal" }),
			]),
		)
	})

	test("não recalcula a lista de feriados quando o ano não muda entre renders", () => {
		const { result, rerender } = renderHook(
			({ ano }: { ano: number }) => useFeriadosDoAno(ano),
			{ initialProps: { ano: 2025 } },
		)
		const primeiraLista = result.current
		rerender({ ano: 2025 })

		expect(result.current).toBe(primeiraLista)
	})

	test("recalcula a lista de feriados quando o ano muda entre renders", () => {
		const { result, rerender } = renderHook(
			({ ano }: { ano: number }) => useFeriadosDoAno(ano),
			{ initialProps: { ano: 2025 } },
		)
		const feriados2025 = result.current
		rerender({ ano: 2026 })

		expect(result.current).not.toBe(feriados2025)
		expect(result.current).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					data: "2026-04-21",
					nome: "Dia de Tiradentes",
				}),
			]),
		)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/hooks/use-feriados-do-ano.test.ts`
Expected: FAIL com `Cannot find module './use-feriados-do-ano'` (arquivo ainda não existe)

- **Step 4: Write minimal implementation — schema**

```typescript
// apps/frontend/src/features/calendario/schemas/feriado.schema.ts
import { z } from "zod"

export const feriadoSchema = z.object({
	data: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "data deve estar no formato YYYY-MM-DD"),
	nome: z.string().min(1),
})

export type Feriado = z.infer<typeof feriadoSchema>

/**
 * Classe Tailwind do destaque visual de um dia de feriado.
 * Fonte única: usada pela Task 2 (`modifiersClassNames.feriado`, aplicado pelo
 * react-day-picker à célula `role="gridcell"`) e pela Task 3 (`DiaComFeriado`,
 * aplicado ao botão interativo) — dois nós de DOM diferentes que devem
 * parecer visualmente consistentes sem duplicar a string literal.
 */
export const FERIADO_HIGHLIGHT_CLASSNAME =
	"bg-primary/10 font-semibold text-primary"
```

- **Step 5: Write minimal implementation — hook**

```typescript
// apps/frontend/src/features/calendario/hooks/use-feriados-do-ano.ts
import Holidays from "date-holidays"
import { useMemo } from "react"
import { type Feriado, feriadoSchema } from "../schemas/feriado.schema"

export function useFeriadosDoAno(ano: number): Feriado[] {
	return useMemo(() => {
		const holidays = new Holidays("BR", { types: ["public"] })
		return holidays.getHolidays(ano).map((holiday) =>
			feriadoSchema.parse({
				data: holiday.date.slice(0, 10),
				nome: holiday.name,
			}),
		)
	}, [ano])
}
```

- **Step 6: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/calendario/hooks/use-feriados-do-ano.test.ts`
Expected: `Test Files  1 passed (1)` / `Tests  3 passed (3)`

- **Step 7: Commit** *(sequential execution only — em uma wave paralela o orquestrador commita na barreira de integração; se seu prompt indicar que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/package.json apps/frontend/pnpm-lock.yaml apps/frontend/src/features/calendario/schemas/feriado.schema.ts apps/frontend/src/features/calendario/hooks/use-feriados-do-ano.ts apps/frontend/src/features/calendario/hooks/use-feriados-do-ano.test.ts
git commit -m "feat(calendario): calcula feriados nacionais do ano via date-holidays"
```

## Critérios de Sucesso

- `useFeriadosDoAno(ano)` retorna a lista de feriados nacionais (`type: "public"`) do ano informado, calculada localmente sem qualquer chamada de rede [FR-003].
- Cada feriado tem `data` normalizada para `YYYY-MM-DD` (sem hora/fuso), mitigando o risco de deslocamento de data descrito na spec.
- A lista é memoizada por ano: chamadas consecutivas com o mesmo `ano` retornam a mesma referência; mudar o `ano` produz uma nova lista.
