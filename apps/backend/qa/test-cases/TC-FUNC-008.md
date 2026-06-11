## TC-FUNC-008: GET /check-ins/metrics/:userId — Métricas de check-in por usuário (lacuna de cobertura)

**Priority:** P1 (High)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 8 minutes
**Automation Target:** Integration
**Automation Status:** Missing
**Automation Command/Spec:** `src/check-in/infra/controller/check-in-metrics.business-flow-test.ts` (a criar)
**Automation Notes:** `MetricsController` em `check-in/infra/controller/metrics.controller.ts` existe e está registrado como rota protegida `GET /check-ins/metrics/:userId`, mas não possui nenhum business-flow-test. É o único ponto de acesso HTTP às métricas de check-in de um usuário específico.

---

### Objective

Validar que `GET /check-ins/metrics/:userId` retorna o total de check-ins do usuário informado e rejeita acesso não autenticado.

---

### Preconditions

- [ ] Usuário autenticado com JWT válido
- [ ] Usuário com pelo menos 2 check-ins cadastrados no repositório
- [ ] Servidor em execução

---

### Test Steps

1. **Obter métricas de usuário com check-ins cadastrados**
   - Input: `GET /check-ins/metrics/<userId>` com `Authorization: Bearer <token>`
   - **Expected:** HTTP 200, `{ "checkInsCount": 2 }` (ou o número real de check-ins)

2. **Obter métricas de usuário sem nenhum check-in**
   - Input: `GET /check-ins/metrics/<userId-sem-checkin>` com token válido
   - **Expected:** HTTP 200, `{ "checkInsCount": 0 }`

3. **Obter métricas sem autenticação**
   - Input: Sem `Authorization` header
   - **Expected:** HTTP 401

4. **Obter métricas com userId inválido (não UUID)**
   - Input: `GET /check-ins/metrics/nao-e-uuid` com token válido
   - **Expected:** HTTP 400 (Zod validation)

5. **Obter métricas com userId de usuário inexistente**
   - Input: UUID não cadastrado com token válido
   - **Expected:** HTTP 200 com count 0, ou HTTP 404 (documentar comportamento real)

---

### Test Data

| Field | Value | Notes |
|-------|-------|-------|
| userId (params) | UUID de usuário com check-ins | Deve existir no repositório |
| checkInsCount esperado | 2 | Criar 2 check-ins antes do teste |

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| userId ausente (rota incorreta) | `GET /check-ins/metrics` | HTTP 404 (rota não existe) |
| Usuário com 100+ check-ins | Grande volume | HTTP 200, contagem correta |

---

### Post-conditions

- Nenhuma mutação de dados; apenas leitura

---

### Related Test Cases

- TC-FUNC-006: Criar check-ins (pré-requisito para ter dados)
- TC-FUNC-002: Autenticar (pré-requisito para token)
