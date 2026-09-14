# Task 3: Implementar tela autenticada de calendário por ano [FR-002, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Criar a rota autenticada `/calendario` como Client Component, usando o hook de feriados para renderizar ano atual por padrão, navegação anterior/próximo, estados de loading/erro/retry e layout alinhado ao mockup aprovado.

## Arquivos

- Create: `apps/frontend/src/app/(authenticated)/calendario/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/calendario/page.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: não esconder falhas da API com dados falsos; mostrar erro recuperável.
- `test-antipatterns`: testar comportamento da tela com MSW/hook real, não mocks de componente.
- `tanstack-query-best-practices`: consumir `useFeriadosQuery` sem recriar cache ou query keys na UI.
- `vercel-react-best-practices`: derivar meses/dias de dados e estado primitivo, evitando estado duplicado.
- `tailwindcss`: usar tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`) e responsividade mobile-first.
- `shadcn`: usar `PageHeader`, `Card`, `Button` e atributos acessíveis.
- `vitest`: cobrir sucesso, navegação de ano, loading/erro/retry com Testing Library.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/calendario-feriados-visual.md`.
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original para esta tela? Se não houver, seguir o mockup curado.
- **Ferramentas de fidelidade visual:** Visual Companion foi usado no brainstorming; nenhuma fonte externa foi informada.
- **Decisões visuais já tomadas:** `PageHeader` com ano e controles no topo; card principal para feriados; painel/estado lateral quando couber; loading/erro preservam navegação.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual`. Confirm the original design source with the user; if none exists, build to the curated mockup at `../specs/mockups/calendario-feriados-visual.md` manually.

- **Step 1: Write the failing test**

```tsx
import { HttpResponse, http } from "msw";
import { expect, test } from "vitest";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, screen, waitFor } from "@/test/render";
import { server } from "@/test/msw/server";
import CalendarPage from "./page";

test("renderiza feriados nacionais e permite navegar entre anos", async () => {
  server.use(
    http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
      HttpResponse.json([
        {
          date: "2026-04-21",
          name: "Tiradentes",
          type: "Feriado Nacional",
        },
      ]),
    ),
    http.get("https://brasilapi.com.br/api/feriados/v1/2027", () =>
      HttpResponse.json([
        {
          date: "2027-01-01",
          name: "Confraternização Universal",
          type: "Feriado Nacional",
        },
      ]),
    ),
  );

  renderWithProviders(<CalendarPage initialYear={2026} />);

  expect(
    screen.getByRole("heading", { name: "Calendário 2026" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Tiradentes")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Ano seguinte" }));

  expect(
    screen.getByRole("heading", { name: "Calendário 2027" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Confraternização Universal")).toBeInTheDocument();
});

test("mostra erro recuperável quando os feriados não carregam", async () => {
  server.use(
    http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
      HttpResponse.json({ message: "indisponível" }, { status: 503 }),
    ),
  );

  renderWithProviders(<CalendarPage initialYear={2026} />);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível carregar os feriados",
  );
  expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeEnabled();
});
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: FAIL with route module `./page` not found.

- **Step 3: Write minimal implementation**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useFeriadosQuery } from "@/features/calendario-feriados/api/use-feriados-query";

type CalendarPageProps = {
  initialYear?: number;
};

export default function CalendarPage({ initialYear }: CalendarPageProps) {
  const [selectedYear, setSelectedYear] = useState(
    () => initialYear ?? new Date().getFullYear(),
  );
  const { data = [], isPending, isError, refetch } =
    useFeriadosQuery(selectedYear);

  const sortedHolidays = useMemo(
    () => data.toSorted((a, b) => a.date.localeCompare(b.date)),
    [data],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Feriados nacionais"
        title={`Calendário ${selectedYear}`}
        subtitle="Consulte os feriados nacionais brasileiros por ano, sem sair da área logada."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              aria-label="Ano anterior"
              onClick={() => setSelectedYear((year) => year - 1)}
            >
              <ChevronLeft className="mr-2 size-4" aria-hidden="true" />
              {selectedYear - 1}
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Ano seguinte"
              onClick={() => setSelectedYear((year) => year + 1)}
            >
              {selectedYear + 1}
              <ChevronRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Feriados de {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p role="status" aria-live="polite">Carregando feriados...</p>
          ) : null}

          {isError ? (
            <EmptyState
              role="alert"
              title="Não foi possível carregar os feriados"
              description="A BrasilAPI não respondeu agora. Tente novamente em instantes."
              action={
                <Button type="button" onClick={() => void refetch()}>
                  <RefreshCcw className="mr-2 size-4" aria-hidden="true" />
                  Tentar novamente
                </Button>
              }
            />
          ) : null}

          {!isPending && !isError ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {sortedHolidays.map((holiday) => (
                <li
                  key={`${holiday.date}-${holiday.name}`}
                  className="rounded-xl border border-border bg-muted p-4"
                >
                  <time className="font-mono text-sm text-muted-foreground">
                    {holiday.date}
                  </time>
                  <strong className="mt-1 block text-foreground">
                    {holiday.name}
                  </strong>
                  <span className="text-sm text-muted-foreground">
                    {holiday.type}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run 'src/app/(authenticated)/calendario/page.test.tsx'`
Expected: PASS for render, year navigation and recoverable error state.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add 'apps/frontend/src/app/(authenticated)/calendario'
git commit -m "feat(frontend): adiciona tela de calendario de feriados"
```

## Critérios de Sucesso

- `FR-002`: `/calendario` existe dentro do grupo autenticado.
- `FR-004`: feriados nacionais renderizam para o ano selecionado.
- `FR-005`: ano atual é o padrão quando `initialYear` não é informado.
- `FR-006`: botões de ano anterior/próximo alteram o ano.
- `FR-007`: troca de ano atualiza a consulta e a UI.
- `FR-008`: loading é anunciado com `role="status"`.
- `FR-009`: erro é anunciado com `role="alert"`.
- `FR-010`: retry chama `refetch()`.
- `FR-011`: a página consome apenas o hook client-only, sem endpoint backend próprio.
