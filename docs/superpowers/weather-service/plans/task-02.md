# Task 02: Frontend: schema Zod de validação do nome da cidade

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-frontend-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Cria o schema Zod `citySchema` usado pelo `WeatherSearchForm` (task-06) via `zodResolver` para validar o campo de busca de cidade antes de disparar a consulta de clima. Rejeita string vazia ou só espaços em branco com a mensagem "Informe o nome de uma cidade.".

## Arquivos

- Create: `apps/frontend/src/features/weather/schemas/index.ts`
- Test: `apps/frontend/src/features/weather/schemas/index.test.ts`

### Conformidade com as Skills Padrão

- `zod`: definição do schema de validação (`citySchema`) e da regra `trim().min(1, ...)`.
- `typescript-advanced`: uso de `z.infer<typeof citySchema>` para derivar o tipo `CityInput` sem duplicar a forma manualmente.

## Passos

- **Step 1: Escrever o teste que falha**

```ts
// apps/frontend/src/features/weather/schemas/index.test.ts
import { describe, expect, test } from "vitest"
import { citySchema } from "./index"

describe("citySchema", () => {
    test("aceita um nome de cidade válido", () => {
        const result = citySchema.safeParse({ city: "São Paulo" })

        expect(result.success).toBe(true)
        expect(result.success && result.data.city).toBe("São Paulo")
    })

    test("rejeita string vazia com a mensagem correta", () => {
        const result = citySchema.safeParse({ city: "" })

        expect(result.success).toBe(false)
        expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
            "Informe o nome de uma cidade.",
        )
    })

    test("rejeita string só com espaços em branco", () => {
        const result = citySchema.safeParse({ city: "   " })

        expect(result.success).toBe(false)
        expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
            "Informe o nome de uma cidade.",
        )
    })
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/weather/schemas/index.test.ts`
Expected: FAIL — `Cannot find module './index'` (o arquivo `index.ts` ainda não existe).

- **Step 3: Implementação mínima**

```ts
// apps/frontend/src/features/weather/schemas/index.ts
import { z } from "zod"

export const citySchema = z.object({
    city: z.string().trim().min(1, "Informe o nome de uma cidade."),
})

export type CityInput = z.infer<typeof citySchema>
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/weather/schemas/index.test.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/weather/schemas/index.ts apps/frontend/src/features/weather/schemas/index.test.ts
git commit -m "feat(weather): add city name zod schema"
```

## Critérios de Sucesso

- `citySchema.safeParse({ city: "São Paulo" })` retorna `success: true` com `data.city === "São Paulo"`.
- `citySchema.safeParse({ city: "" })` e `citySchema.safeParse({ city: "   " })` retornam `success: false` com a mensagem "Informe o nome de uma cidade.".
- `CityInput` é inferido de `citySchema` via `z.infer`, sem tipo duplicado manualmente.
