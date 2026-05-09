# Test Execution Commands

## Unit Tests Execution

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend test:run
```

**Output:**
```
✓ src/session/application/use-case/authenticate-with-google.usecase.test.ts (8 tests) 193ms
```

**Tests Included:**
1. ✓ deve retornar InvalidGoogleTokenError quando o token for inválido
2. ✓ deve retornar GoogleEmailNotVerifiedError quando o email não for verificado
3. ✓ deve autenticar usuário existente com googleId
4. ✓ deve vincular conta Google a usuário existente pelo email e autenticar
5. ✓ deve criar novo usuário via Google e autenticar
6. ✓ deve retornar GoogleAccountAlreadyLinkedError quando email já vinculado a outro googleId
7. ✓ deve autenticar usuário existente quando save falha por race condition (upsert otimista)
8. ✓ deve retornar tokens válidos com dados do usuário corretos

---

## Business Flow Tests Execution

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
pnpm --filter backend test:business-flow
```

**Output:**
```
✓ src/session/infra/controller/authenticate-with-google.business-flow-test.ts (6 tests) 1620ms
```

**Tests Included:**
1. ✓ Deve autenticar usuário existente com googleId
2. ✓ Deve retornar 401 quando token Google for inválido
3. ✓ **Deve retornar 422 quando email Google não for verificado** ← US-004 específico
4. ✓ Deve criar novo usuário e autenticar via Google
5. ✓ Deve vincular conta Google a usuário existente pelo email e autenticar
6. ✓ Deve retornar 409 quando email já estiver vinculado a outro googleId

---

## Test Coverage for US-004

### What the tests validate:

#### Unit Test (usecase.test.ts):
- **Input:** Google token with `emailVerified: false`
- **Validation:** Checks that `GoogleEmailNotVerifiedError` is returned
- **Result:** ✅ PASSED

#### Business Flow Test (business-flow-test.ts):
- **Input:** HTTP POST to `/sessions/google` with token having `emailVerified: false`
- **Validation:** 
  - HTTP Status Code is `422 (UNPROCESSABLE_ENTITY)`
  - Response body contains: `{ message: "Google email is not verified" }`
- **Result:** ✅ PASSED

---

## Implementation Verification

**File:** `apps/backend/src/session/application/use-case/authenticate-with-google.usecase.ts`

The use case validates `emailVerified` during token verification and returns `GoogleEmailNotVerifiedError` when the condition is not met.

**Error Handling Chain:**
```
GoogleAuthProvider.verify(idToken)
  ↓
emailVerified === false?
  ↓ YES
GoogleEmailNotVerifiedError
  ↓
HTTP Controller converts to 422 UNPROCESSABLE_ENTITY
```

---

## Requirements Traceability

| Requirement | Test File | Test Name | Status |
|--|--|--|--|
| RF-004 | authenticate-with-google.business-flow-test.ts | "Deve retornar 422 quando email Google não for verificado" | ✅ |
| RF-010 | authenticate-with-google.usecase.test.ts | "deve retornar GoogleEmailNotVerifiedError..." | ✅ |

---

## Conclusion

The implementation of **US-004** is **FULLY VALIDATED** through:
- 8 unit tests (application layer)
- 6 business flow tests (integration with HTTP)
- Clear error message ("Google email is not verified")
- Correct HTTP status code (422)

**QA Status: APPROVED** ✅
