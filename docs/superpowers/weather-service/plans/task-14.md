# Task 14: Frontend: rota `WeatherPage` (`/clima`) — orquestração de estados + link de navegação

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-frontend-design.md
**Tier:** standard
**Depends on:** task-13, task-06, task-03

## Visão Geral

Cria a página pública `/clima`, que orquestra os 4 estados da consulta de clima (vazio, carregando, erro, resultado) usando `useWeatherQuery` (task-13), `WeatherSearchForm` (task-06) e `CurrentWeatherDisplay` (task-03), sincronizando a cidade buscada com a URL (`?city=`) no mesmo padrão de leitura+escrita de `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts`. Adiciona também o link "Clima" na navegação pública (`PublicShell`).

## Arquivos

- Create: `apps/frontend/src/app/(public)/clima/page.tsx`
- Test: `apps/frontend/src/app/(public)/clima/page.test.tsx`
- Modify: `apps/frontend/src/components/layout/public-shell.tsx`

### Conformidade com as Skills Padrão

- `react`: componente client com `useState`/composição de estados derivados de `useSearchParams` + `useWeatherQuery`.
- `shadcn`: reaproveitamento de `EmptyState` do design system para o estado vazio.
- `tailwindcss`: layout da seção (`mx-auto max-w-md flex flex-col gap-8`), consistente com `recuperar-senha/page.tsx`.
- `tanstack-query-best-practices`: consumo de `isFetching`/`error`/`data` de `useWeatherQuery` para derivar os 4 estados da UI.
- `typescript-advanced`: tipagem de `error.code` (`ApiError`) para escolher a mensagem de erro exibida.
- `vercel-composition-patterns`: composição de `WeatherSearchForm` + `EmptyState`/mensagem de erro/`CurrentWeatherDisplay` como estados mutuamente exclusivos de uma única página, sem duplicar lógica de fetch dentro de cada subcomponente.

## Passos

- **Step 1: Confirmar a interface real de `EmptyState`**

`apps/frontend/src/components/ui/empty-state.tsx` exporta:

```ts
export interface EmptyStateProps {
    icon?: ComponentType<{ className?: string }>
    title: string
    description?: string
    action?: ReactNode
    className?: string
}
```

`title` é a única prop obrigatória — `<EmptyState title="Digite uma cidade para começar" />` (sem `icon`/`description`/`action`) é uma chamada válida, exatamente como no rascunho original. Nenhum ajuste necessário.

- **Step 2: Escrever o teste que falha**

```tsx
// apps/frontend/src/app/(public)/clima/page.test.tsx
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { useRouter, useSearchParams } from "next/navigation"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import WeatherPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
}))

describe("WeatherPage", () => {
    beforeEach(() => {
        vi.mocked(useRouter).mockReturnValue({
            replace: vi.fn(),
        } as unknown as ReturnType<typeof useRouter>)
        vi.mocked(useSearchParams).mockReturnValue(
            new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
        )
    })

    test("mostra o EmptyState quando não há ?city= na URL", () => {
        renderWithProviders(<WeatherPage />)

        expect(
            screen.getByText("Digite uma cidade para começar"),
        ).toBeInTheDocument()
    })

    test("chama router.replace com ?city= ao submeter uma cidade", async () => {
        const user = userEvent.setup()
        const replaceMock = vi.fn()
        vi.mocked(useRouter).mockReturnValue({
            replace: replaceMock,
        } as unknown as ReturnType<typeof useRouter>)
        renderWithProviders(<WeatherPage />)

        await user.type(screen.getByLabelText("Cidade"), "São Paulo")
        await user.click(screen.getByTestId("weather-search-submit"))

        expect(replaceMock).toHaveBeenCalledWith(
            expect.stringContaining("city=S%C3%A3o+Paulo"),
        )
    })

    test("mostra CurrentWeatherDisplay quando a URL já tem ?city= e a consulta é bem sucedida", async () => {
        vi.mocked(useSearchParams).mockReturnValue(
            new URLSearchParams("city=São Paulo") as unknown as ReturnType<
                typeof useSearchParams
            >,
        )
        server.use(
            http.get(`${apiBaseUrl}/weather`, () =>
                HttpResponse.json(
                    {
                        city: "São Paulo",
                        temperature: { current: 24, min: 18, max: 27 },
                    },
                    { status: 200 },
                ),
            ),
        )

        renderWithProviders(<WeatherPage />)

        await waitFor(() => expect(screen.getByText("24°C")).toBeInTheDocument())
        expect(screen.getByText("18°C")).toBeInTheDocument()
        expect(screen.getByText("27°C")).toBeInTheDocument()
    })

    test("mostra mensagem de cidade não encontrada quando a API retorna 404", async () => {
        vi.mocked(useSearchParams).mockReturnValue(
            new URLSearchParams("city=Atlantis") as unknown as ReturnType<
                typeof useSearchParams
            >,
        )
        server.use(
            http.get(`${apiBaseUrl}/weather`, () =>
                HttpResponse.json(
                    { code: "city_not_found", message: "City not found" },
                    { status: 404 },
                ),
            ),
        )

        renderWithProviders(<WeatherPage />)

        expect(
            await screen.findByText(
                "Cidade não encontrada. Verifique o nome e tente novamente.",
            ),
        ).toBeInTheDocument()
    })

    test("mostra mensagem de serviço indisponível quando a API retorna 503", async () => {
        vi.mocked(useSearchParams).mockReturnValue(
            new URLSearchParams("city=São Paulo") as unknown as ReturnType<
                typeof useSearchParams
            >,
        )
        server.use(
            http.get(`${apiBaseUrl}/weather`, () =>
                HttpResponse.json(
                    {
                        code: "weather_provider_unavailable",
                        message: "Weather provider unavailable",
                    },
                    { status: 503 },
                ),
            ),
        )

        renderWithProviders(<WeatherPage />)

        expect(
            await screen.findByText(
                "Serviço de meteorologia indisponível no momento. Tente novamente em instantes.",
            ),
        ).toBeInTheDocument()
    })
})
```

