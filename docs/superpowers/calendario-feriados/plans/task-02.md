# Task 2: Criar consulta client-only de feriados nacionais [FR-004, FR-007, FR-008, FR-009, FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-calendario-feriados.md`
**Spec:** `../specs/calendario-feriados-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Criar a fronteira client-only de dados da feature: modelo normalizado de feriado e hook `useFeriadosQuery(year)` com TanStack Query, query key serializável por ano, fetch direto na BrasilAPI e erro tipado com `ApiError`.

## Arquivos

- Create: `apps/frontend/src/features/calendario-feriados/model/feriado.ts`
- Create: `apps/frontend/src/features/calendario-feriados/api/use-feriados-query.ts`
- Test: `apps/frontend/src/features/calendario-feriados/api/use-feriados-query.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: validar/normalizar a resposta na fronteira em vez de espalhar `?.`, `as any` ou defaults silenciosos.
- `test-antipatterns`: usar MSW para simular rede e assertar comportamento do hook, não chamadas do mock.
- `tanstack-query-best-practices`: query key em array, dependência `year` na key, retry/cache explícitos e erro tratado.
- `vercel-react-best-practices`: evitar transformações pesadas no render; normalizar no `queryFn`.
- `typescript-advanced`: manter tipos de payload bruto e view model sem casts evasivos.
- `vitest`: usar `renderHook`, `waitFor` e wrapper de providers do projeto.
- `context7`: consultar docs atuais do TanStack Query se houver dúvida sobre opções de `useQuery`.

## Passos

- **Step 1: Write the failing test**

```tsx
import { HttpResponse, http } from "msw";
import { describe, expect, test } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { server } from "@/test/msw/server";
import { wrapper } from "@/test/render";
import { useFeriadosQuery } from "./use-feriados-query";

describe("useFeriadosQuery", () => {
  test("busca e normaliza feriados nacionais por ano", async () => {
    server.use(
      http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
        HttpResponse.json([
          {
            date: "2026-01-01",
            name: " Confraternização Universal ",
            type: "Feriado Nacional",
          },
        ]),
      ),
    );

    const { result } = renderHook(() => useFeriadosQuery(2026), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      {
        date: "2026-01-01",
        name: "Confraternização Universal",
        type: "Feriado Nacional",
        isNational: true,
      },
    ]);
  });

  test("retorna ApiError quando a BrasilAPI falha", async () => {
    server.use(
      http.get("https://brasilapi.com.br/api/feriados/v1/2026", () =>
        HttpResponse.json({ message: "indisponível" }, { status: 503 }),
      ),
    );

    const { result } = renderHook(() => useFeriadosQuery(2026), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("holidays_unavailable");
  });
});
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/api/use-feriados-query.test.tsx`
Expected: FAIL with module `./use-feriados-query` not found.

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/features/calendario-feriados/model/feriado.ts
export type Feriado = {
  date: string;
  name: string;
  type: string;
  isNational: boolean;
};
```

```ts
// apps/frontend/src/features/calendario-feriados/api/use-feriados-query.ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "@/lib/errors";
import type { Feriado } from "../model/feriado";

type BrasilApiHoliday = {
  date?: string;
  name?: string;
  type?: string;
};

export const feriadosQueryKey = (year: number) => ["feriados", year] as const;

function normalizeHoliday(raw: BrasilApiHoliday): Feriado | null {
  if (!raw.date || !raw.name || !raw.type) {
    return null;
  }

  return {
    date: raw.date,
    name: raw.name.trim(),
    type: raw.type,
    isNational: raw.type === "Feriado Nacional",
  };
}

async function fetchFeriados(year: number): Promise<Feriado[]> {
  const response = await fetch(
    `https://brasilapi.com.br/api/feriados/v1/${year}`,
  );

  if (!response.ok) {
    throw ApiError.fromStatus(response.status, "holidays_unavailable");
  }

  const payload = (await response.json()) as BrasilApiHoliday[];

  return payload.flatMap((holiday) => {
    const normalized = normalizeHoliday(holiday);
    return normalized ? [normalized] : [];
  });
}

export function useFeriadosQuery(
  year: number | null,
): UseQueryResult<Feriado[], ApiError> {
  return useQuery({
    queryKey: year ? feriadosQueryKey(year) : ["feriados", "disabled"],
    queryFn: () => {
      if (!year) {
        throw ApiError.fromStatus(400, "invalid_holiday_year");
      }

      return fetchFeriados(year);
    },
    enabled: Boolean(year),
    retry: 1,
    staleTime: 1000 * 60 * 60 * 24,
  });
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/calendario-feriados/api/use-feriados-query.test.tsx`
Expected: PASS for success normalization and error state.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/features/calendario-feriados
git commit -m "feat(frontend): adiciona consulta de feriados nacionais"
```

## Critérios de Sucesso

- `FR-004`: o hook entrega feriados nacionais normalizados por ano.
- `FR-007`: a query key inclui o ano selecionado.
- `FR-008`: TanStack Query expõe estado de carregamento.
- `FR-009`: falha da BrasilAPI vira `ApiError` recuperável.
- `FR-010`: consumidores podem chamar `refetch()`.
- `FR-011`: nenhum `api.GET`, endpoint backend ou tipo OpenAPI é usado.
