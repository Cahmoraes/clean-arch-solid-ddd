## TC-FUNC-006: POST /check-ins — Realizar check-in (validação de distância)

**Priority:** P0 (Critical)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 10 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/check-in/infra/controller/check-in.business-flow-test.ts`
**Automation Notes:** Business-flow test existe. Este caso documenta os edge cases de distância e duplicação.

---

### Objective

Validar que `POST /check-ins` cria check-in somente quando o usuário está dentro da distância máxima da academia e não realizou check-in no mesmo dia.

---

### Preconditions

- [ ] Usuário ADMIN autenticado (rota requer `onlyAdmin: true`)
- [ ] Academia cadastrada com coordenadas conhecidas
- [ ] Servidor em execução

---

### Test Steps

1. **Check-in com usuário dentro do raio da academia**
   - Input: `{ "userId": "<id>", "gymId": "<id>", "userLatitude": -23.5505, "userLongitude": -46.6333 }` (academia nas mesmas coordenadas)
   - **Expected:** HTTP 201, `{ "message": "Check-in created", "id": "<checkInId>", "date": "..." }`

2. **Check-in duplicado no mesmo dia**
   - Input: Mesmo `userId` e `gymId` do passo 1, no mesmo dia
   - **Expected:** HTTP 409

3. **Check-in com usuário muito distante da academia (> 100m)**
   - Input: Latitude/longitude distante das coordenadas da academia
   - **Expected:** HTTP 409, mensagem indicando distância inválida

4. **Tentar check-in sem autenticação**
   - Input: Sem `Authorization` header
   - **Expected:** HTTP 401

5. **Tentar check-in com token de MEMBER (não admin)**
   - Input: JWT de usuário MEMBER
   - **Expected:** HTTP 403

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| gymId inexistente | UUID não cadastrado | HTTP 409 ou HTTP 404 |
| Coordenadas exatamente no limite (100m) | Distância = 100m | HTTP 201 (borda aceita) |
| userId ausente | `{}` sem userId | HTTP 400 |
| Body inválido | `{ "userLatitude": "abc" }` | HTTP 400 |

---

### Post-conditions

- Check-in registrado com timestamp atual
- Contador de check-ins do usuário incrementado
