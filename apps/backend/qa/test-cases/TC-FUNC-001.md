## TC-FUNC-001: POST /users — Criar usuário com dados válidos (happy path)

**Priority:** P0 (Critical)
**Type:** Functional
**Status:** Not Run
**Estimated Time:** 5 minutes
**Automation Target:** Integration
**Automation Status:** Existing
**Automation Command/Spec:** `src/user/infra/controller/create-user.business-flow-test.ts`
**Automation Notes:** Business-flow test já existente. Este caso documenta o contrato esperado.

---

### Objective

Validar que `POST /users` cria um usuário com sucesso quando os dados são válidos, retorna HTTP 201 e persiste o registro.

---

### Preconditions

- [ ] Servidor Fastify em execução com repositórios in-memory
- [ ] Nenhum usuário com o email de teste cadastrado
- [ ] Container IoC inicializado corretamente

---

### Test Steps

1. **Enviar `POST /users` com payload válido**
   - Input: `{ "name": "João Silva", "email": "joao@example.com", "password": "secret123", "role": "MEMBER" }`
   - **Expected:** HTTP 201, body `{ "message": "User created", "email": "joao@example.com" }`

2. **Enviar novo `POST /users` com o mesmo email**
   - Input: `{ "name": "Outro João", "email": "joao@example.com", "password": "outro123" }`
   - **Expected:** HTTP 409, body `{ "message": "User already exists" }`

3. **Enviar `POST /users` com role ADMIN**
   - Input: `{ "name": "Admin User", "email": "admin@example.com", "password": "admin123", "role": "ADMIN" }`
   - **Expected:** HTTP 201

4. **Omitir o campo `role` (deve defaultar para MEMBER)**
   - Input: `{ "name": "Membro", "email": "membro@example.com", "password": "pass123" }`
   - **Expected:** HTTP 201

---

### Test Data

| Field | Value | Notes |
|-------|-------|-------|
| name | João Silva | String válida |
| email | joao@example.com | Email único |
| password | secret123 | Mínimo 6 caracteres |
| role | MEMBER | Padrão quando omitido |

---

### Edge Cases & Variations

| Variation | Input | Expected Result |
|-----------|-------|-----------------|
| Senha com menos de 6 chars | `password: "abc"` | HTTP 400 (Zod validation error) |
| Email inválido | `email: "not-an-email"` | HTTP 400 |
| Body vazio | `{}` | HTTP 400 |
| name ausente | `{ email, password }` | HTTP 400 |
| email ausente | `{ name, password }` | HTTP 400 |
| role inválida | `role: "SUPERUSER"` | HTTP 400 |

---

### Post-conditions

- Usuário persistido no repositório in-memory
- Evento de domínio `userCreated` publicado
- `CreateCustomerUseCase` invocado via event listener
