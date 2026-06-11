# Tarefa 2.0: Consolidar CheckInRepository

<critical>Ler os arquivos de techspec.md desta pasta antes de iniciar. Se você não ler esse arquivo sua tarefa será invalidada</critical>

## Visão Geral

Eliminar a duplicação na interface `CheckInRepository` removendo os métodos `checkInsOfUserId` e `countOfUserId` e expandindo `FindManyInput` com o campo opcional `userId?`. O método `findMany()` passa a ser o único ponto de consulta de check-ins, suportando filtro por usuário, status e paginação. Implementações Prisma e InMemory, além dos use cases callers, são adaptadas para usar a nova interface unificada.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — eliminar duplicação real; não criar adaptadores intermediários
- `test-antipatterns` — testar comportamento da interface, não dos detalhes internos
- `vitest` — todos os testes usam Vitest conforme padrão do projeto
- `systematic-debugging` — aplicar se os callers apresentarem falhas inesperadas após migração
</skills>

<requirements>
- Remover `checkInsOfUserId` e `countOfUserId` da interface `CheckInRepository`
- Expandir `FindManyInput` com `userId?: string` conforme techspec.md
- `findMany({ userId, page })` deve retornar check-ins filtrados pelo userId
- `findMany({ status, page })` deve continuar funcionando como antes
- `findMany({ page })` (sem filtros opcionais) deve retornar todos paginados com total correto
- Adaptar `PrismaCheckInRepository` para suportar o novo campo `userId?` na query
- Adaptar `InMemoryCheckInRepository` para filtrar por `userId?` quando presente
- Adaptar `CheckInHistoryUseCase` e `FetchCheckInsUseCase` para usar `findMany()` com os campos corretos
- Nenhuma interface HTTP é alterada — refatoração puramente interna
</requirements>

## Subtarefas

- [ ] 2.1 Atualizar interface `CheckInRepository` — adicionar `userId?` em `FindManyInput`, remover `checkInsOfUserId` e `countOfUserId`
- [ ] 2.2 Adaptar `PrismaCheckInRepository` — query `findMany` passa a incluir `where.userId` quando presente
- [ ] 2.3 Adaptar `InMemoryCheckInRepository` — filtro in-memory por `userId` quando presente
- [ ] 2.4 Adaptar `CheckInHistoryUseCase` — substituir chamada `checkInsOfUserId()` por `findMany({ userId, page })`
- [ ] 2.5 Adaptar `FetchCheckInsUseCase` — substituir chamada `countOfUserId()` por campo `total` de `findMany()`
- [ ] 2.6 Escrever testes unitários cobrindo os três cenários de `findMany()` (ver seção Testes)
- [ ] 2.7 Verificar que testes business-flow existentes de check-in continuam passando

## Detalhes de Implementação

Consultar **techspec.md** — seções:
- `### Interfaces Principais` → interface atualizada `CheckInRepository` e `FindManyInput`
- `### Testes Unitários` → bloco "CheckInRepository consolidação" com os três casos obrigatórios
- `### Testes de Integração (Business-Flow)` → bloco "CheckIn consolidação"
- `### Arquivos Relevantes e Dependentes` → bloco "Candidato 2"

## Critérios de Sucesso

- `pnpm --filter backend tsc:check` passa sem erros (nenhum caller usando métodos removidos)
- `pnpm --filter backend biome:fix` passa com zero issues
- `pnpm --filter backend test:run` — testes unitários novos passam
- `pnpm --filter backend test:business-flow` — testes existentes de check-in history e fetch continuam passando
- `pnpm --filter backend build` conclui sem erros
- Métodos `checkInsOfUserId` e `countOfUserId` não existem mais na interface nem nas implementações

## Testes da Tarefa

- [ ] **Unitários** (`in-memory-check-in-repository.test.ts` ou arquivo dedicado):
  - `findMany({ userId: 'x', page: 1 })` retorna apenas check-ins do usuário `x`
  - `findMany({ page: 1, status: 'validated' })` retorna apenas check-ins com status `validated`
  - `findMany({ page: 1 })` retorna todos os check-ins paginados com campo `total` correto
- [ ] **Integração** (business-flow existentes):
  - `GET /check-ins/history` continua funcionando (usa `findMany` internamente)
  - `GET /check-ins?page=1` continua retornando check-ins com total correto

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/check-in/application/repository/check-in-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-check-in-repository.ts`
- `src/shared/infra/database/repository/in-memory/in-memory-check-in-repository.ts`
- `src/check-in/application/use-case/check-in-history.usecase.ts`
- `src/check-in/application/use-case/fetch-check-ins.usecase.ts`
