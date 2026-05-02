# Tarefa 8.0: F4 — Check-ins

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar a funcionalidade central do produto: criação de check-in a partir da tela de detalhes de uma academia, histórico paginado de check-ins do usuário e, para admins, validação de check-ins pendentes.

<skills>
### Conformidade com Skills Padrões

- `tanstack-query-best-practices` — mutation de check-in sem retry automático; query paginada de histórico; invalidação após validação
- `typescript-advanced` — tipos derivados de `paths` para `/check-ins`
- `tdd` — implementar `useCreateCheckIn` com testes primeiro (fluxo crítico)
- `test-antipatterns` — MSW para mockar; não mockar `useMutation` nem `useQuery`
</skills>

<requirements>
- Botão "Fazer Check-in" na tela de detalhes da academia dispara `POST /check-ins` (RF-16)
- Feedback visual imediato: loading no botão, toast de sucesso ou mensagem de erro amigável
- Tela `/check-ins`: histórico paginado do usuário autenticado via `GET /check-ins` (RF-17)
- EmptyState quando não há check-ins; Skeleton no loading; erro amigável em falha (RF-23 a RF-25)
- Tela `/admin/check-ins`: lista check-ins pendentes; botão "Validar" chama `PATCH /check-ins/validate` (RF-18)
- Confirmação visual após validação admin (toast de sucesso + atualização da lista)
- Mutation de check-in sem retry automático (preservar idempotência)
</requirements>

## Subtarefas

- [x] 8.1 Criar `src/features/check-ins/api/` com: `useCreateCheckIn` (POST /check-ins), `useCheckIns` (GET /check-ins paginado), `useValidateCheckIn` (PATCH /check-ins/validate)
- [x] 8.2 Integrar botão "Fazer Check-in" na tela `/academias/[id]` (task 7.0) com `useCreateCheckIn`
- [x] 8.3 Criar `src/app/(authenticated)/check-ins/page.tsx` com lista paginada e componente de item de check-in
- [x] 8.4 Criar `src/app/(authenticated)/admin/check-ins/page.tsx` com lista de check-ins pendentes e ação de validação
- [x] 8.5 Aplicar `EmptyState` no histórico quando não há check-ins
- [x] 8.6 Garantir que mutation de `useCreateCheckIn` tem `retry: 0`
- [x] 8.7 Invalidar query de check-ins após validação admin para atualizar lista em tempo real
- [x] 8.8 Adicionar handlers MSW: `POST /check-ins`, `GET /check-ins`, `PATCH /check-ins/validate`

## Detalhes de Implementação

Ver `techspec.md` → seção **Endpoints de API** (RF-16 a RF-18), **Pontos de Integração** (retry de mutações), e **Sequenciamento** item 6.

## Critérios de Sucesso

- Check-in criado com sucesso exibe toast de confirmação e atualiza histórico
- Check-in com erro (ex: academia inválida) exibe mensagem amigável
- Histórico paginado navega entre páginas corretamente
- Estado vazio exibido quando não há check-ins no histórico
- Admin consegue validar check-in pendente e lista é atualizada sem reload
- Mutation de check-in não é retentada automaticamente

## Testes da Tarefa

- [x] Teste de unidade: `useCreateCheckIn` chama `POST /check-ins` com gymId correto (MSW)
- [x] Teste de unidade: `useCreateCheckIn` tem `retry: 0` configurado
- [x] Teste de integração: botão "Fazer Check-in" exibe loading e toast de sucesso após resposta MSW
- [x] Teste de integração: erro no check-in exibe mensagem amigável (não código HTTP)
- [x] Teste de integração: tela `/check-ins` exibe histórico paginado com Skeleton no loading
- [x] Teste de integração: `EmptyState` exibido quando histórico vazio
- [x] Teste de integração: admin valida check-in e lista é atualizada

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/check-ins/api/`
- `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`
- `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
