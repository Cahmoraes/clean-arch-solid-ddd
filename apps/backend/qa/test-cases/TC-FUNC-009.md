## TC-FUNC-009: POST /subscriptions — Criar assinatura Stripe

**Priority:** P0 (Critical)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 10 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/subscription/infra/controller/create-subscription.controller.business-flow-test.ts`
**Automation Notes:** Business-flow test existe mas usa mocks do Stripe. Documentado para cobertura do plano.

---

### Objective

Validar que `POST /subscriptions` cria uma assinatura Stripe usando `priceId` e `paymentMethodId`, associando ao customer do usuário autenticado.

---

### Preconditions

- [ ] Usuário autenticado com JWT válido
- [ ] Usuário possui `customerId` Stripe provisionado (criado via evento `userCreated`)
- [ ] Servidor em execução com Stripe mockado

---

### Test Steps

1. **Criar assinatura com dados válidos**
   - Input: `POST /subscriptions` com header `Authorization`, body `{ "priceId": "price_test", "paymentMethodId": "pm_test" }`
   - **Expected:** HTTP 201, `{ "subscriptionId": "sub_...", "status": "active" }`

2. **Tentar criar assinatura sem customer provisionado**
   - Input: Usuário sem customerId Stripe
   - **Expected:** HTTP 422 ou HTTP 400, mensagem `BillingCustomerNotProvisionedError`

3. **Tentar criar assinatura sem autenticação**
   - Input: Sem token
   - **Expected:** HTTP 401

4. **Payload inválido (priceId vazio)**
   - Input: `{ "priceId": "", "paymentMethodId": "pm_test" }`
   - **Expected:** HTTP 400

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| paymentMethodId inválido no Stripe | ID de cartão recusado | HTTP 422 com mensagem do gateway |
| Body vazio | `{}` | HTTP 400 |
| Assinatura duplicada | Segunda `POST /subscriptions` | Comportamento definido pela regra de negócio |
