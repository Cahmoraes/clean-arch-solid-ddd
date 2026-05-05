# Tarefa 7.0: Frontend — UserRow Badge + AdminUsersPage

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Integrar os dois últimos pontos visuais da funcionalidade: adicionar o badge de status colorido ao componente `UserRow` (exibido na listagem sem interação adicional), e modificar `AdminUsersPage` para gerenciar o estado do usuário selecionado e renderizar o `UserDetailModal`. Após esta tarefa, o fluxo completo está funcional de ponta a ponta.

<skills>
### Conformidade com Skills Padrões

- `react` — gerenciamento de estado com `useState` para o usuário selecionado no modal
- `shadcn` — uso correto de `Badge` para o status
- `tanstack-query-best-practices` — a listagem já usa TanStack Query; garantir que a invalidação das tarefas anteriores reflete o status atualizado
</skills>

<requirements>
- `UserRow` deve exibir um badge de status colorido para cada usuário na listagem
  - Verde (`activated`) com texto **"Ativo"**
  - Vermelho (`suspended`) com texto **"Inativo"**
  - Badge visualmente distinto do badge de papel (role) existente
- `UserRow` deve ser clicável, disparando um callback `onSelect(user)` ao clicar na linha
- `AdminUsersPage` deve gerenciar `selectedUser` com `useState<AdminUser | null>(null)`
- `AdminUsersPage` deve renderizar `UserDetailModal` passando `selectedUser` e handler de fechamento
- Ao fechar o modal, `selectedUser` deve ser resetado para `null`
- O tipo `AdminUser` deve incluir o campo `status` (disponível após a tarefa 4.0)
</requirements>

## Subtarefas

- [x] 7.1 Adicionar badge de status ao `UserRow` (verde para `activated`, vermelho para `suspended`)
- [x] 7.2 Adicionar prop `onSelect` ao `UserRow` e tornar a linha clicável
- [x] 7.3 Atualizar testes existentes de `UserRow` para cobrir os novos badges e callback `onSelect`
- [x] 7.4 Modificar `AdminUsersPage` para gerenciar estado `selectedUser` com `useState`
- [x] 7.5 Renderizar `UserDetailModal` em `AdminUsersPage` com `selectedUser` e handler de fechamento
- [x] 7.6 Passar o `onSelect` de `AdminUsersPage` para cada `UserRow` na listagem
- [x] 7.7 Executar `pnpm --filter frontend test` e verificar que todos os testes passam
- [x] 7.8 Executar `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix`

## Detalhes de Implementação

Consulte `techspec.md` — seções:
- **"Visão Geral dos Componentes > Frontend"** (tabela UserRow e AdminUsersPage)
- **"Fluxo de dados (ação de suspensão)"** (contexto de como o modal se integra à listagem)

Consulte `prd.md` — seções:
- **"Badge de Status na Listagem de Usuários"** (RF-01 a RF-04)
- **"Experiência do Usuário > Fluxo principal"** (passos 2-8)

## Critérios de Sucesso

- Badge verde com texto "Ativo" é exibido para usuários `activated` na listagem (RF-02, RF-03)
- Badge vermelho com texto "Inativo" é exibido para usuários `suspended` na listagem (RF-02, RF-03)
- Badge de status é visualmente distinto do badge de role (RF-04)
- Clicar em uma linha da listagem abre o `UserDetailModal` com os dados do usuário correto (RF-05)
- Fechar o modal reseta o usuário selecionado
- Após ação de ativar/suspender no modal, a listagem reflete o novo status (via invalidação do TanStack Query)
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` sem erros

## Testes da Tarefa

- [x] Testes de unidade: `user-row.test.tsx` (atualizar existente)
  - Exibe badge verde "Ativo" para usuário com `status === "activated"`
  - Exibe badge vermelho "Inativo" para usuário com `status === "suspended"`
  - Chama `onSelect` com os dados do usuário ao clicar na linha
- [x] Testes de unidade: `admin-users-page.test.tsx` (novo ou atualizar existente)
  - Modal não é exibido inicialmente
  - Modal é aberto ao clicar em um usuário na listagem
  - Modal é fechado ao chamar o handler de fechamento
  - `selectedUser` é resetado para `null` ao fechar o modal

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/admin/components/user-row.tsx` (modificar)
- `apps/frontend/src/features/admin/components/user-row.test.tsx` (atualizar)
- `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx` (modificar)
- `apps/frontend/src/features/admin/components/user-detail-modal.tsx` (dependência — tarefa 6.0)
- `apps/frontend/src/features/admin/api/use-users.ts` (referência — tipo `AdminUser`)