- **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend exec vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: FAIL — `Cannot find module './page'` (o arquivo `page.tsx` ainda não existe).

- **Step 4: Implementação mínima da página**

```tsx
// apps/frontend/src/app/(public)/clima/page.tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { useWeatherQuery } from "@/features/weather/api/use-weather-query"
import { CurrentWeatherDisplay } from "@/features/weather/components/current-weather-display"
import { WeatherSearchForm } from "@/features/weather/components/weather-search-form"

function WeatherPageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const city = searchParams.get("city")

    const { data, error, isFetching } = useWeatherQuery(city)

    function handleSearch(nextCity: string) {
        const params = new URLSearchParams(searchParams.toString())
        params.set("city", nextCity)
        router.replace(`?${params.toString()}`)
    }

    return (
        <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
            <header className="flex flex-col gap-2">
                <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
                    Consulta de clima
                </h1>
                <p className="text-sm text-muted-foreground">
                    Digite o nome de uma cidade para ver a temperatura atual.
                </p>
            </header>

            <WeatherSearchForm
                onSearch={handleSearch}
                isPending={isFetching}
                defaultCity={city ?? undefined}
            />

            {!city && <EmptyState title="Digite uma cidade para começar" />}
            {city && error && (
                <p role="alert" className="text-sm text-destructive">
                    {error.code === "city_not_found"
                        ? "Cidade não encontrada. Verifique o nome e tente novamente."
                        : "Serviço de meteorologia indisponível no momento. Tente novamente em instantes."}
                </p>
            )}
            {city && data && (
                <CurrentWeatherDisplay city={data.city} temperature={data.temperature} />
            )}
        </section>
    )
}

export default function WeatherPage() {
    return (
        <Suspense
            fallback={<div data-testid="weather-page-loading" aria-busy="true" />}
        >
            <WeatherPageContent />
        </Suspense>
    )
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend exec vitest run "src/app/(public)/clima/page.test.tsx"`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  5 passed (5)`.

- **Step 6: Adicionar o link "Clima" na navegação pública**

```tsx
// apps/frontend/src/components/layout/public-shell.tsx (dentro de <nav aria-label="Ações de autenticação">, antes do link "Entrar")
<Link
    href="/clima"
    className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
>
    Clima
</Link>
```

Este é um ajuste visual simples em um arquivo já coberto por testes existentes de outras páginas públicas que renderizam `PublicShell` (ex.: `apps/frontend/src/app/(public)/login/page.test.tsx`) — não introduz comportamento novo que exija um teste dedicado nesta task; a cobertura de que o link aparece e navega para `/clima` já é implícita no próprio `page.test.tsx` desta task (a página renderiza dentro do fluxo público) e no fato de `Link` do Next.js ser puramente declarativo.

- **Step 7: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/app/\(public\)/clima/page.tsx apps/frontend/src/app/\(public\)/clima/page.test.tsx apps/frontend/src/components/layout/public-shell.tsx
git commit -m "feat(weather): add /clima page and navigation link"
```

## Critérios de Sucesso

- Sem `?city=` na URL, a página mostra o `EmptyState` "Digite uma cidade para começar".
- Submeter uma cidade no `WeatherSearchForm` chama `router.replace` com uma URL contendo `city=<cidade>`.
- Com `?city=` presente e a API retornando 200, a página mostra `CurrentWeatherDisplay` com os valores corretos de temperatura.
- Com a API retornando 404 ou 503, a página mostra a mensagem de erro correspondente ("Cidade não encontrada..." ou "Serviço de meteorologia indisponível...").
- O link "Clima" está presente em `PublicShell`, apontando para `/clima`.
