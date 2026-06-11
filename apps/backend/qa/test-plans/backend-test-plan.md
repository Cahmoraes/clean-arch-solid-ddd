# Plano de Testes — Backend (Clean Arch + DDD)

**Projeto:** apps/backend  
**Repositório:** Cahmoraes/clean-arch-solid-ddd  
**Escopo:** API REST Fastify (Clean Architecture + DDD, TypeScript, Inversify, Prisma)

---

## 1. Resumo Executivo

### Objetivos

- Validar a cobertura de testes dos bounded contexts (`user`, `session`, `gym`, `check-in`, `subscription`, `shared`)
- Identificar lacunas de cobertura no nível de business-flow (HTTP integration) e unitário
- Garantir que todas as rotas HTTP expostas possuam testes de fluxo completos
- Documentar cenários de regressão para proteger os fluxos críticos de negócio

### Riscos Principais

| Risco | Impacto |
|-------|---------|
| Controllers sem business-flow-test podem ocultar bugs de contrato HTTP | Alto |
| Fluxos de assinatura (Stripe) dependem de serviço externo e mocking | Alto |
| Use cases com Domain Events sem cobertura de integração | Médio |
| Ausência de testes E2E end-to-end (build + servidor + DB real) | Médio |

---

## 2. Escopo

### Em Escopo

- Todos os controllers HTTP (Fastify) em `src/*/infra/controller/`
- Todos os Use Cases em `src/*/application/use-case/`
- Entidades e Value Objects de domínio em `src/*/domain/`
- Circuit Breaker e Retry (infraestrutura compartilhada)
- Autenticação JWT e refresh token
- Integração Stripe Webhook

### Fora de Escopo

- Testes de UI / Frontend
- Testes de carga e performance (tratados separadamente via `test-create-users`)
- Validação de design visual (Figma — não configurado)
- Testes de infraestrutura Docker/Kubernetes

---

## 3. Estratégia de Testes

### Tipos de Testes Existentes

| Tipo | Glob | Executor | Status |
|------|------|----------|--------|
| Unitário | `*.test.ts` | Vitest | 53 arquivos |
| Business Flow (HTTP integration) | `*.business-flow-test.ts` | Vitest + Supertest | 16 arquivos |
| Contrato (OpenAPI) | `test/contract/*.contract-test.ts` | Vitest | 6 arquivos |
| Fitness Function (Arquitetura) | `test/fitness-function/*.fit-test.ts` | dependency-cruiser | 1 arquivo |
| Integração Prisma | `*.e2e:prisma` | Vitest | Separado |

### Comandos de Execução

```bash
pnpm --filter backend test:run              # Testes unitários
pnpm --filter backend test:business-flow    # HTTP integration tests
pnpm --filter backend test:e2e:prisma       # Prisma integration
pnpm --filter backend test:fitness          # Fitness functions
pnpm --filter backend fit:validate-dependencies  # dependency-cruiser
```

---

## 4. Estratégia de Automação

| Fluxo | Alvo | Status | Observação |
|-------|------|--------|------------|
| POST /sessions (autenticação) | Integration | Existing | `authenticate.business-flow-test.ts` |
| POST /sessions/refresh | Integration | Existing | `refresh-token.business-flow-test.ts` |
| DELETE /sessions/logout | Integration | Existing | `logout.business-flow-test.ts` |
| POST /users (criar usuário) | Integration | Existing | `create-user.business-flow-test.ts` |
| GET /users (listar usuários) | Integration | Existing | `fetch-users.business-flow-test.ts` |
| GET /users/me (perfil próprio) | Integration | Existing | `my-profile.business-flow-test.ts` |
| GET /users/:userId (perfil por ID) | Integration | Existing | `user-profile.business-flow-test.ts` |
| GET /users/me/metrics | Integration | Existing | `user-metrics.business-flow-test.ts` |
| PATCH /users/me/change-password | Integration | Existing | `change-password.business-flow-test.ts` |
| PATCH /users/activate | Integration | **Missing** | `activate-user.business-flow-test.ts` |
| PUT /users/:userId/profile | Integration | **Missing** | `update-user-profile.business-flow-test.ts` |
| POST /gyms (criar academia) | Integration | Existing | `create-gym.business-flow-test.ts` |
| GET /gyms/search/:name | Integration | Existing | `search-gym.business-flow-test.ts` |
| GET /gyms/nearby (busca por coord.) | Integration | **Missing** | Nenhum controller HTTP exposto |
| POST /check-ins | Integration | Existing | `check-in.business-flow-test.ts` |
| GET /check-ins (listar) | Integration | Existing | `list-check-ins.business-flow-test.ts` |
| PATCH /check-ins/validate | Integration | Existing | `validate-check-in.controller.business-flow-test.ts` |
| GET /check-ins/metrics/:userId | Integration | **Missing** | `check-in-metrics.business-flow-test.ts` |
| POST /subscriptions | Integration | Existing | `create-subscription.controller.business-flow-test.ts` |
| POST /webhook/stripe | Integration | Existing | `stripe-webhook.controller.business-flow-test.ts` |
| CreateCustomer (event-driven) | Integration | **Missing** | Evento `userCreated` sem teste de integração |

