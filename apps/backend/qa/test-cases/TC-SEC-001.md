## TC-SEC-001: Webhook Stripe — Verificação de assinatura criptográfica

**Priority:** P0 (Critical)
**Type:** Security
**Status:** Not Run
**Estimated Time:** 8 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/subscription/infra/controller/stripe-webhook.controller.business-flow-test.ts`
**Automation Notes:** Verificação de assinatura testada no business-flow-test. Documentado aqui com foco em segurança.

---

### Objective

Garantir que o endpoint `POST /webhook/stripe` rejeita qualquer requisição não originada do Stripe, prevenindo injeção de eventos fraudulentos.

---

### Preconditions

- [ ] `STRIPE_WEBHOOK_SECRET` configurado corretamente
- [ ] Servidor em execução

---

### Test Steps

1. **Requisição sem header `stripe-signature`**
   - Input: `POST /webhook/stripe` sem o header
   - **Expected:** HTTP 400, `{ "message": "Missing stripe-signature" }`

2. **Requisição com assinatura adulterada**
   - Input: `stripe-signature` com valor modificado
   - **Expected:** HTTP 400, `{ "message": "Invalid stripe signature" }`

3. **Requisição com body adulterado (assinatura não bate com body)**
   - Input: Assinatura gerada para payload X, mas enviando payload Y
   - **Expected:** HTTP 400, `{ "message": "Invalid stripe signature" }`

4. **Requisição com assinatura de timestamp muito antigo (replay attack)**
   - Input: Assinatura com timestamp de 5+ minutos atrás
   - **Expected:** HTTP 400 (Stripe SDK rejeita por padrão após 300s)

5. **Requisição legítima do Stripe**
   - Input: Payload e assinatura gerados com `STRIPE_WEBHOOK_SECRET` correto
   - **Expected:** HTTP 200

---

### Edge Cases

| Cenário | Resultado Esperado |
|---------|-------------------|
| `stripe-signature` como array | Primeiro valor usado; inválido → HTTP 400 |
| `rawBody` ausente | HTTP 400, "Missing stripe-signature" |
| Webhook secret incorreto no env | HTTP 400 para qualquer evento legítimo |
