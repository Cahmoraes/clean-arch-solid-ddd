# Tarefa 2.0: Backend — Invalidação de Cache nos UseCases

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Injetar `CacheDB` em `SuspendUserUseCase` e `ActiveUserUseCase` e chamar a deleção do cache de listagem após cada operação de update de status. Isso garante que o `GET /users` sempre reflita o estado atual dos usuários após uma ação de suspensão ou ativação, independentemente do TTL do cache Redis.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — não usar TTL como substituto para invalidação explícita; implementar a deleção corretamente
- `systematic-debugging` — usar se houver falhas na invalidação de cache (verificar API de `CacheDB` disponível)
- `tdd` — mockar `CacheDB` nos testes unitários para verificar que a deleção é chamada
</skills>

<requirements>
- `SuspendUserUseCase` deve injetar `CacheDB` via constructor e chamar deleção do padrão `fetch-users:*` após update bem-sucedido no repositório
- `ActiveUserUseCase` deve injetar `CacheDB` via constructor e chamar deleção do padrão `fetch-users:*` após update bem-sucedido no repositório
- Verificar a API disponível em `CacheDB`: se expõe `deleteByPattern`, usar; caso contrário, usar `delete` com as chaves explícitas conhecidas
- A invalidação deve ocorrer somente após o `userRepository.update()` ser executado com sucesso
- Falhas na invalidação de cache não devem propagar erro para o cliente (operação best-effort com log de warn)
</requirements>

## Subtarefas

- [x] 2.1 Verificar a interface `CacheDB` para identificar o método correto de deleção por padrão
- [x] 2.2 Injetar `CacheDB` no constructor de `SuspendUserUseCase` via Inversify
- [x] 2.3 Adicionar chamada de invalidação após `userRepository.update()` em `SuspendUserUseCase`
- [x] 2.4 Injetar `CacheDB` no constructor de `ActiveUserUseCase` via Inversify
- [x] 2.5 Adicionar chamada de invalidação após `userRepository.update()` em `ActiveUserUseCase`
- [x] 2.6 Atualizar os bindings do container IoC se necessário para prover `CacheDB` nos novos UseCases
- [x] 2.7 Executar `pnpm --filter backend test:run` e garantir que todos os testes passam

## Detalhes de Implementação

Consulte `techspec.md` — seções:
- **"Pontos de Integração > Redis Cache"**
- **"Riscos Conhecidos > `CacheDB.deleteByPattern`"**
- **"Considerações Técnicas > Monitoramento e Observabilidade"** (logs de warn já cobrem falhas de cache)

## Critérios de Sucesso

- Após `PATCH /users/suspend` ou `PATCH /users/activate`, o cache Redis de `fetch-users:*` é invalidado
- Os testes unitários de `suspend-user.usecase.test.ts` e `active-user.usecase.test.ts` verificam que `CacheDB` é chamado com o padrão correto
- Falha no `CacheDB` não quebra o fluxo principal (não retorna erro 5xx)
- `pnpm --filter backend biome:fix` e `pnpm --filter backend tsc:check` sem erros

## Testes da Tarefa

- [x] Testes de unidade: `suspend-user.usecase.test.ts` — adicionar cenário com `CacheDB` mockado verificando chamada de deleção após update
- [x] Testes de unidade: `active-user.usecase.test.ts` — idem para ativação

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/backend/src/user/application/use-case/suspend-user.usecase.ts`
- `apps/backend/src/user/application/use-case/suspend-user.usecase.test.ts`
- `apps/backend/src/user/application/use-case/active-user.usecase.ts`
- `apps/backend/src/user/application/use-case/active-user.usecase.test.ts`
- `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- (verificar) `apps/backend/src/shared/infra/cache/` — localizar interface e símbolo IoC de `CacheDB`
