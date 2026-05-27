# Task 7: Frontend — Ajuste de largura do layout [RF-001]

**Status:** PENDING
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Troca as classes CSS do `<section>` principal da página `/admin/usuarios` para alinhar com o container do check-ins (`max-w-3xl`). Mudança cirúrgica de uma linha.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- tailwindcss: usar apenas tokens semânticos — `max-w-3xl` é token padrão do Tailwind v4
- no-workarounds: mudança direta, sem classes inline adicionais

## Passos

- [ ] **Step 1: Atualizar classes do `<section>` na página**

Abra `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx` e localize o elemento `<section>` no `return` da função `AdminUsersPage`. Substitua as classes:

**Antes:**
```tsx
<section
  data-testid="admin-users-page"
  className="flex flex-col gap-8"
  aria-busy={isFetching}
>
```

**Depois:**
```tsx
<section
  data-testid="admin-users-page"
  className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
  aria-busy={isFetching}
>
```

- [ ] **Step 2: Rodar lint**

```bash
pnpm --filter frontend lint:fix
```

Esperado: zero issues.

- [ ] **Step 3: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros.

- [ ] **Step 4: Rodar testes existentes**

```bash
pnpm --filter frontend test
```

Esperado: todos os testes passando (nenhum teste quebra por mudança de classe CSS).

## Critérios de Sucesso

- `<section>` da página `/admin/usuarios` usa `mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6`
- Testes existentes continuam passando
- `lint:fix` e `tsc:check` passam sem erros
