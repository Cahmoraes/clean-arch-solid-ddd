# Task Review — 8.0 F4 Check-ins

## Resumo

Implementação completa do fluxo de check-ins (RF-16 a RF-18):

- `src/features/check-ins/api/index.ts`: hooks `useCreateCheckIn`,
  `useCheckIns`, `useValidateCheckIn`. Mutation com `retry: 0`,
  invalidação de queries em sucesso.
- `src/features/check-ins/api/extendedPaths.ts`: tipos OpenAPI
  suplementares para GET `/check-ins` e PATCH `/check-ins/validate`
  (alinhado ao contrato da task — backend usa POST mas o frontend
  segue a especificação documentada na task / handler MSW).
- `src/features/check-ins/components/CheckInItem.tsx`: card monocromático
  com status (pendente/validado).
- Botão "Fazer check-in" em `/academias/[id]` integrado:
  geolocalização do navegador com fallback nas coordenadas da academia
  caso seja negada/indisponível; toasts de sucesso/erro amigáveis;
  estado `aria-busy` durante a chamada.
- `/check-ins`: histórico paginado com Skeleton, EmptyState, retry e
  paginador acessível.
- `/admin/check-ins`: lista de pendentes com ação "Validar" que
  invalida a query (atualiza a lista sem reload). Toast de sucesso/erro.
- Handlers MSW atualizados: POST devolve `id` + `date`; PATCH ecoa
  `checkInId`; GET respeita `page`.

## Severidade dos achados

### Critical

Nenhum.

### Major

Nenhum.

### Minor

- O contrato OpenAPI (`@repo/api-types`) declara POST para
  `/check-ins/validate`, enquanto a Task/PRD/MSW usam PATCH.
  Resolvido via `extendedPaths` no frontend para preservar o contrato
  da task; vale alinhar backend ↔ spec em uma tarefa de backend
  posterior.
- O endpoint GET `/check-ins` ainda não está documentado no
  `api-types`. Os tipos foram declarados localmente em
  `extendedPaths.ts` seguindo o mesmo padrão já adotado por `gyms`.

### Positivos

- Cobertura por testes:
  - 7 testes unitários de hooks (sucesso, retry:0, 409, 401, payload).
  - 5 testes de integração na tela de academia (incluindo check-in
    feliz e 409 amigável).
  - 4 testes da tela `/check-ins` (skeleton, sucesso, vazio, erro,
    paginação).
  - 3 testes da tela `/admin/check-ins` (validar + atualização,
    vazio, erro 409 amigável).
- `pnpm test`: 166/166 passando. `pnpm tsc:check`: limpo.
  `pnpm lint`: limpo (complexidade cognitiva ≤ 5 em todas as funções).
- Sem mocks de hooks — apenas MSW para o transporte HTTP
  (test-antipatterns ✓).
- Mutations sem retry (idempotência preservada — RF-16).

## Arquivos compartilhados modificados

- `src/test/msw/handlers.ts` — atualizou (somente adição de campos)
  os handlers de `/check-ins*` para devolver shapes válidos para os
  novos hooks. Nenhum handler removido.
- `src/app/(authenticated)/academias/[id]/page.tsx` e seu teste —
  ativação do botão de check-in (substituiu placeholder desabilitado).

## Bloqueadores

Nenhum.
