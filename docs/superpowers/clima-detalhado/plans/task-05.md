# Task 5: Mapa de condição WMO para ícone e rótulo [FR-002]

**Status:** DONE

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** standard

## Visão Geral

Função pura que transforma `{código WMO, isDay}` em categoria, rótulo em português e ícone. Código fora da tabela cai no ícone genérico com o texto "Condição indisponível", nunca no ícone de outra condição.

## Arquivos

- Create: `apps/frontend/src/features/weather/lib/weather-condition.ts`
- Test: `apps/frontend/src/features/weather/lib/weather-condition.test.ts`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons`, `PixelIcon` e os ícones `Sun`, `Moon`, `Cloud`, `CloudSun`, `CloudMoon`, `CloudFog`, `CloudDrizzle`, `CloudRain`, `Snowflake`, `Zap`, `CloudUnknown` (task-04).
- **Produz:** em `@/features/weather/lib/weather-condition`:
  ```ts
  export type ConditionCategory =
  	| "clear" | "partly-cloudy" | "cloudy" | "fog" | "drizzle"
  	| "rain" | "snow" | "thunderstorm" | "unknown"
  export function resolveCondition(code: number, isDay: boolean): { category: ConditionCategory; label: string; Icon: PixelIcon }
  ```

### Skills a invocar

- `typescript-advanced`: tabela WMO tipada como `Record` de categorias, sem `string` solto.
- `test-antipatterns`: testes afirmam categoria, rótulo e ícone devolvidos, sem espelhar a tabela da implementação por import.
- `wcag-audit-patterns`: o rótulo em texto é o nome acessível da condição (o ícone é decorativo).

## Passos

- **Step 1: Write the failing test**

```ts
import { describe, expect, test } from "vitest"
import {
	Cloud, CloudDrizzle, CloudFog, CloudMoon, CloudRain, CloudSun, CloudUnknown, Moon, Snowflake, Sun, Zap,
} from "@/components/ui/pixel-icons"
import { resolveCondition } from "./weather-condition"

describe("resolveCondition", () => {
	test.each([
		[[0, 1], "clear", "Céu limpo"],
		[[2], "partly-cloudy", "Parcialmente nublado"],
		[[3], "cloudy", "Nublado"],
		[[45, 48], "fog", "Névoa"],
		[[51, 53, 55, 56, 57], "drizzle", "Chuvisco"],
		[[61, 63, 65, 66, 67, 80, 81, 82], "rain", "Chuva"],
		[[71, 73, 75, 77, 85, 86], "snow", "Neve"],
		[[95, 96, 97, 99], "thunderstorm", "Tempestade"],
	] as const)("deve mapear os códigos %j para %s", (codes, category, label) => {
		for (const code of codes) {
			const result = resolveCondition(code, true)
			expect(result.category).toBe(category)
			expect(result.label).toBe(label)
		}
	})

	test("AC-05: deve usar sol de dia e lua à noite para os códigos 0 e 1, e chuva para o 61", () => {
		for (const code of [0, 1]) {
			expect(resolveCondition(code, true).Icon).toBe(Sun)
			expect(resolveCondition(code, false).Icon).toBe(Moon)
		}
		expect(resolveCondition(61, true).Icon).toBe(CloudRain)
		expect(resolveCondition(61, false).Icon).toBe(CloudRain)
	})

	test("deve usar o ícone da categoria nas demais condições", () => {
		expect(resolveCondition(2, true).Icon).toBe(CloudSun)
		expect(resolveCondition(2, false).Icon).toBe(CloudMoon)
		expect(resolveCondition(3, true).Icon).toBe(Cloud)
		expect(resolveCondition(45, true).Icon).toBe(CloudFog)
		expect(resolveCondition(53, true).Icon).toBe(CloudDrizzle)
		expect(resolveCondition(73, true).Icon).toBe(Snowflake)
		expect(resolveCondition(95, true).Icon).toBe(Zap)
	})

	test("AC-04: deve usar o ícone genérico e nenhum rótulo de outra condição quando o código não está na tabela", () => {
		const result = resolveCondition(999, true)
		const others = [0, 2, 3, 45, 51, 61, 71, 95].map((code) => resolveCondition(code, true))

		expect(result.category).toBe("unknown")
		expect(result.Icon).toBe(CloudUnknown)
		expect(result.label).toBe("Condição indisponível")
		for (const other of others) {
			expect(other.Icon).not.toBe(result.Icon)
			expect(other.label).not.toBe(result.label)
		}
	})
})
```

- **Step 2: Review Focus: Código WMO fora da tabela → ícone genérico e texto "Condição indisponível", sem lançar — Write the failing test**

No mesmo `describe("resolveCondition")`:

```ts
test("Review Focus: códigos fora da tabela não lançam e viram ícone genérico com Condição indisponível", () => {
	for (const code of [-1, 4, 44, 100, 1000]) {
		expect(() => resolveCondition(code, false)).not.toThrow()
		const result = resolveCondition(code, false)
		expect(result.Icon).toBe(CloudUnknown)
		expect(result.label).toBe("Condição indisponível")
	}
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/lib/weather-condition.test.ts`
Expected: FAIL — `./weather-condition` não existe.

- **Step 4: Implement `resolveCondition(code: number, isDay: boolean)` e `ConditionCategory` em `apps/frontend/src/features/weather/lib/weather-condition.ts`**

Tabela código → categoria como nos testes (os códigos fora dela dão `unknown`). Rótulos: "Céu limpo", "Parcialmente nublado", "Nublado", "Névoa", "Chuvisco", "Chuva", "Neve", "Tempestade", "Condição indisponível". Ícones: `clear` → `Sun` de dia / `Moon` à noite; `partly-cloudy` → `CloudSun` / `CloudMoon`; `cloudy` → `Cloud`; `fog` → `CloudFog`; `drizzle` → `CloudDrizzle`; `rain` → `CloudRain`; `snow` → `Snowflake`; `thunderstorm` → `Zap`; `unknown` → `CloudUnknown`.

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/weather/lib/weather-condition.test.ts`
Expected: PASS

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/frontend/src/features/weather/lib/weather-condition.ts apps/frontend/src/features/weather/lib/weather-condition.test.ts
git commit -m "feat(weather): mapa de condição WMO para ícone e rótulo

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- Todo código da tabela WMO cai na categoria certa; o desconhecido nunca lança nem usa o ícone de outra condição.
- AC-04 [unit]: WHEN o código WMO não está na tabela THEN o ícone é o genérico e nenhuma outra condição é mostrada
- AC-05 [unit]: WHEN o código é 0 ou 1 THEN o ícone é sol de dia e lua à noite; WHEN é 61 THEN é chuva
