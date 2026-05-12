# Task 2: Remover campo `role` do schema público de criação de usuário

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → CRITICAL-2

## Visão Geral

O endpoint `POST /users` aceita `role: "ADMIN"` sem autenticação alguma, permitindo que qualquer pessoa crie uma conta de administrador. A correção é a Opção B do relatório: remover o campo `role` do `createUserRequestSchema`. O `Role.create()` já faz default para `"MEMBER"` quando `role` é `undefined`, então nenhuma mudança no use case é necessária.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/create-user.controller.ts`
- Test: `apps/backend/src/user/infra/controller/create-user.business-flow-test.ts`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: solução é remover o campo do schema, não apenas ignorá-lo no handler.
- `test-antipatterns`: testar o comportamento HTTP real via business-flow-test.
</skills>

## Passos

- [ ] **Step 1: Escrever teste que verifica que `role: "ADMIN"` é ignorado**

Em `apps/backend/src/user/infra/controller/create-user.business-flow-test.ts`, adicionar após o último teste:

```ts
test("Não deve criar um usuário com role ADMIN via endpoint público", async () => {
  const input = {
    name: "any_name",
    email: "attacker@evil.com",
    password: "any_password",
    role: "ADMIN",
  }

  const result = await request(fastifyServer.server)
    .post(UserRoutes.CREATE)
    .send(input)

  // A requisição pode ter sucesso (201) mas role deve ser ignorado
  // OU retornar 400 se o schema rejeitar o campo
  // Após a correção, o campo role é removido do schema — campos extras são ignorados pelo Zod
  expect(result.status).toBe(HTTP_STATUS.CREATED)

  // Verificar que o usuário criado é MEMBER, não ADMIN
  const users = await userRepository.findAll()
  const created = users.find((u) => u.email === input.email)
  expect(created?.role).toBe("MEMBER")
})
```

- [ ] **Step 2: Executar o teste para verificar que falha (ou passa pelo motivo errado)**

Run:
```bash
pnpm --filter backend test:run -- -t "Não deve criar um usuário com role ADMIN via endpoint público" 2>&1 | tail -20
```

> O teste pode passar mesmo antes da correção se o Zod já não permitir campos extras. Verifique o comportamento atual observando se `role: "ADMIN"` é persistido.

- [ ] **Step 3: Remover o campo `role` do `createUserRequestSchema`**

Em `apps/backend/src/user/infra/controller/create-user.controller.ts`, remover o campo `role` do schema:

```ts
// ANTES
const createUserRequestSchema = z.object({
  name: z.string().meta({ description: "User full name", example: "John Doe" }),
  email: z
    .string()
    .email()
    .meta({ description: "User email address", example: "john@example.com" }),
  password: z.string().min(6).meta({
    description: "User password (min 6 characters)",
    example: "secret123",
  }),
  role: z
    .enum([RoleValues.ADMIN, RoleValues.MEMBER])
    .optional()
    .default("MEMBER")
    .meta({ description: "User role", example: "MEMBER" }),
})

// DEPOIS
const createUserRequestSchema = z.object({
  name: z.string().meta({ description: "User full name", example: "John Doe" }),
  email: z
    .string()
    .email()
    .meta({ description: "User email address", example: "john@example.com" }),
  password: z.string().min(6).meta({
    description: "User password (min 6 characters)",
    example: "secret123",
  }),
})
```

- [ ] **Step 4: Remover o import de `RoleValues` se não for mais usado no arquivo**

Verificar se `RoleValues` ainda é usado em outro lugar no arquivo. Se não:

```ts
// REMOVER esta linha do topo do arquivo:
import { RoleValues } from "@/user/domain/value-object/role"
```

Run:
```bash
grep -n "RoleValues" apps/backend/src/user/infra/controller/create-user.controller.ts
```

Se não houver mais ocorrências, remover o import.

- [ ] **Step 5: Verificar que `UserRepository` tem o método `findAll` para o teste**

Run:
```bash
grep -n "findAll\|getAll" apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts | head -5
```

Se `findAll` não existir, ajustar o teste do Step 1 para verificar o usuário via use case ou adicionar getter de `users` direto no repositório in-memory:

```ts
// Alternativa: usar o array público do repositório in-memory
const created = userRepository.users.find((u) => u.email === input.email)
expect(created?.role).toBe("MEMBER")
```

- [ ] **Step 6: Executar todos os testes do módulo user**

Run:
```bash
pnpm --filter backend test:run -- --reporter=verbose src/user 2>&1 | tail -20
```
Expected: todos passam.

- [ ] **Step 7: Verificar typecheck e build**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
cd apps/backend
git add src/user/infra/controller/create-user.controller.ts \
        src/user/infra/controller/create-user.business-flow-test.ts
git commit -m "fix(security): remove role field from public user registration endpoint

Removes role from createUserRequestSchema so callers cannot
self-assign ADMIN role. Role.create() defaults to MEMBER when
undefined, no use-case change required.

CRITICAL-2 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Campo `role` removido de `createUserRequestSchema`
- `POST /users` com `role: "ADMIN"` no body cria usuário com `role: "MEMBER"`
- Todos os testes do módulo user passam
- `tsc:check` e `biome:fix` sem erros
