## TC-FUNC-002: POST /sessions — Autenticar usuário

**Priority:** P0 (Critical)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 5 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/session/infra/controller/authenticate.business-flow-test.ts`
**Automation Notes:** Business-flow test já existente. Este caso documenta o contrato esperado.

---

### Objective

Validar que `POST /sessions` autentica com sucesso e retorna JWT access token + refresh token via cookie.

---

### Preconditions

- [ ] Usuário com email `auth@example.com` e senha `secret123` cadastrado
- [ ] Servidor em execução com repositório in-memory

---

### Test Steps

1. **Enviar `POST /sessions` com credenciais válidas**
   - Input: `{ "email": "auth@example.com", "password": "secret123" }`
   - **Expected:** HTTP 200, body contém `{ "token": "...", "refreshToken": "..." }`, header `set-cookie` contém `refreshToken` com flags `httpOnly`, `secure`, `sameSite=strict`

2. **Enviar `POST /sessions` com senha incorreta**
   - Input: `{ "email": "auth@example.com", "password": "errada" }`
   - **Expected:** HTTP 401, `{ "message": "Invalid credentials" }`

3. **Enviar `POST /sessions` com email inexistente**
   - Input: `{ "email": "inexistente@example.com", "password": "secret123" }`
   - **Expected:** HTTP 401, `{ "message": "Invalid credentials" }`

4. **Acessar rota protegida com token retornado**
   - Input: `GET /users/me` com header `Authorization: Bearer <token>`
   - **Expected:** HTTP 200

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| Body vazio | `{}` | HTTP 400 |
| Email inválido | `email: "nao-email"` | HTTP 400 |
| Senha com menos de 6 chars | `password: "abc"` | HTTP 400 |
| Token expirado em rota protegida | JWT expirado | HTTP 401 |

---

### Post-conditions

- JWT válido com expiração configurada pelo `JWT_EXPIRES_IN`
- Cookie `refreshToken` definido para renovação
