## TC-FUNC-003: POST /sessions/refresh — Renovar access token

**Priority:** P0 (Critical)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 5 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/session/infra/controller/refresh-token.business-flow-test.ts`
**Automation Notes:** Business-flow test existente. Documentado para completude do plano.

---

### Objective

Validar que `POST /sessions/refresh` renova o access token usando o refresh token armazenado no cookie.

---

### Preconditions

- [ ] Usuário autenticado com refresh token válido no cookie

---

### Test Steps

1. **Enviar `POST /sessions/refresh` com cookie válido**
   - Input: Cookie `refreshToken=<valid-token>`
   - **Expected:** HTTP 200, novo `token` e novo `refreshToken` no body, novo cookie setado

2. **Enviar `POST /sessions/refresh` sem cookie**
   - Input: Sem cookie
   - **Expected:** HTTP 401

3. **Enviar `POST /sessions/refresh` com refresh token inválido**
   - Input: Cookie `refreshToken=token-invalido`
   - **Expected:** HTTP 401

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| Refresh token expirado | Cookie com token expirado | HTTP 401 |
| Refresh token de usuário deletado | Token válido mas user inexistente | HTTP 401 |

---

### Post-conditions

- Antigo refresh token invalidado (rotação de token)
- Novo access token com nova expiração
