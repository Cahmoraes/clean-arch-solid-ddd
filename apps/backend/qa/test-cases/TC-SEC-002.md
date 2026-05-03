## TC-SEC-002: Autorização JWT — Acesso a rotas protegidas

**Priority:** P0 (Critical)
**Type:** Security
**Status:** Not Run
**Estimated Time:** 8 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** Coberto indiretamente nos business-flow-tests das rotas protegidas
**Automation Notes:** Cada business-flow-test cobre o cenário de autenticação. Documentado aqui com perspectiva de segurança consolidada.

---

### Objective

Garantir que todas as rotas marcadas como `isProtected: true` rejeitem requisições sem token JWT válido, e que rotas `onlyAdmin: true` rejeitem usuários com role MEMBER.

---

### Preconditions

- [ ] Usuário MEMBER autenticado com token válido
- [ ] Usuário ADMIN autenticado com token válido
- [ ] Servidor em execução

---

### Test Steps

1. **Acessar rota protegida sem token**
   - Input: `GET /users/me` sem `Authorization`
   - **Expected:** HTTP 401

2. **Acessar rota protegida com token expirado**
   - Input: JWT com `exp` no passado
   - **Expected:** HTTP 401

3. **Acessar rota protegida com token inválido (assinatura corrompida)**
   - Input: JWT com payload modificado
   - **Expected:** HTTP 401

4. **Acessar rota `onlyAdmin` com token MEMBER**
   - Input: `POST /check-ins` com JWT de role MEMBER
   - **Expected:** HTTP 403

5. **Acessar rota `onlyAdmin` com token ADMIN**
   - Input: `POST /check-ins` com JWT de role ADMIN
   - **Expected:** HTTP 201 (se dados válidos)

6. **Acessar rota protegida com token MEMBER válido**
   - Input: `GET /users/me` com JWT MEMBER
   - **Expected:** HTTP 200

---

### Rotas Protegidas a Validar

| Rota | isProtected | onlyAdmin |
|------|-------------|-----------|
| GET /users | Sim | Não documentado |
| GET /users/me | Sim | Não |
| GET /users/:userId | Sim | Não |
| GET /users/me/metrics | Sim | Não |
| PATCH /users/me/change-password | Sim | Não |
| PATCH /users/activate | Sim | Verificar |
| POST /check-ins | Sim | Sim |
| GET /check-ins | Sim | Não |
| PATCH /check-ins/validate | Sim | Verificar |
| GET /check-ins/metrics/:userId | Sim | Não |
| POST /subscriptions | Sim | Verificar |

---

### Edge Cases

| Cenário | Resultado Esperado |
|---------|-------------------|
| Token com role adulterada (MEMBER → ADMIN) | HTTP 401 ou 403 (assinatura inválida) |
| Múltiplos tokens no header | Primeiro parseado, outros ignorados |
