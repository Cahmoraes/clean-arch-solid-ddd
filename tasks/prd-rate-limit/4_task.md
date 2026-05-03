# Tarefa 4.0: Testes de integração (business-flow) e validação gate

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o arquivo de testes de integração HTTP (`business-flow-test`) que valida o comportamento completo do rate limiting em cenário real: headers de resposta, bloqueio HTTP 429, diferenciação de limites por grupo de rota (auth vs geral), diferenciação por role (MEMBER vs ADMIN), exclusão de rotas de infraestrutura e identificação por userId vs IP. Após todos os testes passarem, executar o gate completo de qualidade do projeto.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`** — Todas as correções devem ser root-cause, sem hacks ou suppressões
- **`systematic-debugging`** — Usar para debugging de problemas durante implementação
- **`tdd`** — Base para o desenvolvimento dos testes de integração
- **`test-antipatterns`** — Evitar anti-padrões nos testes (flaky tests, acoplamento, etc.)
</skills>

<requirements>

- Criar `rate-limit.business-flow-test.ts` com testes HTTP contra Fastify in-memory
- Registrar o plugin com limites finitos reduzidos para os testes (ex: `max: 3, timeWindow: '1 minute'`)
- Sobrescrever o `max: Infinity` padrão do ambiente de teste via rebind ou configuração dedicada
- Testar todos os cenários descritos na seção "Testes de Integração" da techspec
- Executar gate completo: `biome:fix` + `tsc:check` + `test:run` + `test:business-flow` + `build`
- Garantir zero regressões em todos os testes do projeto

</requirements>

## Subtarefas

- [ ] 4.1 Criar `apps/backend/src/shared/infra/server/plugins/rate-limit.business-flow-test.ts` com setup de Fastify in-memory e limites finitos
- [ ] 4.2 Implementar teste: requisições dentro do limite retornam 200 com headers `X-RateLimit-*`
- [ ] 4.3 Implementar teste: requisição que excede o limite retorna HTTP 429 com headers corretos e `Retry-After`
- [ ] 4.4 Implementar teste: rota de auth respeita limite diferenciado (mais restritivo que geral)
- [ ] 4.5 Implementar teste: rota excluída (health check) não sofre rate limiting
- [ ] 4.6 Implementar teste: usuário autenticado usa userId como key (não IP)
- [ ] 4.7 Implementar teste: admin recebe limite multiplicado (3x)
- [ ] 4.8 Executar `biome:fix` — zero issues de formatação/linting
- [ ] 4.9 Executar `tsc:check` — zero erros de compilação
- [ ] 4.10 Executar `test:run` — todos os testes unitários passam
- [ ] 4.11 Executar `test:business-flow` — todos os testes de integração passam (incluindo o novo)
- [ ] 4.12 Executar `build` — build de produção sem erros

## Detalhes de Implementação

Referência principal: **techspec.md** — seção "Abordagem de Testes > Testes de Integração":
- Testes HTTP com Fastify in-memory e limites finitos reduzidos (ex: `max: 3, timeWindow: '1 minute'`)
- Para estes testes, o plugin será registrado com limites finitos pequenos via rebind ou configuração de teste dedicada, sobrescrevendo o `max: Infinity` padrão do ambiente de teste

**Padrão de business-flow-test existente no projeto:**
- Usar `supertest` contra instância Fastify in-memory
- `container.snapshot()` em `beforeEach`, `container.restore()` em `afterEach`
- Rebind de repositórios para in-memory via `container.rebindSync()`

**Cenários de teste obrigatórios:**

1. **Headers presentes** — Qualquer resposta 200 deve incluir `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
2. **Bloqueio 429** — Após `max` requisições, a próxima retorna HTTP 429 com `Retry-After`
3. **Auth vs Geral** — Rotas de auth bloqueiam com limite menor que rotas gerais
4. **Exclusão** — `GET /health` nunca retorna 429 independente do número de requisições
5. **Key por userId** — Dois usuários autenticados diferentes têm contadores independentes
6. **Admin 3x** — Admin pode fazer 3x mais requisições que MEMBER antes de ser bloqueado

## Critérios de Sucesso

- Todos os 6 cenários de teste passam
- `biome:fix` executa sem issues
- `tsc:check` passa sem erros
- `test:run` — todos os testes unitários passam (incluindo novos da Task 1.0 e 2.0)
- `test:business-flow` — todos os testes de integração passam (incluindo o novo)
- `build` — build de produção bem-sucedido
- Zero regressões em qualquer teste existente do projeto

## Testes da Tarefa

- [ ] Testes de integração: `rate-limit.business-flow-test.ts`
  - Requisições dentro do limite retornam 200 com headers `X-RateLimit-*` corretos
  - Requisição excedente retorna HTTP 429 com `Retry-After` e corpo de erro claro
  - Rota de auth bloqueia com limite mais restritivo
  - Rota excluída (health) não sofre rate limiting
  - Usuário autenticado usa userId como key
  - Admin recebe limite 3x maior que MEMBER
- [ ] Gate de qualidade: `biome:fix` + `tsc:check` + `test:run` + `test:business-flow` + `build`

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

**Arquivos a criar:**
- `apps/backend/src/shared/infra/server/plugins/rate-limit.business-flow-test.ts`

**Arquivos de referência (leitura):**
- `apps/backend/src/shared/infra/server/plugins/rate-limit-plugin.ts` — plugin (criado na Task 2.0)
- `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts` — constantes (criado na Task 1.0)
- `apps/backend/src/shared/infra/server/fastify-adapter.ts` — integração (modificado na Task 3.0)
- Testes business-flow existentes no projeto — usar como referência de padrão e setup
- `apps/backend/test/factory/` — factories de teste (createAndSaveUser, createAndSaveGym, etc.)
