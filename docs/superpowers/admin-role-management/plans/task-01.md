# Task 1: Domínio — `updateRole` + Erros de Domínio [RF-001, RF-008]

**Status:** PENDING
**PRD:** `../prd/prd-admin-role-management.md`
**Spec:** `../specs/admin-role-management-design.md`

## Visão Geral

Adiciona o método `updateRole(role: RoleTypes): void` à entidade `User` e cria 5 novas classes de erro de domínio usadas pelos Use Cases nas próximas tasks.

## Arquivos

- Modify: `apps/backend/src/user/domain/user.ts`
- Create: `apps/backend/src/user/application/error/user-already-admin-error.ts`
- Create: `apps/backend/src/user/application/error/user-is-not-admin-error.ts`
- Create: `apps/backend/src/user/application/error/user-is-super-admin-error.ts`
- Create: `apps/backend/src/user/application/error/user-is-not-active-error.ts`
- Create: `apps/backend/src/user/application/error/cannot-demote-self-error.ts`

### Conformidade com as Skills Padrão

- no-workarounds: garantir que as mudanças resolvem a causa raiz sem hacks

## Passos

- [ ] **Step 1: Criar os 5 arquivos de erro**

Execute cada criação abaixo. Siga o padrão exato de `apps/backend/src/user/application/error/user-not-found-error.ts`:

```typescript
// apps/backend/src/user/application/error/user-already-admin-error.ts
export class UserAlreadyAdminError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super("User is already an admin", errorOptions)
    this.name = "UserAlreadyAdminError"
  }
}
```

```typescript
// apps/backend/src/user/application/error/user-is-not-admin-error.ts
export class UserIsNotAdminError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super("User is not an admin", errorOptions)
    this.name = "UserIsNotAdminError"
  }
}
```

```typescript
// apps/backend/src/user/application/error/user-is-super-admin-error.ts
export class UserIsSuperAdminError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super("Cannot modify the super admin account", errorOptions)
    this.name = "UserIsSuperAdminError"
  }
}
```

```typescript
// apps/backend/src/user/application/error/user-is-not-active-error.ts
export class UserIsNotActiveError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super("User account is not active", errorOptions)
    this.name = "UserIsNotActiveError"
  }
}
```

```typescript
// apps/backend/src/user/application/error/cannot-demote-self-error.ts
export class CannotDemoteSelfError extends Error {
  constructor(errorOptions?: ErrorOptions) {
    super("Admin cannot remove their own admin privileges", errorOptions)
    this.name = "CannotDemoteSelfError"
  }
}
```

- [ ] **Step 2: Adicionar `updateRole` à entidade User**

Abra `apps/backend/src/user/domain/user.ts`. Localize o método `activate()` (linha ~279). Adicione o método `updateRole` logo após `activate()`:

```typescript
public updateRole(role: RoleTypes): void {
  this._role = Role.restore(role)
  this.refreshUpdatedAt()
}
```

O import de `RoleTypes` já existe na linha 25: `import { Role, type RoleTypes } from "./value-object/role"`. Nenhum import adicional é necessário.

- [ ] **Step 3: Verificar que o TypeScript compila**

```bash
pnpm --filter backend tsc:check
```

Esperado: zero erros.

- [ ] **Step 4: Rodar testes unitários existentes**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam (nenhum teste existente foi alterado).

- [ ] **Step 5: Commit**

```bash
cd apps/backend
git add src/user/domain/user.ts \
  src/user/application/error/user-already-admin-error.ts \
  src/user/application/error/user-is-not-admin-error.ts \
  src/user/application/error/user-is-super-admin-error.ts \
  src/user/application/error/user-is-not-active-error.ts \
  src/user/application/error/cannot-demote-self-error.ts
git commit -m "feat(user): add updateRole method and role management domain errors"
```

## Critérios de Sucesso

- `user.updateRole("ADMIN")` altera `user.role` para `"ADMIN"` e atualiza `updatedAt`
- `user.updateRole("MEMBER")` altera `user.role` para `"MEMBER"` e atualiza `updatedAt`
- Os 5 arquivos de erro existem com `name` correto e mensagem descritiva
- `tsc:check` e `test:run` passam sem erros
