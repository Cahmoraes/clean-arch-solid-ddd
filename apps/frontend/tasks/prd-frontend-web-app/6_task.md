# Tarefa 6.0: F2 — Perfil e métricas

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar as telas de perfil do usuário autenticado: visualização e edição de dados, exibição de métricas pessoais (total de check-ins) e consulta de perfil público de outro usuário por ID.

<skills>
### Conformidade com Skills Padrões

- `tanstack-query-best-practices` — query de `/users/me` e `/users/me/metrics`, invalidação após edição
- `zod` — schema de edição de perfil
- `typescript-advanced` — tipos derivados de `paths` para `/users/me` e `/users/{userId}`
- `test-antipatterns` — MSW para mockar respostas; não mockar hooks
</skills>

<requirements>
- Tela `/perfil`: exibe dados de `/users/me` com estado de loading (Skeleton) e erro (RF-09, RF-23, RF-24)
- Formulário inline ou modal de edição dos campos suportados pelo backend (RF-10)
- Seção de métricas na página de perfil exibindo dados de `/users/me/metrics` (RF-11)
- Rota `/perfil/[userId]` exibe perfil público de outro usuário (RF-12)
- Invalidação da query `/users/me` após edição bem-sucedida
- Estados vazio/erro/loading em todas as seções (RF-23 a RF-25)
</requirements>

## Subtarefas

- [ ] 6.1 Criar `src/features/profile/api/` com: `useMe` (GET /users/me), `useMetrics` (GET /users/me/metrics), `useUpdateMe` (PATCH /users/me se existente), `useUserById` (GET /users/{userId})
- [ ] 6.2 Criar `src/features/profile/schemas/updateProfileSchema.ts` com validação Zod
- [ ] 6.3 Criar `src/app/(authenticated)/perfil/page.tsx` exibindo dados do usuário e métricas
- [ ] 6.4 Criar formulário de edição de perfil (componente inline ou Dialog) com React Hook Form + Zod
- [ ] 6.5 Criar `src/app/(authenticated)/perfil/[userId]/page.tsx` exibindo perfil público
- [ ] 6.6 Adicionar Skeleton nos estados de loading das seções de perfil e métricas
- [ ] 6.7 Adicionar handlers MSW: `GET /users/me`, `GET /users/me/metrics`, `GET /users/:userId`

## Detalhes de Implementação

Ver `techspec.md` → seção **Endpoints de API** (RF-09 a RF-12) e **Modelos de Dados** (`Me`, `Paginated`).

## Critérios de Sucesso

- Dados do usuário exibidos corretamente ao acessar `/perfil`
- Métricas (ex: total de check-ins) visíveis na página de perfil
- Edição bem-sucedida invalida a query e atualiza a UI sem reload
- Acesso a `/perfil/[userId]` com ID válido exibe perfil público
- Skeleton visível durante carregamento; mensagem amigável em caso de erro

## Testes da Tarefa

- [ ] Teste de unidade: `useMe` retorna dados tipados do MSW
- [ ] Teste de unidade: `updateProfileSchema` valida corretamente campos editáveis
- [ ] Teste de integração: tela `/perfil` exibe skeleton durante loading e dados após resposta MSW
- [ ] Teste de integração: edição do perfil invalida query e atualiza exibição
- [ ] Teste de integração: erro em `/users/me` exibe mensagem amigável (não stack trace)
- [ ] Teste de integração: tela `/perfil/[userId]` exibe nome e dados do usuário público

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/profile/api/`
- `apps/frontend/src/features/profile/schemas/updateProfileSchema.ts`
- `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- `apps/frontend/src/app/(authenticated)/perfil/[userId]/page.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
