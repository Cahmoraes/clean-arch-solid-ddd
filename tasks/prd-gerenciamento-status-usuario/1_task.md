# Tarefa 1.0: Backend — DAO e Propagação de Status

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Adicionar o campo `status: StatusTypes` ao contrato `FetchUsersData` (DAO interface), propagar essa informação nas implementações `PrismaUserDAO` e `UserDAOMemory`, e garantir que o `FetchUsersUseCase` inclua o campo `status` no output retornado. Essa tarefa é a fundação de dados para toda a funcionalidade — sem ela, o frontend não consegue exibir o badge de status.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — obrigatório ao expandir a interface DAO para não esconder o campo com fallback/casting
- `tdd` — aplicar ao escrever testes antes das modificações nos UseCases e DAOs
</skills>

<requirements>
- O campo `status: StatusTypes` deve ser adicionado à interface `FetchUsersData` em `user-dao.ts`
- `PrismaUserDAO` deve incluir `status` no select do Prisma (campo já existe na tabela `users`, sem migração)
- `UserDAOMemory` deve incluir `status` em `CreateUserInput` e nos objetos fake retornados
- `FetchUsersUseCase` deve mapear e retornar `status` no output de cada usuário
- Nenhuma migração de banco de dados é necessária
</requirements>

## Subtarefas

- [x] 1.1 Adicionar `status: StatusTypes` à interface `FetchUsersData` em `user-dao.ts`
- [x] 1.2 Incluir `status` no select do Prisma em `PrismaUserDAO`
- [x] 1.3 Incluir `status` em `CreateUserInput` e nos fakes de `UserDAOMemory`
- [x] 1.4 Mapear e propagar `status` no output de `FetchUsersUseCase`
- [x] 1.5 Atualizar testes existentes de `FetchUsersUseCase` para verificar o campo `status` no output
- [x] 1.6 Executar `pnpm --filter backend test:run` e garantir que todos os testes passam

## Detalhes de Implementação

Consulte `techspec.md` — seções:
- **"Interfaces Principais > Atualização do `UserDAO` e `FetchUsersData`"**
- **"Modelos de Dados > `FetchUsersUseCaseOutput.data` (backend)"**
- **"Arquivos relevantes e dependentes > Backend"**

## Critérios de Sucesso

- `FetchUsersData` contém `status: StatusTypes`
- `GET /users` retorna o campo `status` para cada usuário na resposta JSON
- Todos os testes unitários de `fetch-users.usecase.test.ts` passam incluindo a verificação de `status`
- `pnpm --filter backend biome:fix` sem erros
- `pnpm --filter backend tsc:check` sem erros

## Testes da Tarefa

- [x] Testes de unidade: `fetch-users.usecase.test.ts` — adicionar cenário que verifica a presença e valor correto de `status` no output
- [x] Testes de integração: `fetch-users.business-flow-test.ts` — verificar que a resposta HTTP de `GET /users` inclui o campo `status`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/backend/src/user/application/persistence/dao/user-dao.ts`
- `apps/backend/src/user/application/use-case/fetch-users.usecase.ts`
- `apps/backend/src/user/application/use-case/fetch-users.usecase.test.ts`
- `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`
- `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts`
- `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts`
