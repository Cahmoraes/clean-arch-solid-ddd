# Task 3: Conversor de unidades, direção do vento e leitura de `units` [FR-006, FR-007]

**Status:** PENDING

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** cheap

## Visão Geral

Funções puras do frontend que leem o sistema de unidades da URL, convertem °C e km/h para °F e mph, formatam o número e traduzem graus do vento em pontos cardeais em português. A tela só chama essas funções; nenhuma requisição nova.

## Arquivos

- Create: `apps/frontend/src/features/weather/lib/units.ts`
- Test: `apps/frontend/src/features/weather/lib/units.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** em `@/features/weather/lib/units`:
  ```ts
  export type UnitSystem = "metric" | "imperial"
  export function parseUnits(value: string | null): UnitSystem
  export function convertTemperature(celsius: number, units: UnitSystem): number // 1 casa decimal
  export function convertWindSpeed(kmh: number, units: UnitSystem): number // inteiro
  export function temperatureSuffix(units: UnitSystem): "°C" | "°F"
  export function windSuffix(units: UnitSystem): "km/h" | "mph"
  export function windDirectionLabel(degrees: number): string // N, NE, L, SE, S, SO, O, NO
  export function formatValue(value: number): string // pt-BR, até 1 casa: 22.4 -> "22,4", 24 -> "24"
  ```

### Skills a invocar

- `typescript-advanced`: união literal `UnitSystem` e retornos literais dos sufixos.
- `test-antipatterns`: testes de valores de referência, sem espelhar a fórmula.

## Passos

- **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest"
import {
	convertTemperature, convertWindSpeed, formatValue, parseUnits,
	temperatureSuffix, windDirectionLabel, windSuffix,
} from "./units"

describe("units", () => {
	test("AC-03: deve converter 22,4 °C para 72,3 °F e 12 km/h para 7 mph no sistema imperial", () => {
		expect(convertTemperature(22.4, "imperial")).toBe(72.3)
		expect(convertWindSpeed(12, "imperial")).toBe(7)
		expect(temperatureSuffix("imperial")).toBe("°F")
		expect(windSuffix("imperial")).toBe("mph")
	})

	test("AC-09: deve tratar units inválido ou ausente como métrico (°C, km/h)", () => {
		for (const value of [null, "", "banana", "IMPERIAL"]) {
			expect(parseUnits(value)).toBe("metric")
		}
		expect(parseUnits("imperial")).toBe("imperial")
		expect(convertTemperature(22.4, "metric")).toBe(22.4)
		expect(convertWindSpeed(12, "metric")).toBe(12)
		expect(temperatureSuffix("metric")).toBe("°C")
		expect(windSuffix("metric")).toBe("km/h")
	})

	test("deve formatar números em pt-BR com até 1 casa decimal", () => {
		expect(formatValue(22.4)).toBe("22,4")
		expect(formatValue(24)).toBe("24")
	})

	test("deve mapear graus para os 8 pontos cardeais em português", () => {
		const cases: Array<[number, string]> = [
			[45, "NE"], [90, "L"], [135, "SE"], [180, "S"], [225, "SO"], [270, "O"], [315, "NO"],
			[22, "N"], [23, "NE"],
		]
		for (const [degrees, label] of cases) expect(windDirectionLabel(degrees)).toBe(label)
	})
})
```

- **Step 2: Review Focus: Direção do vento 0 e 360 graus → ambas viram "N"; 359 vira "N" — Write the failing test**

No mesmo `describe("units")`:

```ts
test("Review Focus: direção do vento 0, 359 e 360 graus viram N", () => {
	expect(windDirectionLabel(0)).toBe("N")
	expect(windDirectionLabel(359)).toBe("N")
	expect(windDirectionLabel(360)).toBe("N")
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/lib/units.test.ts`
Expected: FAIL — `./units` não existe.

- **Step 4: Implement as funções de `## Interfaces` em `apps/frontend/src/features/weather/lib/units.ts`**

`parseUnits` devolve `"imperial"` só para o valor exato `"imperial"`. Temperatura: °F = °C × 9/5 + 32, arredondada a 1 casa (`Math.round(x * 10) / 10`); no métrico, o mesmo arredondamento sem converter. Vento: mph = km/h × 0,621371, `Math.round`; no métrico, `Math.round(kmh)`. `windDirectionLabel` usa 8 setores de 45° centrados nos pontos: `["N","NE","L","SE","S","SO","O","NO"][Math.round(degrees / 45) % 8]`. `formatValue` usa `toLocaleString("pt-BR", { maximumFractionDigits: 1 })`.

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/lib/units.test.ts`
Expected: PASS

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/src/features/weather/lib/units.ts apps/frontend/src/features/weather/lib/units.test.ts
git commit -m "feat(weather): conversor de unidades e direção do vento

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- Conversões conferem nos valores de referência e a direção do vento cobre os 8 pontos.
- AC-03 [unit]: WHEN a unidade é imperial THEN 22,4 °C aparece como 72,3 °F e 12 km/h como 7 mph
- AC-09 [unit]: WHEN `units` na URL é inválido ou ausente THEN a tela mostra °C, km/h
