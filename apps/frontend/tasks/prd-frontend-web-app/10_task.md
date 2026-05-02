# Tarefa 10.0: F6 — Dashboard administrativo

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Consolidar o dashboard administrativo com a listagem paginada de todos os usuários (`GET /users`). As ações admin de academias e check-ins já foram implementadas nas tasks 7.0 e 8.0 — esta task cria a tela central de usuários e unifica a navegação da área admin.

<skills>
### Conformidade com Skills Padrões

- `tanstack-query-best-practices` — query paginada de usuários, staleTime adequado para listas admin
- `typescript-advanced` — tipos derivados de `paths` para `GET /users`
- `test-antipatterns` — MSW para respostas paginadas de usuários
</skills>

<requirements>
- Tela `/admin/usuarios`: listagem paginada de todos os usuários via `GET /users` (RF-21)
- Cada item exibe: nome, e-mail, role, data de cadastro (campos retornados pelo backend)
- Paginação funcional com componente Pagination
- Skeleton durante loading; EmptyState se lista vazia; mensagem amigável em erro (RF-23 a RF-25)
- Toda a área admin acessível apenas a ADMIN (RF-22 — via guarda do layout admin, task 4.0)
- Link para `/admin/usuarios` visível no menu do `AuthenticatedShell` apenas para ADMIN
</requirements>

## Subtarefas

- [x] 10.1 Criar `src/features/admin/api/useUsers.ts` (GET /users paginado)
- [x] 10.2 Criar `src/app/(authenticated)/admin/usuarios/page.tsx` com listagem e paginação
- [x] 10.3 Criar componente `src/features/admin/components/UserRow.tsx` para cada item da lista
- [x] 10.4 Aplicar Skeleton no loading e EmptyState na lista vazia
- [x] 10.5 Confirmar que link `/admin/usuarios` está no `AuthenticatedShell` e visível apenas para ADMIN
- [x] 10.6 Adicionar handler MSW: `GET /users` com suporte a query params de paginação

## Detalhes de Implementação

Ver `techspec.md` → seção **Endpoints de API** (RF-21, RF-22) e **Sequenciamento** item 8.

## Critérios de Sucesso

- Lista de usuários exibida com paginação funcional
- Skeleton visível durante carregamento
- EmptyState exibido se lista vazia
- MEMBER não consegue acessar `/admin/usuarios` (redirecionado pelo layout admin)
- Link admin no menu visível apenas para ADMIN

## Testes da Tarefa

- [x] Teste de unidade: `useUsers` retorna lista tipada do MSW com paginação
- [x] Teste de integração: tela `/admin/usuarios` exibe Skeleton e depois lista após resposta MSW
- [x] Teste de integração: paginação navega corretamente entre páginas
- [x] Teste de integração: EmptyState exibido quando MSW retorna lista vazia
- [x] Teste de integração: MEMBER redirecionado ao tentar acessar a rota admin

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/admin/api/useUsers.ts`
- `apps/frontend/src/features/admin/components/UserRow.tsx`
- `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- `apps/frontend/src/components/layout/AuthenticatedShell.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
