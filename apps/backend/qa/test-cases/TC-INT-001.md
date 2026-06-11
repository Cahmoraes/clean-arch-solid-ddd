## TC-INT-001: Evento userCreated → CreateCustomerUseCase (integração event-driven)

**Priority:** P1 (High)
**Type:** Integration
**Status:** Not Run
**Estimated Time:** 15 minutes
**Automation Target:** Integration
**Automation Status:** Missing
**Automation Command/Spec:** `src/subscription/infra/controller/create-customer.integration-test.ts` (a criar)
**Automation Notes:** `CreateCustomerController` não é um controller HTTP — ele escuta o evento de domínio `userCreated` e invoca `CreateCustomerUseCase`. Este fluxo event-driven não possui nenhum teste de integração. É um fluxo crítico pois sem o customerId Stripe, o usuário não consegue criar assinaturas.

---

### Objective

Validar que quando um usuário é criado (`POST /users` ou `CreateUserUseCase`), o evento `userCreated` é publicado, o `CreateCustomerController` o recebe, e o `CreateCustomerUseCase` cria o customer no Stripe gateway com o email do usuário.

---

### Preconditions

- [ ] Container IoC com `CreateCustomerController` inicializado
- [ ] `DomainEventPublisher` em memória (não external bus)
- [ ] Gateway Stripe mockado
- [ ] Servidor em execução

---

### Test Steps

1. **Criar usuário via `POST /users`**
   - Input: `{ "name": "Novo", "email": "novo@test.com", "password": "pass123" }`
   - **Expected:** HTTP 201

2. **Verificar que o evento `userCreated` foi publicado**
   - **Expected:** `DomainEventPublisher.instance` recebeu o evento com `payload.email = "novo@test.com"`

3. **Verificar que `CreateCustomerUseCase.execute` foi invocado**
   - Input: Via spy/mock no gateway Stripe
   - **Expected:** `createCustomerUseCase.execute({ email: "novo@test.com" })` foi chamado uma vez

4. **Verificar que o gateway Stripe recebeu a chamada de criação de customer**
   - **Expected:** Mock do gateway registrou chamada com `email: "novo@test.com"`

5. **Verificar que o usuário agora possui `customerId` no repositório**
   - Input: Consulta ao repositório de subscriptions
   - **Expected:** Customer com email `novo@test.com` registrado

---

### Test Data

| Field | Value |
|-------|-------|
| email | novo@test.com |
| Stripe mock customerId | `cus_test_mock_001` |

---

### Edge Cases & Variations

| Variation | Expected Result |
|-----------|-----------------|
| Gateway Stripe retorna erro ao criar customer | Erro tratado, não propaga para o criador do usuário |
| Evento `userCreated` publicado mais de uma vez (retry) | Customer não duplicado (idempotência) |

---

### Post-conditions

- Customer Stripe associado ao email do usuário
- Usuário pode prosseguir para `POST /subscriptions`

---

### Related Test Cases

- TC-FUNC-001: Criar usuário (dispara o evento)
- TC-FUNC-009: Criar assinatura (precisa do customer)
