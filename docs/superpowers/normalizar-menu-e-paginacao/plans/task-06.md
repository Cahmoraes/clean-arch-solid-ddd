# Task 6: Frontend — Componente `NumberedPagination` compartilhado + refactor de `/admin/usuarios`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Extrair o componente local `UsersPagination` (hoje definido dentro de `admin/usuarios/page.tsx`) para um componente compartilhado `NumberedPagination` em `apps/frontend/src/components/ui/numbered-pagination.tsx`, reutilizando byte-a-byte a lógica de janela de páginas já existente. O componente compartilhado recebe um `testIdPrefix` configurável para que `admin/usuarios` continue gerando exatamente os mesmos testids de hoje (`admin-users-*`), preservando 100% dos testes existentes sem modificação. Este componente será reutilizado por `/academias` (task-07) e `/check-ins` (task-08).

## Arquivos

- Create: `apps/frontend/src/components/ui/numbered-pagination.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- `react`: o componente `NumberedPagination` deve ser um componente de apresentação puro (props in, JSX out), sem estado interno próprio — a página que o usa é quem controla `page`/`onChange`.
- `shadcn`: reutilizar os primitivos de paginação do design system já existentes (`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`) em vez de recriar marcação/estilos do zero.
- `tailwindcss`: preservar as classes utilitárias já aplicadas nos elementos de paginação existentes; a prop opcional `className` deve permitir composição externa sem quebrar o layout padrão.
- `vercel-composition-patterns`: extrair o componente com uma API baseada em props explícitas (`page`, `totalPages`, `onChange`, `testIdPrefix`) em vez de acoplar a lógica de paginação a um contexto ou hook global — mantém o componente reutilizável entre features distintas (usuários, academias, check-ins).
- `vercel-react-best-practices`: evitar re-renderizações desnecessárias — a função `pageNumbers` deve continuar sendo pura e determinística, sem efeitos colaterais.
- `test-antipatterns`: os testes existentes de `admin/usuarios` que hoje verificam testids específicos não devem ser alterados por esta task — a refatoração deve ser transparente do ponto de vista de comportamento observável.
- `vitest`: rodar a suíte de testes de `admin/usuarios` já existente sem modificá-la, como critério de regressão.

## Passos

- **Step 1: Ler o componente local `UsersPagination` para extrair fielmente sua lógica**

Abra `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx` e localize a definição local do componente `UsersPagination`, incluindo a função helper `pageNumbers(currentPage, totalPages)` (janela `Math.min(totalPages, 5)`) e os testids atuais: `admin-users-pagination` (container), `admin-users-prev` (botão anterior), `admin-users-page-{p}` (link de página), `admin-users-next` (botão próximo). Confirme os imports exatos de `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext` usados no arquivo (path provável `@/components/ui/pagination`).

- **Step 2: Escrever o teste que falha para o novo componente `NumberedPagination`**

Crie o teste antes da implementação, em um arquivo companheiro (ou, se o padrão do repo não usa arquivo de teste dedicado para componentes de UI simples, adicione os casos como parte da suíte de `admin/usuarios` primeiro — mas para manter o componente testável isoladamente, crie):

```typescript
// apps/frontend/src/components/ui/numbered-pagination.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NumberedPagination } from './numbered-pagination'

