## TC-FUNC-007: PATCH /check-ins/validate — Validar check-in existente

**Priority:** P1 (High)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 8 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/check-in/infra/controller/validate-check-in.controller.business-flow-test.ts`
**Automation Notes:** Business-flow test existe. Documentado para visibilidade no plano de regressão.

---

### Objective

Validar que `PATCH /check-ins/validate` marca um check-in como validado dentro do período de 20 minutos após a criação.

---

### Preconditions

- [ ] Check-in criado e não validado
- [ ] Dentro do período de `CHECK_IN_EXPIRATION_TIME` (padrão 20 min)
- [ ] Usuário ADMIN autenticado

---

### Test Steps

1. **Validar check-in dentro do prazo**
   - Input: `PATCH /check-ins/validate` com `{ "checkInId": "<id>" }`
   - **Expected:** HTTP 200, check-in marcado como validado

2. **Tentar validar check-in expirado (> 20 min)**
   - Input: checkInId de um check-in criado há mais de 20 minutos
   - **Expected:** HTTP 409 ou HTTP 422 com mensagem de expiração

3. **Tentar validar check-in já validado**
   - Input: checkInId de check-in já validado
   - **Expected:** HTTP 409

4. **Tentar validar sem autenticação**
   - Input: Sem token
   - **Expected:** HTTP 401

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| checkInId inexistente | UUID não cadastrado | HTTP 404 ou HTTP 422 |
| checkInId inválido | String não UUID | HTTP 400 |
| Body vazio | `{}` | HTTP 400 |
