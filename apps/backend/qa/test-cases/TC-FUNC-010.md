## TC-FUNC-010: POST /webhook/stripe — Processar webhook Stripe

**Priority:** P0 (Critical)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 10 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/subscription/infra/controller/stripe-webhook.controller.business-flow-test.ts`
**Automation Notes:** Business-flow test existe. Documentado para detalhar os cenários de segurança.

---

### Objective

Validar que `POST /webhook/stripe` processa eventos Stripe corretamente, rejeita assinaturas inválidas e encaminha eventos para a fila.

---

### Preconditions

- [ ] `STRIPE_WEBHOOK_SECRET` configurado no `.env.test`
- [ ] Queue mockada ou in-memory configurada
- [ ] Servidor em execução

---

### Test Steps

1. **Enviar evento com assinatura válida**
   - Input: Header `stripe-signature` válido, rawBody com payload Stripe
   - **Expected:** HTTP 200, `null` body (evento enfileirado)

2. **Enviar evento sem header `stripe-signature`**
   - Input: Sem header de assinatura
   - **Expected:** HTTP 400, `{ "message": "Missing stripe-signature" }`

3. **Enviar evento com assinatura inválida (tampered)**
   - Input: `stripe-signature` corrompido
   - **Expected:** HTTP 400, `{ "message": "Invalid stripe signature" }`

4. **Enviar evento `customer.subscription.deleted` (cancelamento)**
   - Input: Evento válido de cancelamento de assinatura
   - **Expected:** HTTP 200, evento `STRIPE_WEBHOOK` publicado na fila com `eventType: "customer.subscription.deleted"`

5. **Enviar evento `invoice.payment_failed`**
   - Input: Evento válido de pagamento falhado
   - **Expected:** HTTP 200, evento publicado na fila

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| rawBody ausente | Sem body | HTTP 400 |
| Stripe-signature como array no header | `["sig1", "sig2"]` | Usa o primeiro elemento (sig1) |
| Evento de tipo desconhecido | `eventType: "unknown.type"` | HTTP 200 (eventos não conhecidos são enfileirados sem erro) |