describe('NumberedPagination', () => {
  it('renderiza os testids com o prefixo informado', () => {
    render(
      <NumberedPagination page={1} totalPages={3} onChange={vi.fn()} testIdPrefix="test-prefix" />,
    )

    expect(screen.getByTestId('test-prefix-pagination')).toBeInTheDocument()
    expect(screen.getByTestId('test-prefix-prev')).toBeInTheDocument()
    expect(screen.getByTestId('test-prefix-page-1')).toBeInTheDocument()
    expect(screen.getByTestId('test-prefix-next')).toBeInTheDocument()
  })

  it('chama onChange com a página clicada', () => {
    const onChange = vi.fn()
    render(
      <NumberedPagination page={1} totalPages={3} onChange={onChange} testIdPrefix="test-prefix" />,
    )

    fireEvent.click(screen.getByTestId('test-prefix-page-2'))

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('chama onChange com page - 1 ao clicar em anterior', () => {
    const onChange = vi.fn()
    render(
      <NumberedPagination page={2} totalPages={3} onChange={onChange} testIdPrefix="test-prefix" />,
    )

    fireEvent.click(screen.getByTestId('test-prefix-prev'))

    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('chama onChange com page + 1 ao clicar em próximo', () => {
    const onChange = vi.fn()
    render(
      <NumberedPagination page={1} totalPages={3} onChange={onChange} testIdPrefix="test-prefix" />,
    )

    fireEvent.click(screen.getByTestId('test-prefix-next'))

    expect(onChange).toHaveBeenCalledWith(2)
  })
})
```

Ajuste os imports de `render`/`screen`/`fireEvent` conforme o setup de testing-library já convencionado no repo (ex.: um wrapper customizado de render, se existir).

- **Step 3: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- --run components/ui/numbered-pagination.test.tsx`
Expected: FAIL — `Cannot find module './numbered-pagination'` (o arquivo ainda não existe).

- **Step 4: Implementar `NumberedPagination`**

Crie `apps/frontend/src/components/ui/numbered-pagination.tsx`, extraindo a lógica exata de `UsersPagination`:

```typescript
'use client'

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

function pageNumbers(currentPage: number, totalPages: number): number[] {
  const windowSize = Math.min(totalPages, 5)
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2))
  const end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

interface NumberedPaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  testIdPrefix: string
  className?: string
}

export function NumberedPagination({
  page,
  totalPages,
  onChange,
  testIdPrefix,
  className,
}: NumberedPaginationProps) {
  return (
    <Pagination className={className} data-testid={`${testIdPrefix}-pagination`}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            data-testid={`${testIdPrefix}-prev`}
            onClick={() => onChange(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
          />
        </PaginationItem>
        {pageNumbers(page, totalPages).map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              data-testid={`${testIdPrefix}-page-${p}`}
              isActive={p === page}
              onClick={() => onChange(p)}
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            data-testid={`${testIdPrefix}-next`}
            onClick={() => onChange(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
```

IMPORTANTE: ao portar a lógica de `pageNumbers`, copie o algoritmo EXATO já existente em `UsersPagination` (o snippet acima é ilustrativo da janela `Math.min(totalPages, 5)` — substitua pelo corpo real da função tal como está hoje no arquivo `admin/usuarios/page.tsx`, sem alterar seu comportamento). Da mesma forma, replique fielmente os handlers de clique (`onClick`) e os atributos de desabilitado/estado ativo (`aria-disabled`, `isActive`) exatamente como `UsersPagination` já os define hoje.

- **Step 5: Rodar o teste do componente e confirmar sucesso**

Run: `pnpm --filter frontend test -- --run components/ui/numbered-pagination.test.tsx`
Expected: PASS — os 4 testes passam.

- **Step 6: Refatorar `admin/usuarios/page.tsx` para usar `NumberedPagination`**

Remova a definição local de `UsersPagination` (e sua função `pageNumbers` local, agora duplicada) e substitua o uso no JSX:

```typescript
// antes:
// <UsersPagination page={page} totalPages={totalPages} onChange={setPage} />

// depois:
import { NumberedPagination } from '@/components/ui/numbered-pagination'
// ...
<NumberedPagination testIdPrefix="admin-users" page={page} totalPages={totalPages} onChange={setPage} />
```

Preserve exatamente os nomes das variáveis `page`/`totalPages`/`setPage` (ou equivalentes) já usadas no componente de página real — apenas troque a chamada do componente local pela versão compartilhada com `testIdPrefix="admin-users"`.

- **Step 7: Rodar os testes existentes de `admin/usuarios` sem modificá-los e confirmar que continuam passando**

Run: `pnpm --filter frontend test -- --run admin/usuarios`
Expected: PASS — todos os testes existentes (incluindo os que verificam `admin-users-next`/`admin-users-page-3`) continuam passando SEM nenhuma alteração nos arquivos de teste, pois os testids gerados por `NumberedPagination` com `testIdPrefix="admin-users"` são idênticos aos anteriores.

- **Step 8: Rodar tsc:check e lint:fix**

Run: `pnpm --filter frontend tsc:check`
Expected: PASS — sem erros de tipo.

Run: `pnpm --filter frontend lint:fix`
Expected: PASS — zero problemas reportados pelo Biome.

- **Step 9: Commit**

```bash
git add apps/frontend/src/components/ui/numbered-pagination.tsx \
  apps/frontend/src/components/ui/numbered-pagination.test.tsx \
  apps/frontend/src/app/\(authenticated\)/admin/usuarios/page.tsx
git commit -m "refactor(ui): extrair NumberedPagination compartilhado a partir de UsersPagination"
```

## Critérios de Sucesso

- `NumberedPagination` existe em `apps/frontend/src/components/ui/numbered-pagination.tsx` com API `{ page, totalPages, onChange, testIdPrefix, className? }`.
- A lógica de `pageNumbers` é idêntica (byte-a-byte no comportamento) à de `UsersPagination`.
- `admin/usuarios/page.tsx` usa `<NumberedPagination testIdPrefix="admin-users" .../>` no lugar do componente local removido.
- Testids gerados com `testIdPrefix="admin-users"` são idênticos aos anteriores (`admin-users-pagination`, `admin-users-prev`, `admin-users-page-{p}`, `admin-users-next`).
- Testes existentes de `admin/usuarios` (incluindo `admin/usuarios/page.test.tsx`) passam SEM modificação.
- `pnpm --filter frontend test -- --run components/ui/numbered-pagination.test.tsx` passa 100%.
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem erros/problemas.
