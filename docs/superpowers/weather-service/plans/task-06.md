# Task 06: Frontend: componente `WeatherSearchForm`

**Status:** PENDING
**PRD:** N/A
**Spec:** ../specs/weather-service-frontend-design.md
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Cria o formulário de busca de cidade (`WeatherSearchForm`), que valida o input com `citySchema` (task-02) via `react-hook-form` + `zodResolver`, seguindo o mesmo padrão de `apps/frontend/src/app/(public)/recuperar-senha/page.tsx` (`FormField` + `Button` do design system). O submit não chama uma mutation diretamente — invoca o callback `onSearch(city)`, desacoplando o formulário da sincronização de URL, que é responsabilidade da `WeatherPage` (task-14).

## Arquivos

- Create: `apps/frontend/src/features/weather/components/weather-search-form.tsx`
- Test: `apps/frontend/src/features/weather/components/weather-search-form.test.tsx`

### Conformidade com as Skills Padrão

- `react`: componente controlado por `react-hook-form`, `useId` para acessibilidade do `label`/`input`.
- `shadcn`: reaproveitamento de `Button` e `FormField` do design system.
- `zod`: validação via `citySchema` (task-02) com `zodResolver`.
- `tanstack-query-best-practices`: a prop `isPending` é desenhada para receber diretamente o `isFetching`/`isPending` de um hook TanStack Query (integração futura na task-14, via `useWeatherQuery`).
- `typescript-advanced`: `WeatherSearchFormProps` tipa `onSearch: (city: string) => void` e `defaultCity?: string` explicitamente.

## Passos

- **Step 1: Escrever o teste que falha**

```tsx
// apps/frontend/src/features/weather/components/weather-search-form.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { WeatherSearchForm } from "./weather-search-form"

describe("WeatherSearchForm", () => {
    test("chama onSearch com a cidade digitada ao submeter", async () => {
        const user = userEvent.setup()
        const onSearch = vi.fn()
        render(<WeatherSearchForm onSearch={onSearch} isPending={false} />)

        await user.type(screen.getByLabelText("Cidade"), "São Paulo")
        await user.click(screen.getByTestId("weather-search-submit"))

        expect(onSearch).toHaveBeenCalledWith("São Paulo")
    })

    test("mostra erro e não chama onSearch ao submeter vazio", async () => {
        const user = userEvent.setup()
        const onSearch = vi.fn()
        render(<WeatherSearchForm onSearch={onSearch} isPending={false} />)

        await user.click(screen.getByTestId("weather-search-submit"))

        expect(
            await screen.findByText("Informe o nome de uma cidade."),
        ).toBeInTheDocument()
        expect(onSearch).not.toHaveBeenCalled()
    })

    test("desabilita o botão e mostra 'Consultando…' quando isPending é true", () => {
        render(<WeatherSearchForm onSearch={vi.fn()} isPending={true} />)

        const button = screen.getByTestId("weather-search-submit")
        expect(button).toBeDisabled()
        expect(button).toHaveTextContent("Consultando…")
    })
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-search-form.test.tsx`
Expected: FAIL — `Cannot find module './weather-search-form'` (o arquivo ainda não existe).

- **Step 3: Implementação mínima**

```tsx
// apps/frontend/src/features/weather/components/weather-search-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { type CityInput, citySchema } from "@/features/weather/schemas"

export interface WeatherSearchFormProps {
    onSearch: (city: string) => void
    isPending: boolean
    defaultCity?: string
}

export function WeatherSearchForm({
    onSearch,
    isPending,
    defaultCity,
}: WeatherSearchFormProps) {
    const cityId = useId()
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CityInput>({
        resolver: zodResolver(citySchema),
        defaultValues: { city: defaultCity ?? "" },
    })

    function onSubmit(values: CityInput) {
        onSearch(values.city)
    }

    return (
        <form
            noValidate
            className="flex gap-2"
            onSubmit={handleSubmit(onSubmit)}
            aria-busy={isPending}
        >
            <FormField
                id={cityId}
                label="Cidade"
                placeholder="Ex: São Paulo"
                error={errors.city?.message}
                {...register("city")}
            />
            <Button
                type="submit"
                disabled={isPending}
                data-testid="weather-search-submit"
            >
                {isPending ? "Consultando…" : "Consultar"}
            </Button>
        </form>
    )
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/weather/components/weather-search-form.test.tsx`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/weather/components/weather-search-form.tsx apps/frontend/src/features/weather/components/weather-search-form.test.tsx
git commit -m "feat(weather): add WeatherSearchForm component"
```

## Critérios de Sucesso

- Digitar uma cidade e submeter chama `onSearch("São Paulo")` com o valor exato digitado.
- Submeter com o campo vazio mostra a mensagem "Informe o nome de uma cidade." e NÃO chama `onSearch`.
- Com `isPending=true`, o botão de submit fica desabilitado e mostra o texto "Consultando…" em vez de "Consultar".
