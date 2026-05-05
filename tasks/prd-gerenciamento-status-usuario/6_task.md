# Tarefa 6.0: Frontend — UserDetailModal

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o componente `UserDetailModal` que exibe as informações pessoais do usuário selecionado (nome, e-mail, papel, status, data de cadastro) e os controles de alteração de status. Para **inativar**, usa `AlertDialog` com etapa de confirmação. Para **ativar**, executa a ação diretamente. O componente é populado com dados já presentes na listagem, sem chamadas adicionais à API.

<skills>
### Conformidade com Skills Padrões

- `shadcn` — uso correto de `Dialog` e `AlertDialog` do shadcn/ui
- `react` — padrões de componente controlado com props de estado e handlers
- `tanstack-query-best-practices` — consumir estado de loading dos hooks para desabilitar botões durante requisição
</skills>

<requirements>
- O componente deve receber o usuário selecionado como prop e ser controlado externamente (open/onClose)
- Exibir: nome, e-mail, papel (role), status atual (com badge colorido), data de cadastro
- **Não** exibir senha nem campos sensíveis de autenticação
- Botão **"Inativar"** (vermelho): exibido apenas quando `status === "activated"` E `role !== "ADMIN"` E usuário não é o admin logado
- Botão **"Ativar"** (verde): exibido apenas quando `status === "suspended"`
- Ao clicar "Inativar": abrir `AlertDialog` de confirmação antes de chamar `useSuspendUser.mutate()`
- Ao clicar "Ativar": chamar `useActivateUser.mutate()` diretamente sem confirmação
- Botões devem ser desabilitados e exibir estado de loading durante a requisição
- Em caso de erro na API, exibir mensagem de erro dentro do modal sem fechá-lo
- Modal acessível: foco gerenciado ao abrir, fechamento via `Esc`, navegação por `Tab`
- Fechável clicando fora ou no botão `X`
</requirements>

## Subtarefas

- [x] 6.1 Criar `user-detail-modal.tsx` com estrutura de `Dialog` (shadcn/ui)
- [x] 6.2 Implementar exibição das informações pessoais do usuário
- [x] 6.3 Implementar lógica condicional dos botões de ação (status, role, usuário logado)
- [x] 6.4 Implementar `AlertDialog` de confirmação para a ação "Inativar"
- [x] 6.5 Conectar botões aos hooks `useActivateUser` e `useSuspendUser`
- [x] 6.6 Implementar estados de loading e mensagem de erro inline
- [x] 6.7 Escrever testes do componente
- [x] 6.8 Executar `pnpm --filter frontend test` e verificar que todos passam

## Detalhes de Implementação

Consulte `techspec.md` — seções:
- **"Visão Geral dos Componentes > Frontend"**
- **"Interfaces Principais > Hooks de mutação no frontend"**
- **"Considerações Técnicas > Decisões Principais"** (tabela de decisões de UI)

Consulte `prd.md` — seções:
- **"Modal de Detalhes do Usuário"** (RF-05 a RF-08)
- **"Ação de Inativar Usuário"** (RF-09 a RF-16)
- **"Ação de Ativar Usuário"** (RF-17 a RF-21)
- **"Experiência do Usuário > Considerações de UI/UX"**

## Critérios de Sucesso

- Modal exibe corretamente todos os campos do usuário (RF-05, RF-06)
- Botão "Inativar" aparece apenas para usuários ativos não-admin e não é exibido para o próprio admin logado (RF-09, RF-15, RF-16)
- Botão "Ativar" aparece apenas para usuários suspensos (RF-17)
- `AlertDialog` de confirmação é exibido ao clicar "Inativar" (RF-11)
- Status é atualizado visualmente no modal após sucesso da ação (RF-13, RF-20)
- Loading state desabilita botões durante requisição
- Mensagem de erro é exibida inline em caso de falha
- Modal é acessível via teclado (RF-07, RF-08)
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` sem erros

## Testes da Tarefa

- [x] Testes de unidade: `user-detail-modal.test.tsx`
  - Renderiza corretamente os dados do usuário (nome, email, role, status, data)
  - Exibe botão "Inativar" para usuário ativo não-admin
  - Não exibe botão "Inativar" para usuário admin
  - Não exibe botão "Inativar" para o próprio admin logado
  - Exibe botão "Ativar" para usuário suspenso
  - Abre `AlertDialog` ao clicar "Inativar"
  - Chama `useSuspendUser.mutate()` após confirmar no `AlertDialog`
  - Chama `useActivateUser.mutate()` ao clicar "Ativar" sem confirmação
  - Exibe estado de loading durante requisição
  - Exibe mensagem de erro inline quando a API retorna erro

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/admin/components/user-detail-modal.tsx` (novo)
- `apps/frontend/src/features/admin/components/user-detail-modal.test.tsx` (novo)
- `apps/frontend/src/features/admin/api/use-activate-user.ts` (dependência — tarefa 5.0)
- `apps/frontend/src/features/admin/api/use-suspend-user.ts` (dependência — tarefa 5.0)
- `apps/frontend/src/features/admin/components/user-row.tsx` (referência de tipos e badge)
- Componentes shadcn/ui: `Dialog`, `AlertDialog`, `Badge`, `Button`
