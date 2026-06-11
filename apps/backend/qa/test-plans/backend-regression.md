# Suite de Regressão — Backend

**Projeto:** apps/backend  
**Tipo:** Full Regression Suite

---

## Resumo da Suite

| Suite | Duração estimada | Frequência | Cobertura |
|-------|-----------------|------------|-----------|
| Smoke | 10-15 min | Por build/PR | Saúde do servidor + auth |
| P0 Crítico | 20-30 min | Por PR | Fluxos de negócio críticos |
| P1 Alta | 30-40 min | Por release | Todos os fluxos |
| Full Regression | 60-90 min | Semanal | Completo |

---

## Smoke Tests (10-15 min)

**Critério:** Se qualquer smoke falhar, parar e corrigir o build.

```bash
pnpm --filter backend test:run -- -t "health"
pnpm --filter backend test:business-flow -- -t "authenticate"
pnpm --filter backend test:business-flow -- -t "create user"
```

| ID | Descrição | Comando | Status Automação |
|----|-----------|---------|-----------------|
| SMOKE-001 | Health check endpoint responde 200 | `test/contract/health.contract-test.ts` | Existing |
| SMOKE-002 | POST /sessions autentica com credenciais válidas | `authenticate.business-flow-test.ts` | Existing |
| SMOKE-003 | POST /users cria usuário com dados válidos | `create-user.business-flow-test.ts` | Existing |
| SMOKE-004 | POST /sessions/refresh renova token | `refresh-token.business-flow-test.ts` | Existing |
| SMOKE-005 | TypeScript compila sem erros | `pnpm tsc:check` | Existing |
| SMOKE-006 | Biome lint sem issues | `pnpm biome:fix` | Existing |

---

## P0 — Crítico (Deve passar sempre)

**Critério de falha:** Qualquer P0 com falha bloqueia o release.

### Autenticação e Sessão (P0)

| TC | Descrição | Arquivo de Teste | Status |
|----|-----------|-----------------|--------|
| TC-FUNC-002 | Autenticação happy path | `authenticate.business-flow-test.ts` | Existing |
| TC-FUNC-003 | Refresh token | `refresh-token.business-flow-test.ts` | Existing |
| TC-SEC-001 | Webhook Stripe — assinatura inválida rejeitada | `stripe-webhook.controller.business-flow-test.ts` | Existing |
| TC-SEC-002 | JWT — rotas protegidas rejeitam requisições sem token | Coberto em todos os business-flow-tests | Existing |
| TC-FUNC-006 | Check-in — happy path + validação de distância | `check-in.business-flow-test.ts` | Existing |
| TC-FUNC-010 | Stripe webhook — processamento de eventos | `stripe-webhook.controller.business-flow-test.ts` | Existing |
| TC-FUNC-009 | Criar assinatura Stripe | `create-subscription.controller.business-flow-test.ts` | Existing |

### Domínio e Use Cases (P0)

| Arquivo de Teste | Bounded Context |
|-----------------|-----------------|
| `check-in.usecase.test.ts` | check-in |
| `validate-check-in.usecase.test.ts` | check-in |
| `authenticate.usecase.test.ts` | session |
| `create-user.usecase.test.ts` | user |
| `create-subscription.usecase.test.ts` | subscription |
| `handle-payment-failed.usecase.test.ts` | subscription |

---

## P1 — Alta Prioridade

**Critério:** ≥ 90% dos testes P1 devem passar.

### Controllers HTTP (P1)

