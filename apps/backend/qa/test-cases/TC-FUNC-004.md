## TC-FUNC-004: PATCH /users/activate — Ativar usuário (lacuna de cobertura)

**Priority:** P1 (High)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 10 minutes
**Automation Target:** Integration
**Automation Status:** Missing
**Automation Command/Spec:** `src/user/infra/controller/activate-user.business-flow-test.ts` (a criar)
**Automation Notes:** Controller `activate-user.controller.ts` existe e está registrado mas não possui business-flow-test correspondente. Fluxo de ativação de conta é crítico para o ciclo de vida do usuário.

---

### Objective

Validar que `PATCH /users/activate` ativa um usuário previamente suspenso ou inativo. Verificar autorização, validação do payload e resposta HTTP correta.

---

### Preconditions

- [ ] Servidor em execução com repositório in-memory
- [ ] Usuário administrador autenticado com JWT válido
- [ ] Usuário-alvo cadastrado mas inativo/suspenso
- [ ] `userId` do usuário-alvo disponível

---

### Test Steps

1. **Ativar usuário com admin autenticado e userId válido**
   - Input: `PATCH /users/activate` com header `Authorization: Bearer <admin-token>`, body `{ "userId": "<uuid>" }`
   - **Expected:** HTTP 200 ou 204, usuário com status ativo no repositório

2. **Tentar ativar usuário sem autenticação**
   - Input: `PATCH /users/activate` sem `Authorization` header
   - **Expected:** HTTP 401

3. **Tentar ativar com usuário MEMBER autenticado (não-admin)**
   - Input: Token de usuário MEMBER no header
   - **Expected:** HTTP 403 (caso a rota seja `onlyAdmin: true`) ou HTTP 401

4. **Tentar ativar com userId inexistente**
   - Input: `{ "userId": "00000000-0000-0000-0000-000000000000" }`
   - **Expected:** HTTP 404 ou HTTP 422 com mensagem de erro

5. **Tentar ativar com userId inválido (não UUID)**
   - Input: `{ "userId": "nao-e-uuid" }`
   - **Expected:** HTTP 400 (Zod validation)

---

### Test Data

| Field | Value | Notes |
|-------|-------|-------|
| userId | UUID de usuário inativo | Usuário deve existir no repositório |
| Authorization | Bearer <admin-jwt> | Token de admin válido |

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| Body vazio | `{}` | HTTP 400 |
| userId ausente | `{}` | HTTP 400 |
| userId em formato errado | `"userId": 123` | HTTP 400 |
| Ativar usuário já ativo | userId de usuário ativo | HTTP 200 (idempotente) ou HTTP 409 |

---

### Post-conditions

- Usuário com status `active` no repositório
- Evento de domínio emitido se aplicável

---

### Related Test Cases

- TC-FUNC-001: Criar usuário (pré-requisito para ter userId)
- TC-FUNC-002: Autenticar admin (pré-requisito para token)
