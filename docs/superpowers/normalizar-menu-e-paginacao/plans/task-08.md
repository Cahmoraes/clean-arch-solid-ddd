# Task 8: Frontend — `/check-ins` usa `NumberedPagination`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** task-06

## Visão Geral

Refatorar `CheckInsPager` para usar `NumberedPagination` (criado na task-06) internamente, preservando 100% do comportamento e dos testids já existentes — incluindo o guard `if (pages <= 1) return null` e a prop customizável `testId` (default `"checkins"`), que passa a ser repassada como `testIdPrefix` para `NumberedPagination`. Esta é a única task cujo critério de sucesso exige que o arquivo de teste existente NÃO seja modificado — os 11 testes de `check-ins-pager.test.tsx` devem continuar passando sem edição.

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-ins-pager.tsx`

### Conformidade com as Skills Padrão

- `react`: `CheckInsPager` continua sendo um componente de apresentação puro; a única lógica própria que permanece nele é o guard de early-return (`pages <= 1`) e o repasse de props para `NumberedPagination`.
- `tailwindcss`: preservar quaisquer classes de layout/espaçamento já aplicadas ao redor do componente na página de check-ins.
- `test-antipatterns`: a refatoração deve ser transparente do ponto de vista de comportamento observável — não alterar o arquivo de teste existente é o próprio critério de não-regressão desta task.
- `vitest`: rodar a suíte de 11 testes já existente sem modificá-la, como critério de regressão.

## Passos

- **Step 1: Ler `CheckInsPager` e `check-ins-pager.test.tsx` para confirmar o contrato atual a preservar**

Abra `apps/frontend/src/features/check-ins/components/check-ins-pager.tsx` e confirme: (a) a prop `testId` com valor default `"checkins"`; (b) o guard `if (pages <= 1) return null`; (c) os testids atuais derivados de `testId` (ex.: `${testId}-prev`, `${testId}-next`, links de página numerados); (d) que o número da página é renderizado como texto do link (o teste `getByText("3")` depende disso). NÃO edite o arquivo de teste `check-ins-pager.test.tsx` — ele é o critério de regressão desta task e deve passar inalterado ao final.

- **Step 2: Rodar a suíte de testes existente ANTES da refatoração como baseline**

Run: `pnpm --filter frontend test -- --run check-ins-pager.test.tsx`
Expected: PASS — os 11 testes passam com a implementação atual (baseline antes de qualquer alteração).

- **Step 3: Refatorar `CheckInsPager` para delegar a `NumberedPagination`, preservando guard e prop `testId`**

```typescript
'use client'

import { NumberedPagination } from '@/components/ui/numbered-pagination'

interface CheckInsPagerProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  testId?: string
}

export function CheckInsPager({
  page,
  totalPages,
  onChange,
  testId = 'checkins',
}: CheckInsPagerProps) {
  if (totalPages <= 1) return null

  return (
    <NumberedPagination
      testIdPrefix={testId}
      page={page}
      totalPages={totalPages}
      onChange={onChange}
    />
  )
}
```

Ajuste os nomes exatos das props (`totalPages` pode se chamar `pages` no arquivo real — preserve o nome original da prop, apenas repassando seu valor para o parâmetro `totalPages` de `NumberedPagination`) e a assinatura completa de `CheckInsPagerProps` conforme o arquivo real, garantindo que:
- o guard de early-return usa exatamente a mesma condição (`pages <= 1` ou equivalente) que existia antes;
- o valor default de `testId` continua `"checkins"`;
- `testId` é repassado como `testIdPrefix` para `NumberedPagination` sem transformação.

- **Step 4: Rodar a suíte de testes existente e confirmar que os 11 testes continuam passando SEM modificação**

Run: `pnpm --filter frontend test -- --run check-ins-pager.test.tsx`
Expected: PASS — os 11 testes passam sem nenhuma edição no arquivo de teste, incluindo: as asserções de testid `checkins-prev`/`checkins-next`, o teste de prefixo customizado (`testId` diferente de `"checkins"`), o teste do guard `pages <= 1` retornando `null`, e o teste `getByText("3")` que localiza o link da página 3 pelo texto renderizado (agora via `NumberedPagination`, que renderiza o número da página como filho do `PaginationLink`, preservando o texto visível).

Se qualquer um dos 11 testes falhar, NÃO edite `check-ins-pager.test.tsx` para fazê-lo passar — em vez disso, ajuste a implementação de `CheckInsPager`/`NumberedPagination` até que o comportamento observável bata exatamente com o que o teste já espera (ex.: se o teste espera que o container de paginação tenha um testid específico que `NumberedPagination` não gera com o prefixo esperado, corrija o repasse de `testIdPrefix`).

- **Step 5: Confirmar que `check-ins/page.test.tsx` (que mocka `useMyCheckIns` e não toca os internals de `CheckInsPager`) não precisa de alteração**

Run: `pnpm --filter frontend test -- --run "app/(authenticated)/check-ins/page.test.tsx"`
Expected: PASS — sem nenhuma edição neste arquivo, pois ele mocka o hook `useMyCheckIns` diretamente e não depende dos detalhes internos de renderização de `CheckInsPager`.

- **Step 6: Rodar tsc:check e lint:fix**

Run: `pnpm --filter frontend tsc:check`
Expected: PASS — sem erros de tipo.

Run: `pnpm --filter frontend lint:fix`
Expected: PASS — zero problemas reportados pelo Biome.

- **Step 7: Commit**

```bash
git add apps/frontend/src/features/check-ins/components/check-ins-pager.tsx
git commit -m "refactor(check-ins): CheckInsPager delega renderização para NumberedPagination"
```

## Critérios de Sucesso

- `CheckInsPager` usa `NumberedPagination` internamente, preservando o guard `if (pages <= 1) return null` (nome exato da variável conforme arquivo real) e a prop `testId` (default `"checkins"`) repassada como `testIdPrefix`.
- `check-ins-pager.test.tsx` NÃO é modificado e seus 11 testes continuam passando integralmente.
- `apps/frontend/src/app/(authenticated)/check-ins/page.test.tsx` também não é modificado.
- `pnpm --filter frontend test -- --run check-ins-pager.test.tsx` passa 100% sem edição do arquivo de teste.
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem erros/problemas.
