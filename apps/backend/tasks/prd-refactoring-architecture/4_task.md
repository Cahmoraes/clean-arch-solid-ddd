# Tarefa 4.0: Criar BaseController e Migrar Controllers

<critical>Ler os arquivos de techspec.md desta pasta antes de iniciar. Se você não ler esse arquivo sua tarefa será invalidada</critical>

## Visão Geral

Criar a classe abstrata `BaseController` que centraliza `parseRequest<T>()` (parsing + validação Zod) e `createResponseError()` (mapeamento de erro para resposta HTTP), eliminando esse código duplicado nos ~20 controllers do projeto. A migração é incremental: primeiro validar herança Inversify com 1 controller piloto (POC), depois migrar por bounded context. Controllers especiais (ex: webhooks com cookies) podem não estender `BaseController` se não houver ganho claro.

<skills>
### Conformidade com Skills Padrões

- `no-workarounds` — nenhuma gambiarra; controllers que não se beneficiam não são forçados a herdar
- `test-antipatterns` — testes do BaseController testam a classe concreta de teste, não mocks internos
- `vitest` — todos os testes usam Vitest conforme padrão do projeto
- `systematic-debugging` — aplicar se herança Inversify apresentar problemas com decorators
</skills>

<requirements>
- `BaseController` deve ser classe abstrata que implementa `Controller` e é decorada com `@injectable()`
- Deve expor `parseRequest<T>(schema: z.ZodType<T>, data: unknown): Either<Error, T>`
- Deve expor `createResponseError(result: Either<Error, unknown>): HandleCallbackResponse`
- Deve manter o método abstrato `init(): Promise<void>` que cada controller concreto implementa
- Todos os controllers que hoje duplicam `parseRequest`/`createResponseError` devem ser migrados
- Controllers especiais (webhooks, etc.) podem omitir a herança se a lógica for incompatível
- Os testes business-flow existentes devem continuar passando **sem modificação** após a migração
- Validar herança Inversify com POC em 1 controller antes de migrar todos (ver risco na techspec)
</requirements>

## Subtarefas

- [ ] 4.1 Criar `src/shared/infra/controller/base-controller.ts` com a classe abstrata
- [ ] 4.2 Escrever testes unitários do `BaseController` (ver seção Testes)
- [ ] 4.3 Migrar 1 controller piloto e validar que Inversify propaga decorators corretamente (POC)
- [ ] 4.4 Migrar controllers de `user/infra/controller/` para estender `BaseController`
- [ ] 4.5 Migrar controllers de `gym/infra/controller/` para estender `BaseController`
- [ ] 4.6 Migrar controllers de `check-in/infra/controller/` para estender `BaseController`
- [ ] 4.7 Migrar controllers de `session/infra/controller/` para estender `BaseController`
- [ ] 4.8 Migrar controllers de `subscription/infra/controller/` para estender `BaseController`
- [ ] 4.9 Verificar que todos os testes business-flow existentes continuam passando

## Detalhes de Implementação

Consultar **techspec.md** — seções:
- `### Interfaces Principais` → assinatura completa da classe `BaseController`
- `### Riscos Conhecidos` → risco "BaseController quebra controllers com lógica especial" e risco "Inversify inheritance não propagar decorators"
- `### Sequenciamento de Desenvolvimento` → justificativa de ser a última refatoração
- `### Arquivos Relevantes e Dependentes` → bloco "Candidato 1"
- `### Considerações Técnicas` → decisão de classe abstrata vs mixin/decorator

> ⚠️ **Atenção ao POC (subtarefa 4.3):** Confirmar que `@injectable()` na classe base é suficiente para que as classes filhas funcionem no Inversify, ou se cada controller filho também precisa do decorator. Resolver isso antes de migrar os 20 controllers.

## Critérios de Sucesso

- `pnpm --filter backend tsc:check` passa sem erros
- `pnpm --filter backend biome:fix` passa com zero issues
- `pnpm --filter backend test:run` — testes unitários do `BaseController` passam
- `pnpm --filter backend test:business-flow` — todos os testes existentes continuam passando sem modificação
- `pnpm --filter backend build` conclui sem erros
- Nenhum controller migrado contém código duplicado de `parseRequest`/`createResponseError`
- O `@Logger` decorator nos métodos `init()` é preservado em todos os controllers

## Testes da Tarefa

- [ ] **Unitários** (`base-controller.test.ts`):
  - `parseRequest()` com schema Zod válido → retorna `success(data)`
  - `parseRequest()` com schema Zod inválido → retorna `failure(ZodError)`
  - `createResponseError()` com `failure(KnownError)` → retorna `{ statusCode, body }` correto
  - Controller concreto de teste estendendo `BaseController` — `init()` funciona normalmente
- [ ] **Integração** (business-flow existentes — sem modificação):
  - Executar suite completa: `pnpm --filter backend test:business-flow`
  - Todos os endpoints de todos os bounded contexts devem continuar respondendo corretamente

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `src/shared/infra/controller/base-controller.ts` *(novo)*
- `src/shared/infra/controller/controller.ts`
- `src/shared/infra/controller/factory/response-factory.ts`
- `src/shared/infra/server/http-server.ts`
- `src/user/infra/controller/*.controller.ts`
- `src/gym/infra/controller/*.controller.ts`
- `src/check-in/infra/controller/*.controller.ts`
- `src/session/infra/controller/*.controller.ts`
- `src/subscription/infra/controller/*.controller.ts`