---

## 5. Requisitos de Ambiente

| Componente | Versão/Configuração |
|------------|---------------------|
| Node.js | .nvmrc (verificar) |
| PostgreSQL | Docker (`npm run docker:up`) |
| Redis | Docker (mesma compose) |
| RabbitMQ | Docker (mesma compose) |
| Stripe | Chaves de test no `.env.test` |
| DATABASE_PROVIDER | `sqlite` para testes unitários, `prisma` para e2e |

---

## 6. Critérios de Entrada

- [ ] Docker services em execução (`docker:up`)
- [ ] Variáveis de ambiente do `.env.test` configuradas
- [ ] Migrations do Prisma aplicadas (`prisma:migrate:dev`)
- [ ] Build limpo (`pnpm build` sem erros)
- [ ] Biome sem warnings (`biome:fix` com zero issues)
- [ ] TypeScript compilando sem erros (`tsc:check`)

---

## 7. Critérios de Saída

- [ ] 100% dos testes unitários passando
- [ ] 100% dos business-flow tests passando
- [ ] Nenhum bug P0 aberto
- [ ] Taxa de aprovação P1 ≥ 90%
- [ ] Testes de fitness de arquitetura passando
- [ ] Todos os controllers com business-flow-test correspondente

### Automação esperada após execução QA

- Business-flow tests marcados como `Missing` devem ser criados como arquivos `*.business-flow-test.ts`
- Regressões P0/P1 descobertas devem ganhar teste automatizado antes de fechar o bug

---

## 8. Avaliação de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Controller `activate-user` com bug de contrato HTTP | Média | Alto | Criar business-flow-test (TC-FUNC-004) |
| Controller `update-user-profile` sem validação HTTP testada | Média | Alto | Criar business-flow-test (TC-FUNC-005) |
| `MetricsController` retornando dados de usuário errado | Baixa | Alto | Criar business-flow-test (TC-FUNC-009) |
| `CreateCustomerController` event-driven sem teste integrado | Alta | Alto | Criar teste de integração de evento (TC-INT-001) |
| Stripe webhook com assinatura inválida não rejeitado | Baixa | Crítico | Verificar TC-SEC-001 |
| JWT expirado aceito em rota protegida | Baixa | Crítico | Verificar TC-SEC-002 |
| Check-in duplicado no mesmo dia | Média | Alto | Coberto em TC-FUNC-007 |
| Distância de check-in não validada corretamente | Baixa | Alto | Coberto em TC-FUNC-008 |

---

## 9. Entregáveis

| Artefato | Localização |
|----------|-------------|
| Plano de testes (este documento) | `qa/test-plans/backend-test-plan.md` |
| Casos de teste funcionais | `qa/test-cases/TC-FUNC-*.md` |
| Casos de teste de integração | `qa/test-cases/TC-INT-*.md` |
| Casos de teste de segurança | `qa/test-cases/TC-SEC-*.md` |
| Suite de regressão | `qa/test-plans/backend-regression.md` |
| Relatórios de bug | `qa/issues/BUG-*.md` |
