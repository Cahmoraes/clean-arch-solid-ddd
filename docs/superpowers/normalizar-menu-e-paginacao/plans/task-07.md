# Task 7: Frontend — `/academias` usa `NumberedPagination` com total real

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** task-05, task-06

## Visão Geral

Substituir a paginação simples de `/academias` (baseada em `hasPrevious`/`hasNext` inferidos por heurística de tamanho de página) pela paginação numerada real usando `NumberedPagination` (criado na task-06) e o `total` real agora disponível via `PaginatedGyms.total` (produzido na task-05). `GymPagination` vira um wrapper fino sobre `NumberedPagination`. Esta task inclui uma mudança de teste NECESSÁRIA e ESPERADA: o testid antigo `gym-pagination-page` (texto "Página X") deixa de existir, substituído pelos testids numerados `gym-pagination-page-{p}`.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-pagination.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.test.tsx`

### Conformidade com as Skills Padrão

- `react`: `GymPagination` continua sendo um componente de apresentação puro, agora delegando toda a lógica de renderização/estado ativo para `NumberedPagination`.
- `tailwindcss`: preservar quaisquer classes de espaçamento/layout já aplicadas ao redor do componente de paginação na página de academias.
- `tanstack-query-best-practices`: `activeQuery.data?.total` deve ser lido diretamente do resultado de `useAllGyms`/`useGymsByName` (via `PaginatedGyms`) sem duplicar o cálculo de total em outro lugar do componente.
- `test-antipatterns`: os 8 mocks MSW do arquivo de teste devem refletir o contrato real de resposta do backend (`{ gyms, pagination }`), não o formato antigo — teste deve validar comportamento observável (itens renderizados, testids ativos), não a estrutura interna do componente.
- `vitest`: manter a estrutura de describe/it já existente no arquivo de teste, adaptando apenas os mocks e as asserções do cenário de paginação.

## Passos

- **Step 1: Atualizar os 8 mocks MSW de `academias/page.test.tsx` para o novo shape (e confirmar que falham)**

Abra `apps/frontend/src/app/(authenticated)/academias/page.test.tsx` e localize as 8 chamadas de `server.use(...)` que hoje retornam arrays brutos via `fakeGyms(n)`. Atualize CADA UMA para o novo envelope, ajustando `total`/`page`/`limit` conforme o cenário específico de cada teste:

```typescript
// antes (exemplo genérico repetido nas 8 ocorrências):
// server.use(
//   http.get('*/gyms', () => HttpResponse.json(fakeGyms(5))),
// )

// depois:
server.use(
  http.get('*/gyms', () =>
    HttpResponse.json({
      gyms: fakeGyms(5),
      pagination: { total: 5, page: 1, limit: 20 },
    }),
  ),
)
```

Percorra o arquivo teste a teste: para cada uma das 8 ocorrências, identifique quantos itens `fakeGyms(n)` gera e qual página está sendo simulada, e defina `pagination.total` como o total real esperado pelo cenário daquele teste específico (por exemplo, um teste que simula "há mais páginas" deve usar um `total` maior que `limit`, enquanto um teste de "página final" deve usar um `total` que resulte em `totalPages` igual à página atual). Aplique o mesmo padrão tanto para os mocks de `*/gyms` quanto para os de `*/gyms/search/:name`, se houver ambos no arquivo.

Run: `pnpm --filter frontend test -- --run academias/page.test.tsx`
Expected: FAIL — os testes que dependem do novo shape falham porque `GymPagination`/`academias/page.tsx` ainda leem `hasPrevious`/`hasNext`/`items.length` em vez de `pagination.total`.

- **Step 2: Reescrever o teste de paginação numerada (e confirmar que falha)**

Localize o teste que hoje assere o testid `gym-pagination-page` com texto mudando de `/Página 1/` para `/Página 2/` ao clicar em "próximo". Reescreva-o para os novos testids numerados com verificação de estado ativo:

```typescript
it('paginação: clicar na página 2 ativa o link correspondente', async () => {
  server.use(
    http.get('*/gyms', ({ request }) => {
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page') ?? '1')
      return HttpResponse.json({
        gyms: fakeGyms(20),
        pagination: { total: 45, page, limit: 20 },
      })
    }),
  )

  render(<AcademiasPage />)

  const page2Link = await screen.findByTestId('gym-pagination-page-2')
  fireEvent.click(page2Link)

  const activePage = await screen.findByTestId('gym-pagination-page-2')
  expect(activePage).toHaveAttribute('aria-current', 'page')
})
```

Ajuste o nome exato do componente de página (`AcademiasPage` ou equivalente conforme o arquivo real exporta), o helper de render já usado no arquivo (pode já existir um wrapper de providers), e a forma exata de verificar o estado ativo — se o `PaginationLink` do design system expõe `isActive` como prop e renderiza `aria-current="page"` no DOM, use essa asserção; se usa outro mecanismo (classe CSS, atributo customizado), ajuste a asserção para o mecanismo real exposto pelo componente `PaginationLink` (verifique o componente usado por `NumberedPagination` da task-06).

Run: `pnpm --filter frontend test -- --run academias/page.test.tsx`
Expected: FAIL — `gym-pagination-page-2` não existe ainda (o componente atual usa o testid singular `gym-pagination-page`).

- **Step 3: Implementar o wrapper `GymPagination` sobre `NumberedPagination`**

Em `apps/frontend/src/features/gyms/components/gym-pagination.tsx`:

```typescript
'use client'