| TC | Descrição | Arquivo de Teste | Status |
|----|-----------|-----------------|--------|
| TC-FUNC-004 | PATCH /users/activate | `activate-user.business-flow-test.ts` | **Missing** |
| TC-FUNC-005 | PUT /users/:userId/profile | `update-user-profile.business-flow-test.ts` | **Missing** |
| TC-FUNC-007 | PATCH /check-ins/validate | `validate-check-in.controller.business-flow-test.ts` | Existing |
| TC-FUNC-008 | GET /check-ins/metrics/:userId | `check-in-metrics.business-flow-test.ts` | **Missing** |
| — | GET /users (lista) | `fetch-users.business-flow-test.ts` | Existing |
| — | GET /users/me | `my-profile.business-flow-test.ts` | Existing |
| — | GET /users/:userId | `user-profile.business-flow-test.ts` | Existing |
| — | GET /users/me/metrics | `user-metrics.business-flow-test.ts` | Existing |
| — | PATCH /users/me/change-password | `change-password.business-flow-test.ts` | Existing |
| — | POST /gyms | `create-gym.business-flow-test.ts` | Existing |
| — | GET /gyms/search/:name | `search-gym.business-flow-test.ts` | Existing |
| — | GET /check-ins | `list-check-ins.business-flow-test.ts` | Existing |
| — | DELETE /sessions/logout | `logout.business-flow-test.ts` | Existing |

### Integração Event-Driven (P1)

| TC | Descrição | Arquivo de Teste | Status |
|----|-----------|-----------------|--------|
| TC-INT-001 | userCreated → CreateCustomerUseCase | `create-customer.integration-test.ts` | **Missing** |
| TC-INT-002 | Circuit Breaker | `circuit-breaker.test.ts` | Existing |
| — | Retry mechanism | `retry.test.ts` | Existing |

---

## P2 — Prioridade Média

### Use Cases de Usuário (P2)

| Arquivo | Observação |
|---------|-----------|
| `suspend-user.usecase.test.ts` | Sem controller HTTP exposto |
| `delete-user.usecase.test.ts` | Sem controller HTTP exposto |
| `fetch-users.usecase.test.ts` | — |
| `update-user-profile.usecase.test.ts` | — |

### Valor de Objetos e Entidades (P2)

| Arquivo | Domínio |
|---------|---------|
| `CNPJ.test.ts` | gym |
| `coordinate.test.ts` | check-in |
| `distance.test.ts` | check-in |
| `subscription.test.ts` | subscription |

### Fitness Functions — Arquitetura (P2 mas obrigatório)

```bash
pnpm --filter backend test:fitness
pnpm --filter backend fit:validate-dependencies
```

---

## Critérios de Aprovação/Reprovação

### PASS

- Todos os SMOKE passam
- Todos os P0 passam
- ≥ 90% dos P1 passam
- `biome:fix` com zero issues
- `tsc:check` sem erros
- `build` completo sem erros
- Fitness functions de arquitetura passando

### FAIL (Bloqueia release)

- Qualquer SMOKE falha
- Qualquer P0 falha
- Qualquer bug de segurança (autenticação, assinatura Stripe)
- `tsc:check` com erros
- `biome:fix` com issues

### CONDITIONAL PASS

- Falhas P1 com workarounds documentados
- Testes `Missing` compensados com validação manual documentada

---

## Automação Pendente (Follow-up após qa-execution)

| Arquivo a Criar | TC Relacionado | Prioridade |
|----------------|----------------|------------|
| `activate-user.business-flow-test.ts` | TC-FUNC-004 | P1 |
| `update-user-profile.business-flow-test.ts` | TC-FUNC-005 | P1 |
| `check-in-metrics.business-flow-test.ts` | TC-FUNC-008 | P1 |
| `create-customer.integration-test.ts` | TC-INT-001, BUG-001 | P1 |

---

## Ordem de Execução

```bash
# 1. Smoke + Lint + TypeCheck
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check

# 2. Testes unitários (P0 + P1 + P2)
pnpm --filter backend test:run

# 3. Business-flow tests (P0 + P1)
pnpm --filter backend test:business-flow

# 4. Fitness functions (arquitetura)
pnpm --filter backend test:fitness
pnpm --filter backend fit:validate-dependencies

# 5. Build final
pnpm --filter backend build
```
