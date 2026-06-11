# Tarefa 5.0: Frontend — Hooks de Mutação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar os hooks `useActivateUser` e `useSuspendUser` que encapsulam as chamadas `PATCH /users/activate` e `PATCH /users/suspend` via TanStack Query. Ambos implementam **optimistic update** no item do cache de listagem e invalidam `adminUsersQueryKey` após `onSettled`, garantindo consistência entre o modal e a listagem.

<skills>
### Conformidade com Skills Padrões

- `tanstack-query-best-practices` — obrigatório para implementar optimistic update com rollback e invalidação via `onSettled`
- `react` — padrões de custom hooks de mutação
- `no-workarounds` — o rollback do optimistic update deve ser implementado corretamente via `onError` com `context`
</skills>

<requirements>
- `useActivateUser` deve retornar `UseMutationResult<void, ApiError, string>` onde o argumento é o `userId`
- `useSuspendUser` deve retornar `UseMutationResult<void, ApiError, string>` onde o argumento é o `userId`
- Ambos os hooks devem aplicar optimistic update no item correspondente do cache da query de listagem
- O optimistic update deve alterar o `status` do usuário no cache imediatamente antes da requisição
- Em caso de erro (`onError`), o estado anterior deve ser restaurado via `context` do `useMutation`
- Em `onSettled`, ambos devem chamar `queryClient.invalidateQueries({ queryKey: adminUsersQueryKey })`
- Os hooks devem usar os tipos de `@repo/api-types` (disponíveis após a tarefa 4.0)
- Localização: `apps/frontend/src/features/admin/api/use-activate-user.ts` e `use-suspend-user.ts`
</requirements>

## Subtarefas

- [x] 5.1 Criar `use-activate-user.ts` com optimistic update e invalidação em `onSettled`
- [x] 5.2 Criar `use-suspend-user.ts` com optimistic update e invalidação em `onSettled`
- [x] 5.3 Garantir rollback via `context` no `onError` de ambos os hooks
- [x] 5.4 Escrever testes para `useActivateUser` com `renderHook` + MSW
- [x] 5.5 Escrever testes para `useSuspendUser` com `renderHook` + MSW
- [x] 5.6 Executar `pnpm --filter frontend test` e verificar que todos os testes passam

## Detalhes de Implementação

Consulte `techspec.md` — seções:
- **"Interfaces Principais > Hooks de mutação no frontend"**
- **"Fluxo de dados (ação de suspensão)"**
- **"Considerações Técnicas > Riscos Conhecidos > Optimistic update conflito"**

Referência de padrão: `apps/frontend/src/features/admin/api/use-users.ts`

## Critérios de Sucesso

- `useActivateUser` e `useSuspendUser` compilam sem erros de tipo
- O optimistic update altera o status no cache imediatamente após chamar `mutate(userId)`
- Em caso de erro na API, o status anterior é restaurado no cache
- `onSettled` invalida a query de listagem em ambos os hooks
- Testes passam com cenários de sucesso, erro e rollback
- `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` sem erros

## Testes da Tarefa

- [ ] Testes de unidade: `use-activate-user.test.tsx`
  - Cenário de sucesso: status muda para `activated` no cache + query invalidada
  - Cenário de erro: status anterior restaurado no cache após falha da API
- [ ] Testes de unidade: `use-suspend-user.test.tsx`
  - Cenário de sucesso: status muda para `suspended` no cache + query invalidada
  - Cenário de erro: status anterior restaurado no cache após falha da API

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/features/admin/api/use-activate-user.ts` (novo)
- `apps/frontend/src/features/admin/api/use-suspend-user.ts` (novo)
- `apps/frontend/src/features/admin/api/use-activate-user.test.tsx` (novo)
- `apps/frontend/src/features/admin/api/use-suspend-user.test.tsx` (novo)
- `apps/frontend/src/features/admin/api/use-users.ts` (referência — query key e padrão de fetch)
- `packages/api-types/index.d.ts` (tipos de resposta do backend)
