# Tarefa 9.0: Testes de contrato

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Configurar a suite de testes de contrato usando `vitest-openapi` que valida se os endpoints reais retornam responses conformes à spec OpenAPI exportada. Deve cobrir todos os 19 endpoints com pelo menos cenário de sucesso + 1 cenário de erro cada.

<skills>
### Conformidade com Skills Padrões

- **tdd** — Testes escritos com assertivas claras e cenários bem definidos
- **test-antipatterns** — Testes fazem requests reais (supertest), não mocks; validam comportamento real
- **no-workarounds** — Usar `vitest-openapi` matchers, não validação manual
</skills>

<requirements>
- Criar configuração Vitest em `test/vite.config.contract.ts`
- Criar setup em `test/contract/setup.ts` que carrega a spec JSON exportada
- Criar testes de contrato por domínio: `test/contract/{domain}.contract-test.ts`
- Cada endpoint deve ter pelo menos 1 teste de sucesso e 1 teste de erro
- Testes devem usar supertest para requests reais contra servidor em memória
- Adicionar script npm: `"test:contract": "vitest run --config test/vite.config.contract.ts"`
- Testes devem usar `expect(response).toSatisfyApiSpec()` para validação
- Setup deve executar `pnpm openapi:export` antes de rodar a suite (ou carregar spec inline)
</requirements>

## Subtarefas

- [ ] 9.1 Criar `test/vite.config.contract.ts` com configuração Vitest para contract tests
- [ ] 9.2 Criar `test/contract/setup.ts` com carregamento da spec e configuração do matcher
- [ ] 9.3 Criar `test/contract/user.contract-test.ts` — testes para todos os endpoints de User (8 endpoints)
- [ ] 9.4 Criar `test/contract/session.contract-test.ts` — testes para endpoints de Session (3 endpoints)
- [ ] 9.5 Criar `test/contract/gym.contract-test.ts` — testes para endpoints de Gym (2 endpoints)
- [ ] 9.6 Criar `test/contract/check-in.contract-test.ts` — testes para endpoints de Check-in (3 endpoints)
- [ ] 9.7 Criar `test/contract/subscription.contract-test.ts` — testes para endpoints de Subscription (2 endpoints)
- [ ] 9.8 Criar `test/contract/health.contract-test.ts` — teste para endpoint Health (1 endpoint)
- [ ] 9.9 Adicionar script npm no `package.json`
- [ ] 9.10 Executar suite completa e garantir 100% passando

## Detalhes de Implementação

Consultar seções da techspec.md:
- "Abordagem de Testes > Testes de Contrato" — estratégia completa
- "Pontos de Integração > vitest-openapi" — API e integração
- "Sequenciamento de Desenvolvimento > Ordem de Construção" — etapa 7
- "Arquivos relevantes e dependentes > Novos arquivos a criar"

## Critérios de Sucesso

- `pnpm test:contract` executa todos os testes de contrato com sucesso
- Todos os 19 endpoints possuem pelo menos 2 testes (sucesso + erro)
- Testes usam `toSatisfyApiSpec()` para validação automática
- Nenhum endpoint falha na validação de contrato
- Suite pode ser integrada ao CI (exit code 0 = sucesso, 1 = falha)

## Testes da Tarefa

- [ ] Testes de contrato: A própria suite é o entregável
- [ ] Verificação de cobertura: Todos os 19 endpoints cobertos
- [ ] Teste de regressão: Alterar um response schema e verificar que o contract test falha

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `test/vite.config.contract.ts` (criar)
- `test/contract/setup.ts` (criar)
- `test/contract/user.contract-test.ts` (criar)
- `test/contract/session.contract-test.ts` (criar)
- `test/contract/gym.contract-test.ts` (criar)
- `test/contract/check-in.contract-test.ts` (criar)
- `test/contract/subscription.contract-test.ts` (criar)
- `test/contract/health.contract-test.ts` (criar)
- `package.json` (adicionar script)
- `docs/openapi-spec.json` (spec consumida pelos testes)