import { NumberedPagination } from '@/components/ui/numbered-pagination'

interface GymPaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export function GymPagination({ page, totalPages, onChange }: GymPaginationProps) {
  return (
    <NumberedPagination
      testIdPrefix="gym-pagination"
      page={page}
      totalPages={totalPages}
      onChange={onChange}
    />
  )
}
```

Remova as props antigas (`hasPrevious`, `hasNext`, `onPrevious`, `onNext`) e toda a marcação de paginação que existia diretamente neste arquivo antes da extração — o wrapper agora delega inteiramente para `NumberedPagination`.

- **Step 4: Atualizar `academias/page.tsx` para calcular `totalPages` e usar a nova API de `GymPagination`**

```typescript
// antes:
// const items = activeQuery.data ?? []
// const hasPrevious = page > 1
// const hasNext = items.length >= RESULTS_PER_PAGE
// <GymPagination hasPrevious={hasPrevious} hasNext={hasNext} onPrevious={() => setPage(page - 1)} onNext={() => setPage(page + 1)} />

// depois:
const items = activeQuery.data?.items ?? []
const totalPages = Math.ceil((activeQuery.data?.total ?? 0) / RESULTS_PER_PAGE)
// ...
<GymPagination page={page} totalPages={totalPages} onChange={setPage} />
```

Preserve o nome exato da constante `RESULTS_PER_PAGE` (ou equivalente) já usada no arquivo real, e o restante da lógica de renderização da lista de academias (`items.map(...)`) inalterada — apenas a fonte de `items` (agora `.items` do objeto `PaginatedGyms`) e o wiring de paginação mudam.

- **Step 5: Rodar os testes de `academias/page.test.tsx` e confirmar sucesso**

Run: `pnpm --filter frontend test -- --run academias/page.test.tsx`
Expected: PASS — todos os testes (incluindo os 8 mocks atualizados e o teste de paginação reescrito) passam.

- **Step 6: Rodar tsc:check e lint:fix**

Run: `pnpm --filter frontend tsc:check`
Expected: PASS — sem erros de tipo.

Run: `pnpm --filter frontend lint:fix`
Expected: PASS — zero problemas reportados pelo Biome.

- **Step 7: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-pagination.tsx \
  apps/frontend/src/app/\(authenticated\)/academias/page.tsx \
  apps/frontend/src/app/\(authenticated\)/academias/page.test.tsx
git commit -m "feat(gyms): paginação numerada em /academias usando NumberedPagination e total real"
```

## Critérios de Sucesso

- `GymPagination` é um wrapper fino sobre `NumberedPagination` com `testIdPrefix="gym-pagination"` e API `{ page, totalPages, onChange }`.
- `academias/page.tsx` calcula `totalPages` via `Math.ceil(total / RESULTS_PER_PAGE)` a partir de `activeQuery.data?.total`.
- Testid `gym-pagination-page` (singular) não existe mais; testids `gym-pagination-page-1`, `gym-pagination-page-2` etc. existem.
- `gym-pagination-prev`/`gym-pagination-next` permanecem com os mesmos testids de antes.
- Todos os 8 mocks MSW de `academias/page.test.tsx` refletem `{ gyms, pagination: { total, page, limit } }`.
- `pnpm --filter frontend test -- --run academias/page.test.tsx` passa 100%.
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem erros/problemas.
