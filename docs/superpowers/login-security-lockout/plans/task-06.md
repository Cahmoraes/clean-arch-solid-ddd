# Task 6: Eliminar `SUPER_ADMIN_EMAIL` magic string em promote/demote use cases [RF-017, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Substitui a constante hardcoded `SUPER_ADMIN_EMAIL = "admin@admin.com"` nos use cases `PromoteToAdminUseCase` e `DemoteFromAdminUseCase` pela verificação `user.isSuperAdmin` (propriedade adicionada na Task 2). Atualiza os testes correspondentes.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts`
- Modify: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts`
- Modify: `apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts`
- Modify: `apps/backend/src/user/infra/controller/demote-from-admin.business-flow-test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: remover magic string; a propriedade `isSuperAdmin` é a solução correta

## Passos

- [ ] **Step 1: Atualizar `promote-to-admin.usecase.ts`**

Arquivo: `apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts`

Localizar a linha (aproximadamente linha 15):
```typescript
const SUPER_ADMIN_EMAIL = "admin@admin.com"
```

E a verificação que usa essa constante (algo como):
```typescript
if (targetUser.email === SUPER_ADMIN_EMAIL) {
  return failure(new UserIsSuperAdminError())
}
```

Substituir por:

```typescript
// Remover a constante SUPER_ADMIN_EMAIL completamente.
// Substituir a verificação por:
if (targetUser.isSuperAdmin) {
  return failure(new UserIsSuperAdminError())
}
```

- [ ] **Step 2: Atualizar `demote-from-admin.usecase.ts`**

Arquivo: `apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts`

Aplicar a mesma substituição:

```typescript
// Remover: const SUPER_ADMIN_EMAIL = "admin@admin.com"
// Substituir a verificação por:
if (targetUser.isSuperAdmin) {
  return failure(new UserIsSuperAdminError())
}
```

- [ ] **Step 3: Rodar os testes existentes de promote/demote para confirmar que ainda passam**

```bash
pnpm --filter backend test:run -- -t "PromoteToAdmin"
pnpm --filter backend test:run -- -t "DemoteFromAdmin"
```

Esperado: PASS (os testes existentes criam usuários via `User.restore()` com `isSuperAdmin: true` para o root admin).

> **Se os testes falharem:** Os testes podem estar comparando email ao invés de usar `isSuperAdmin`. Atualizar as fixtures dos testes para criar o usuário alvo com `isSuperAdmin: true` via `User.restore()` ao invés de com o email `admin@admin.com`:
>
> ```typescript
> // Em vez de criar user com email: "admin@admin.com"
> // restaurar user com isSuperAdmin: true:
> const superAdmin = User.restore({
>   id: "some-id",
>   name: "Super Admin",
>   email: "admin@admin.com",
>   role: "ADMIN",
>   status: StatusTypes.ACTIVATED,
>   createdAt: new Date(),
>   isSuperAdmin: true,
> })
> await userRepository.save(superAdmin)
> ```

- [ ] **Step 4: Verificar e atualizar os business flow tests**

Arquivos:
- `apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts`
- `apps/backend/src/user/infra/controller/demote-from-admin.business-flow-test.ts`

Esses testes usam o seed data do banco que já terá `isSuperAdmin = true` para `admin@admin.com` após a migration da Task 1. Não deve ser necessária alteração na lógica — apenas verificar que os testes passam:

```bash
pnpm --filter backend test:business-flow -- -t "promote"
pnpm --filter backend test:business-flow -- -t "demote"
```

Esperado: PASS.

- [ ] **Step 5: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/user/application/use-case/promote-to-admin.usecase.ts \
        apps/backend/src/user/application/use-case/promote-to-admin.usecase.test.ts \
        apps/backend/src/user/application/use-case/demote-from-admin.usecase.ts \
        apps/backend/src/user/application/use-case/demote-from-admin.usecase.test.ts \
        apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts \
        apps/backend/src/user/infra/controller/demote-from-admin.business-flow-test.ts
git commit -m "refactor(login-security-lockout): substituir SUPER_ADMIN_EMAIL por user.isSuperAdmin"
```

## Critérios de Sucesso

- Nenhuma string `"admin@admin.com"` em uso cases de produção (somente testes que precisam de um super admin)
- `promote-to-admin.usecase.ts` e `demote-from-admin.usecase.ts` usam `user.isSuperAdmin`
- Todos os testes passam [RF-017, RF-020]
