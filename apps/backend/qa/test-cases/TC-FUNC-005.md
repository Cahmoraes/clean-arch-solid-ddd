## TC-FUNC-005: PUT /users/:userId/profile — Atualizar perfil de usuário (lacuna de cobertura)

**Priority:** P1 (High)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 10 minutes
**Automation Target:** Integration
**Automation Status:** Missing
**Automation Command/Spec:** `src/user/infra/controller/update-user-profile.business-flow-test.ts` (a criar)
**Automation Notes:** Controller `update-user-profile.controller.ts` existe sem nenhum business-flow-test correspondente. Atualização de perfil é funcionalidade central do bounded context de usuário.

---

### Objective

Validar que o endpoint de atualização de perfil aceita dados válidos, atualiza o usuário no repositório, e rejeita dados inválidos ou acesso não autorizado.

---

### Preconditions

- [ ] Usuário autenticado com JWT válido
- [ ] `userId` do usuário autenticado disponível
- [ ] Servidor em execução

---

### Test Steps

1. **Atualizar perfil com dados válidos**
   - Input: Payload com `{ "name": "Novo Nome", "email": "novo@example.com" }` + params `userId`
   - **Expected:** HTTP 200, dados atualizados refletidos em `GET /users/:userId`

2. **Tentar atualizar perfil sem autenticação**
   - Input: Sem header `Authorization`
   - **Expected:** HTTP 401

3. **Tentar atualizar perfil de outro usuário (sem ser admin)**
   - Input: JWT de `user-A`, params `userId` de `user-B`
   - **Expected:** HTTP 403 ou HTTP 401 (dependendo da política de autorização implementada)

4. **Atualizar com email já em uso por outro usuário**
   - Input: `{ "email": "existente@example.com" }` onde email pertence a outro user
   - **Expected:** HTTP 409

5. **Atualizar somente o nome (email não muda)**
   - Input: Apenas `{ "name": "Nome Atualizado" }`, email igual ao atual
   - **Expected:** HTTP 200

---

### Test Data

| Field | Value | Notes |
|-------|-------|-------|
| userId (params) | UUID do usuário | Deve ser o userId do token |
| name | Novo Nome | Qualquer string |
| email | novoemail@example.com | Deve ser único |

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| Email inválido | `email: "invalido"` | HTTP 400 |
| Nome vazio | `name: ""` | HTTP 400 |
| userId inválido (não UUID) | params `userId: "abc"` | HTTP 400 |
| userId inexistente | UUID não cadastrado | HTTP 404 |
| Body vazio | `{}` | HTTP 400 |

---

### Post-conditions

- Usuário com nome/email atualizados no repositório
- JWT existente continua válido (não invalida sessão)

---

### Related Test Cases

- TC-FUNC-001: Criar usuário (pré-requisito)
- TC-FUNC-002: Autenticar (pré-requisito para token)
