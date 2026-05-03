# Relatório de Execução QA — Backend (2ª bateria)

**Data:** 2026-05-03 (10:25 → 10:40 BRT)
**Modo:** sequencial (escopo focado)
**Skill:** qa-execution
**Escopo:** fechar BUG-001 (CreateCustomerController event-driven sem teste) e BUG-002 (3 controllers HTTP sem business-flow-test)

---

## 1. Veredicto

✅ **PASS — BUG-001 e BUG-002 resolvidos**

Todos os gates do `backend-test-plan.md` continuam atendidos, agora com cobertura adicional sobre 4 fluxos públicos antes desprotegidos.

- [x] Unit tests: 292/292
- [x] Business-flow tests: **57/57** (44 anteriores + 13 novos)
- [x] Fitness tests: 5/6 (1 skipped pré-existente)
- [x] `biome:fix`: 0 erros (24 infos pré-existentes em testes — fora do escopo)
- [x] `tsc:check`: 0 erros
- [x] `fit:validate-dependencies`: 0 violações em 376 módulos
- [x] `build`: ok

---

## 2. Resumo dos Gates

| Gate | Antes (1ª bateria) | Depois (2ª bateria) | Status |
|------|------:|------:|:------:|
| Biome lint | 0 erros + 24 infos | 0 erros + 24 infos | ✅ |
| TypeScript | 0 erros | 0 erros | ✅ |
| Unit tests | 292/292 | 292/292 | ✅ |
| Business-flow | 44/44 | **57/57** (+13) | ✅ |
| Fitness | 5/6 (1 skip) | 5/6 (1 skip) | ✅ |
| Dep-cruiser | 0 violações (372 mod) | 0 violações (376 mod) | ✅ |
| Build | ok | ok | ✅ |

---

## 3. Bugs encontrados e corrigidos nesta bateria

A criação dos testes ausentes desmascarou **3 bugs reais de produção**, não apenas lacunas de cobertura:

| # | Arquivo | Bug | Causa-raiz | Severidade |
|---|---------|-----|------------|:----------:|
| 1 | `shared/infra/ioc/module/user/user-module.ts` + `bootstrap/setup-user-module.ts` | `PATCH /users/:userId` retornava 404 — `UpdateUserProfileController` era dead code | `USER_TYPES.Controllers.UpdateUserProfile` bound a `UserProfileController` (errado); `UseCases.UpdateUserProfile` bound a `UserProfileUseCase` (errado); `setupUserModule` não resolvia o controller | **P0** |
| 2 | `shared/infra/ioc/module/check-in/check-in-module.ts` + `service-identifier/checkin-types.ts` + `bootstrap/setup-check-in-module.ts` | `GET /check-ins/metrics/:userId` retornava 404 — `MetricsController` era dead code | Sem símbolo `CHECKIN_TYPES.Controllers.Metrics`, sem bind, sem registro no bootstrap | **P0** |
| 3 | `user/infra/controller/activate-user.controller.ts` | Respostas de erro retornavam string crua em vez de `{ message }` | `ResponseFactory.BAD_REQUEST({ body: <string> })` em vez de `({ message: <string> })` | **P2** |

---

## 4. Cobertura adicionada

Quatro novos arquivos `*.business-flow-test.ts` (13 casos de teste):

| Arquivo | Casos | Cobertura |
|---------|------:|-----------|
| `subscription/infra/controller/create-customer.controller.business-flow-test.ts` | 2 | Listener `userCreated` → `CreateCustomerUseCase` → Stripe gateway; spy de invocação única |
| `user/infra/controller/activate-user.business-flow-test.ts` | 4 | Happy path, 401, 400 (UUID inválido), 422 (usuário inexistente) |
| `user/infra/controller/update-user-profile.business-flow-test.ts` | 4 | Happy path 201, 401, 400 (email inválido), 422 (usuário inexistente) |
| `check-in/infra/controller/check-in-metrics.business-flow-test.ts` | 3 | Zero check-ins, contagem múltipla, 401 |

---

## 5. Princípios aplicados

- **No-workarounds:** zero `@ts-ignore`, `as any`, `// biome-ignore` ou supressões.
- **Root-cause:** quando os testes novos falharam com 404, a causa real (IoC + bootstrap incorretos) foi corrigida em vez de aceitar 404 nas asserções.
- **Cobertura preservada:** zero asserções enfraquecidas; todas as correções mantêm o contrato OpenAPI.

---

## 6. Bugs fechados

- ✅ **BUG-001** — `Open` → `Resolved`
- ✅ **BUG-002** — `Open` → `Resolved` (severidade re-classificada: Medium/P1 → High/P0, pois revelou dead code em produção)

---

## 7. Pendências e follow-ups

### Fora do escopo (não bloqueantes)

- 24 `infos` `useLiteralKeys` em testes acessando membros privados — pré-existentes.
- 1 fitness test `skipped` (LCOM em `UserEntity`) — pré-existente.
- Possível bug latente: `DomainEventPublisher.instance` é singleton e acumula subscribers entre testes (não tem `clear()`). O teste de `create-customer` mitigou isso usando spy no gateway recém-criado a cada `beforeEach`, mas pode causar problemas em outros cenários. Considerar adicionar `clear()` ao publisher em uma próxima rodada.

---

## 8. Comandos de verificação

```bash
pnpm --filter backend biome:fix                      # 0 erros
pnpm --filter backend tsc:check                      # 0 erros
pnpm --filter backend test                           # 292/292
pnpm --filter backend test:business-flow             # 57/57
pnpm --filter backend test:fitness                   # 5/6 (1 skip)
pnpm --filter backend fit:validate-dependencies      # 0 violações em 376 módulos
pnpm --filter backend build                          # ok
```

---

## 9. Arquivos relacionados

- 1ª bateria: `apps/backend/qa/reports/2026-05-03-qa-execution-report.md`
- Bugs fechados: `apps/backend/qa/issues/BUG-001.md`, `BUG-002.md`
- Bugs abertos prévios: BUG-003 a BUG-011 (todos `Resolved` na 1ª bateria)
- Plano de testes: `apps/backend/qa/test-plans/backend-test-plan.md`
