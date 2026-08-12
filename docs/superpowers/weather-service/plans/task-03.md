# Task 03: Frontend: componente `CurrentWeatherDisplay`

**Status:** PENDING
**PRD:** N/A
**Spec:** ../specs/weather-service-frontend-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria o componente de apresentação `CurrentWeatherDisplay`, que exibe o resultado da consulta de clima: temperatura atual em destaque (hero) seguida de duas tiles secundárias com mínima e máxima, dentro de um `Card` do design system. É puramente apresentacional — recebe `city`/`temperature` via props e não busca dados (isso é responsabilidade da `WeatherPage`, task-14).

## Arquivos

- Create: `apps/frontend/src/features/weather/components/current-weather-display.tsx`
- Test: `apps/frontend/src/features/weather/components/current-weather-display.test.tsx`

### Conformidade com as Skills Padrão

- `react`: componente funcional com props tipadas, sem estado local.
- `shadcn`: reaproveitamento do `Card` do design system (`@/components/ui/card`) como container.
- `tailwindcss`: classes utilitárias para o layout hero + grid de tiles (Tailwind v4, tokens do tema — `text-muted-foreground`, `border-border`).
- `typescript-advanced`: shape de `temperature` (`{ current, min, max }`) tipado explicitamente na prop `CurrentWeatherDisplayProps`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/weather-service-frontend-visual.md`
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** não aplicável (nenhuma fonte externa)
- **Ferramentas de fidelidade visual:** nenhuma configurada além do preview local já usado na aprovação; construir manualmente a partir do mockup
- **Decisões visuais já tomadas:** hero (temperatura atual, `font-mono`, ~56px) + linha de duas tiles secundárias (mínima/máxima), não três cards equivalentes; tokens VOLT dark; fonte mono para todos os números

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler a subseção `### Fidelidade Visual` acima: não há fonte de design externa (Figma/URL) para esta tela — o mockup curado em `../specs/mockups/weather-service-frontend-visual.md` é a única referência (o *norte* de layout, espaçamento e tokens) e não há ferramenta de fidelidade visual configurada neste ambiente além do preview local. Confirmar com o usuário que não existe uma fonte de design original antes de prosseguir; se surgir uma, usá-la em vez do mockup. Caso contrário, seguir construindo manualmente a partir do mockup, reutilizando as decisões visuais já tomadas (hero + tiles, tokens VOLT dark, `font-mono` para números) sem re-derivá-las.

- **Step 1: Confirmar o import real de `Card`**

`apps/frontend/src/components/ui/card.tsx` exporta `Card` como `function Card({ className, ...props }: React.ComponentProps<"div">)`, que renderiza uma `div` com `data-slot="card"` e classes base (`flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm`) mescladas via `cn(...)` com o `className` recebido. O import `import { Card } from "@/components/ui/card"` e o uso `<Card className="...">` do código abaixo já são compatíveis com essa API real — nenhum ajuste necessário.

- **Step 2: Escrever o teste que falha**

```tsx
// apps/frontend/src/features/weather/components/current-weather-display.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CurrentWeatherDisplay } from "./current-weather-display"

describe("CurrentWeatherDisplay", () => {
    test("renderiza cidade e temperaturas atual, mínima e máxima", () => {
        render(
            <CurrentWeatherDisplay
                city="São Paulo"
                temperature={{ current: 24, min: 18, max: 27 }}
            />,
        )

        expect(screen.getByText("São Paulo")).toBeInTheDocument()
        expect(screen.getByText("24°C")).toBeInTheDocument()
        expect(screen.getByText("18°C")).toBeInTheDocument()
        expect(screen.getByText("27°C")).toBeInTheDocument()
    })
})
```

- **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/weather/components/current-weather-display.test.tsx`
Expected: FAIL — `Cannot find module './current-weather-display'` (o arquivo `current-weather-display.tsx` ainda não existe).

- **Step 4: Implementação mínima**

```tsx
// apps/frontend/src/features/weather/components/current-weather-display.tsx
import { Card } from "@/components/ui/card"

export interface CurrentWeatherDisplayProps {
    city: string
    temperature: { current: number; min: number; max: number }
}

export function CurrentWeatherDisplay({
    city,
    temperature,
}: CurrentWeatherDisplayProps) {
    return (
        <Card className="flex flex-col gap-5 p-5">
            <p className="text-sm text-muted-foreground">{city}</p>
            <p className="font-mono text-5xl font-semibold leading-none">
                {temperature.current}°C
            </p>
            <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[10px] border border-border p-3">
                    <p className="text-[11px] text-muted-foreground">Mínima</p>
                    <p className="font-mono text-xl font-semibold">
                        {temperature.min}°C
                    </p>
                </div>
                <div className="rounded-[10px] border border-border p-3">
                    <p className="text-[11px] text-muted-foreground">Máxima</p>
                    <p className="font-mono text-xl font-semibold">
                        {temperature.max}°C
                    </p>
                </div>
            </div>
        </Card>
    )
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/weather/components/current-weather-display.test.tsx`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  1 passed (1)`.

- **Step 6: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/weather/components/current-weather-display.tsx apps/frontend/src/features/weather/components/current-weather-display.test.tsx
git commit -m "feat(weather): add CurrentWeatherDisplay component"
```

## Critérios de Sucesso

- `CurrentWeatherDisplay` renderiza o nome da cidade e a temperatura atual em destaque, mais duas tiles com mínima e máxima, dentro de um `Card`.
- Com `city="São Paulo"` e `temperature={{current:24,min:18,max:27}}`, a tela mostra "São Paulo", "24°C", "18°C" e "27°C".
- Layout segue o mockup aprovado (`../specs/mockups/weather-service-frontend-visual.md`): hero + linha de tiles, não três cards equivalentes.
