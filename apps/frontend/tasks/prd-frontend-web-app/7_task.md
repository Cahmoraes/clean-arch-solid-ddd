# Tarefa 7.0: F3 — Academias

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Implementar busca paginada de academias por nome, listagem, tela de detalhes e, para admins, tela de cadastro de nova academia.

<skills>
### Conformidade com Skills Padrões

- `tanstack-query-best-practices` — queries paginadas, invalidação após cadastro
- `zod` — schema de cadastro de academia
- `typescript-advanced` — tipos derivados de `paths` para `/gyms` e `/gyms/search/{name}`
- `test-antipatterns` — MSW para respostas paginadas; não mockar hooks
</skills>

<requirements>
- Tela `/academias`: campo de busca por nome + listagem paginada dos resultados com Skeleton e EmptyState (RF-13)
- Tela `/academias/[id]`: detalhes da academia (nome, descrição, telefone, localização) + botão de check-in (RF-14)
- Tela `/admin/academias/nova`: formulário de cadastro acessível apenas a ADMIN (RF-15, RF-22)
- Paginação funcional na listagem (componente Pagination do shadcn)
- Estado vazio quando nenhuma academia é encontrada na busca (RF-25)
- Estado de loading com Skeleton (RF-23)
- Erro de rede exibido com mensagem amigável (RF-24)
</requirements>

## Subtarefas

- [ ] 7.1 Criar `src/features/gyms/api/` com: `useGymsByName` (GET /gyms/search/{name} paginado), `useGymById` (GET /gyms/{id}), `useCreateGym` (POST /gyms)
- [ ] 7.2 Criar `src/features/gyms/schemas/createGymSchema.ts` com validação Zod
- [ ] 7.3 Criar `src/app/(authenticated)/academias/page.tsx` com campo de busca e listagem paginada
- [ ] 7.4 Criar `src/app/(authenticated)/academias/[id]/page.tsx` com detalhes da academia e botão de check-in
- [ ] 7.5 Criar `src/app/(authenticated)/admin/academias/nova/page.tsx` com formulário React Hook Form + Zod
- [ ] 7.6 Garantir que a rota admin é bloqueada para MEMBER (via layout admin da task 4.0)
- [ ] 7.7 Aplicar `EmptyState` quando busca não retorna resultados
- [ ] 7.8 Adicionar handlers MSW: `GET /gyms`, `GET /gyms/search/:name`, `GET /gyms/:id`, `POST /gyms`

## Detalhes de Implementação

Ver `techspec.md` → seção **Endpoints de API** (RF-13 a RF-15), **Modelos de Dados** (`Paginated<T>`) e **Sequenciamento** item 5.

## Critérios de Sucesso

- Busca por nome retorna lista paginada de academias
- Trocar página atualiza resultados sem reload
- Busca sem resultados exibe `EmptyState` com sugestão de nova busca
- Tela de detalhes exibe todos os campos retornados pelo backend
- Botão de check-in visível na tela de detalhes (lógica de check-in implementada na task 8.0)
- Formulário de cadastro admin envia dados e redireciona após sucesso
- MEMBER que tenta acessar `/admin/academias/nova` é redirecionado

## Testes da Tarefa

- [ ] Teste de unidade: `createGymSchema` rejeita nome vazio e telefone com formato inválido
- [ ] Teste de integração: tela `/academias` exibe Skeleton durante loading e lista após resposta MSW
- [ ] Teste de integração: busca vazia exibe `EmptyState`
- [ ] Teste de integração: tela `/academias/[id]` exibe nome e detalhes da academia mockada
- [ ] Teste de integração: formulário admin cria academia e exibe confirmação
- [ ] Teste de integração: paginação navega entre páginas de resultados

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/gyms/api/`
- `apps/frontend/src/features/gyms/schemas/createGymSchema.ts`
- `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`
- `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
