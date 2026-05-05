# Tarefa 3.0: Consolidar GymRepository

<critical>Ler os arquivos de techspec.md desta pasta antes de iniciar. Se você não ler esse arquivo sua tarefa será invalidada</critical>

## Visão Geral

Unificar os métodos `gymOfTitle` e `fetchAll` da interface `GymRepository` em um único método `fetchGyms({ title?, page })`. Quando `title` está presente, filtra por nome; quando ausente, retorna todas as academias paginadas. As implementações Prisma e InMemory são adaptadas, assim como o use case caller (`SearchGymUseCase`). Nenhum endpoint HTTP é alterado.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — eliminar duplicação real; não criar wrapper ou alias dos métodos antigos
- `test-antipatterns` — testes cobrem comportamento observável da interface, não internals
- `vitest` — todos os testes usam Vitest conforme padrão do projeto
- `systematic-debugging` — aplicar se callers apresentarem comportamento inesperado
</skills>

<requirements>
- Remover `gymOfTitle` e `fetchAll` da interface `GymRepository`
- Adicionar `fetchGyms(input: FetchGymsInput): Promise<Gym[]>` conforme techspec.md
- `FetchGymsInput` deve ter `title?: string` e `page: number`
- `fetchGyms({ title, page })` deve filtrar por título (case-insensitive, contains) quando `title` presente
- `fetchGyms({ page })` deve retornar todas as academias paginadas quando `title` ausente
- Adaptar `PrismaGymRepository` para suportar o filtro opcional `title`
- Adaptar `InMemoryGymRepository` para filtrar por `title` quando presente
- Adaptar `SearchGymUseCase` para chamar `fetchGyms()` em vez dos dois métodos antigos
- Nenhuma interface HTTP é alterada
</requirements>

## Subtarefas

- [ ] 3.1 Atualizar interface `GymRepository` — adicionar `FetchGymsInput`, adicionar `fetchGyms()`, remover `gymOfTitle` e `fetchAll`
- [ ] 3.2 Adaptar `PrismaGymRepository` — implementar `fetchGyms()` com `where.name` condicional
- [ ] 3.3 Adaptar `InMemoryGymRepository` — implementar `fetchGyms()` com filtro in-memory por `title`
- [ ] 3.4 Adaptar `SearchGymUseCase` — substituir chamadas a `gymOfTitle`/`fetchAll` por `fetchGyms()`
- [ ] 3.5 Escrever testes unitários cobrindo os dois cenários de `fetchGyms()` (ver seção Testes)
- [ ] 3.6 Verificar que testes business-flow existentes de gym continuam passando

## Detalhes de Implementação

Consultar **techspec.md** — seções:
- `### Interfaces Principais` → interface atualizada `GymRepository` e `FetchGymsInput`
- `### Testes Unitários` → bloco "GymRepository consolidação"
- `### Testes de Integração (Business-Flow)` → bloco "Gym consolidação"
- `### Arquivos Relevantes e Dependentes` → bloco "Candidato 2"

## Critérios de Sucesso

- `pnpm --filter backend tsc:check` passa sem erros (nenhum caller usando métodos removidos)
- `pnpm --filter backend biome:fix` passa com zero issues
- `pnpm --filter backend test:run` — testes unitários novos passam
- `pnpm --filter backend test:business-flow` — testes existentes de gym search e listing continuam passando
- `pnpm --filter backend build` conclui sem erros
- Métodos `gymOfTitle` e `fetchAll` não existem mais na interface nem nas implementações

## Testes da Tarefa

- [ ] **Unitários** (`in-memory-gym-repository.test.ts` ou arquivo dedicado):
  - `fetchGyms({ page: 1 })` retorna todas as academias paginadas
  - `fetchGyms({ title: 'CrossFit', page: 1 })` retorna apenas academias cujo nome contém 'CrossFit'
- [ ] **Integração** (business-flow existentes):
  - `GET /gyms?page=1` retorna todas as academias
  - `GET /gyms?title=CrossFit&page=1` filtra corretamente por título

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/gym/application/repository/gym-repository.ts`
- `src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- `src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- `src/gym/application/use-case/search-gym.usecase.ts`
