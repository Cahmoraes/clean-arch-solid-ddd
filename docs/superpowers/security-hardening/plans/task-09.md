# Task 9: Aumentar comprimento mínimo de senha de 6 para 8 chars

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → MEDIUM-4

## Visão Geral

O comprimento mínimo de senha está definido como 6 caracteres em três lugares diferentes: `password.ts` (domain), `create-user.controller.ts` e `authenticate.controller.ts`. A correção atualiza todos para `min(8).max(128)` conforme NIST SP 800-63B e atualiza os testes que verificam a mensagem de erro de validação.

## Arquivos

- Modify: `apps/backend/src/user/domain/value-object/password.ts`
- Modify: `apps/backend/src/user/infra/controller/create-user.controller.ts`
- Modify: `apps/backend/src/session/infra/controller/authenticate.controller.ts`
- Modify: `apps/backend/src/user/domain/value-object/password.test.ts`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: atualizar nos 3 locais, não apenas um.
</skills>

## Passos

- [ ] **Step 1: Atualizar o teste de unidade que verifica a mensagem de erro de senha curta**

Em `apps/backend/src/user/domain/value-object/password.test.ts`, atualizar o teste `"Não deve criar um password com menos de 6 caracteres"`:

```ts
// ANTES
test("Não deve criar um password com menos de 6 caracteres", async () => {
  const fakePassword = ""
  const password = await Password.create(fakePassword)
  expect(password.forceFailure().value).instanceOf(ValidationError)
  expect(password.forceFailure().value.message).toBe(
    "Validation error: Too small: expected string to have >=6 characters",
  )
})

// DEPOIS
test("Não deve criar um password com menos de 8 caracteres", async () => {
  const fakePassword = "1234567"
  const password = await Password.create(fakePassword)
  expect(password.forceFailure().value).instanceOf(ValidationError)
  expect(password.forceFailure().value.message).toBe(
    "Validation error: Too small: expected string to have >=8 characters",
  )
})
```

- [ ] **Step 2: Executar o teste para verificar que falha (mensagem ainda diz >=6)**

Run:
```bash
pnpm --filter backend test:run -- -t "Não deve criar um password com menos de 8 caracteres" 2>&1 | tail -15
```
Expected: FAIL — mensagem atual diz `>=6 characters`.

- [ ] **Step 3: Atualizar `password.ts` no domain**

Em `apps/backend/src/user/domain/value-object/password.ts`, linha 11:

```ts
// ANTES
const passwordValidationSchema = z.string().min(6)

// DEPOIS
const passwordValidationSchema = z.string().min(8).max(128)
```

- [ ] **Step 4: Atualizar `create-user.controller.ts`**

Em `apps/backend/src/user/infra/controller/create-user.controller.ts`, atualizar o campo `password` do schema:

```ts
// ANTES
password: z.string().min(6).meta({
  description: "User password (min 6 characters)",
  example: "secret123",
}),

// DEPOIS
password: z.string().min(8).max(128).meta({
  description: "User password (min 8 characters)",
  example: "secret123",
}),
```

- [ ] **Step 5: Atualizar `authenticate.controller.ts`**

Em `apps/backend/src/session/infra/controller/authenticate.controller.ts`, linha ~27:

```ts
// ANTES
password: z
  .string()
  .min(6)
  .meta({ description: "User password", example: "secret123" }),

// DEPOIS
password: z
  .string()
  .min(8)
  .max(128)
  .meta({ description: "User password", example: "secret123" }),
```

- [ ] **Step 6: Executar todos os testes do módulo user e session**

Run:
```bash
pnpm --filter backend test:run -- --reporter=verbose src/user src/session 2>&1 | tail -25
```
Expected: todos os testes passam.

> Nota: os testes existentes usam `"any_password"` (11 chars) — compatível com min(8). Nenhuma atualização necessária nos testes de integração.

- [ ] **Step 7: Verificar typecheck e lint**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
cd apps/backend
git add src/user/domain/value-object/password.ts \
        src/user/domain/value-object/password.test.ts \
        src/user/infra/controller/create-user.controller.ts \
        src/session/infra/controller/authenticate.controller.ts
git commit -m "fix(security): increase minimum password length from 6 to 8 chars

Updates password validation in domain (Password VO), CreateUser
controller and Authenticate controller to require min 8, max 128
chars per NIST SP 800-63B. Updates password unit test accordingly.

MEDIUM-4 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `z.string().min(8).max(128)` em `password.ts`, `create-user.controller.ts` e `authenticate.controller.ts`
- Teste de unidade atualizado para verificar `>=8 characters`
- Todos os testes passam
- `tsc:check` sem erros
