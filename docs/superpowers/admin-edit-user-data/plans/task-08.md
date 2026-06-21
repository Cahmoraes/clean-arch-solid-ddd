# Task 8: Aba Detalhes editável inline orquestrando as mutations [FR-001, FR-002, FR-003, FR-004, FR-007]

**Status:** DONE
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** task-06, task-07

## Visão Geral

Torna a aba **Detalhes** do `UserDetailPanel` editável inline (layout Opção A aprovado): botão "Editar" → campos viram inputs (nome, email, status, role) → "Salvar"/"Cancelar". Os campos exibidos como editáveis dependem de `resolvePermissions` (task 6); ao salvar, o componente orquestra apenas as mutations necessárias para o que mudou:
- nome/email → `useUpdateUser` (task 7)
- status → `useSuspendUser` / `useActivateUser`
- role → `usePromoteToAdmin` / `useDemoteFromAdmin`

O botão "Editar" só aparece quando há ao menos uma permissão de edição sobre o alvo. Erros (incl. 403) são exibidos inline via `InlineError` já existente.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/details-tab.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: layout inline coerente com o painel (tokens VOLT: primária `#39e58c`, radius 8px).
- `shadcn`: usar `Input`, `Button`, `Select`/`Tabs` existentes de `components/ui`.
- `tailwindcss`: classes utilitárias seguindo o padrão dos componentes vizinhos.
- `tanstack-query-best-practices`: orquestrar mutations; estados de loading/erro; só disparar o que mudou.
- `vercel-react-best-practices`: componente focado, estado local de edição bem contido.
- `typescript-advanced`: props e tipos do form derivados de `AdminUser`/`UserDetailPermissions`.
- `test-antipatterns`: testar via interação (Testing Library + MSW), não detalhes internos.

## Passos

- **Step 1: Escrever o teste falho do form de edição**

Em `details-edit-form.test.tsx` (padrão de `user-detail-panel.test.tsx`: QueryClientProvider, render, userEvent):

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { DetailsEditForm } from "./details-edit-form"

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const member: AdminUser = {
  id: "m1", name: "Maria", email: "maria@test.com", role: "MEMBER",
  status: "activated", isSuperAdmin: false, createdAt: "2025-01-01T00:00:00.000Z",
}

const allPermissions = {
  canSuspend: true, canActivate: true, canPromoteToAdmin: true, canDemoteFromAdmin: true,
  canDelete: true, isLocked: false, canEditProfile: true, canChangeStatus: true, canChangeRole: true,
}

describe("DetailsEditForm", () => {
  test("renderiza inputs de nome e email editáveis quando canEditProfile", () => {
    render(<DetailsEditForm user={member} permissions={allPermissions} onCancel={() => {}} onSaved={() => {}} />, { wrapper: wrapper() })
    expect(screen.getByLabelText("Nome")).toHaveValue("Maria")
    expect(screen.getByLabelText("E-mail")).toHaveValue("maria@test.com")
  })

  test("oculta o campo Role quando canChangeRole é false", () => {
    render(<DetailsEditForm user={member} permissions={{ ...allPermissions, canChangeRole: false }} onCancel={() => {}} onSaved={() => {}} />, { wrapper: wrapper() })
    expect(screen.queryByLabelText("Permissão")).not.toBeInTheDocument()
  })

  test("o botão Salvar fica desabilitado quando nada mudou", () => {
    render(<DetailsEditForm user={member} permissions={allPermissions} onCancel={() => {}} onSaved={() => {}} />, { wrapper: wrapper() })
    expect(screen.getByRole("button", { name: /salvar/i })).toBeDisabled()
  })
})
```

- **Step 2: Rodar e ver falhar**

Run: `pnpm --filter frontend test -- --run details-edit-form`
Expected: FAIL — `DetailsEditForm` inexistente.

- **Step 3: Implementar o `DetailsEditForm`**

Create `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useActivateUser } from "@/features/admin/api/use-activate-user"
import { useDemoteFromAdmin } from "@/features/admin/api/use-demote-from-admin"
import { usePromoteToAdmin } from "@/features/admin/api/use-promote-to-admin"
import { useSuspendUser } from "@/features/admin/api/use-suspend-user"
import { useUpdateUser } from "@/features/admin/api/use-update-user"
import { mapStatusToMessage } from "@/lib/errors"
import type { UserDetailPermissions } from "./use-user-detail-actions"

interface DetailsEditFormProps {
  user: AdminUser
  permissions: UserDetailPermissions
  onCancel: () => void
  onSaved: () => void
}

export function DetailsEditForm({ user, permissions, onCancel, onSaved }: DetailsEditFormProps) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState<AdminUser["status"]>(user.status)
  const [role, setRole] = useState<AdminUser["role"]>(user.role)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const updateUser = useUpdateUser()
  const suspendUser = useSuspendUser()
  const activateUser = useActivateUser()
  const promote = usePromoteToAdmin()
  const demote = useDemoteFromAdmin()

  const profileChanged = name !== user.name || email !== user.email
  const statusChanged = status !== user.status
  const roleChanged = role !== user.role
  const hasChanges = profileChanged || statusChanged || roleChanged

  const isPending =
    updateUser.isPending || suspendUser.isPending || activateUser.isPending ||
    promote.isPending || demote.isPending

  async function handleSave() {
    setErrorMessage(null)
    try {
      if (profileChanged && permissions.canEditProfile) {
        await updateUser.mutateAsync({ userId: user.id, name, email })
      }
      if (statusChanged && permissions.canChangeStatus) {
        if (status === "suspended") await suspendUser.mutateAsync(user.id)
        else if (status === "activated") await activateUser.mutateAsync(user.id)
      }
      if (roleChanged && permissions.canChangeRole) {
        if (role === "ADMIN") await promote.mutateAsync(user.id)
        else await demote.mutateAsync(user.id)
      }
      onSaved()
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500
      setErrorMessage(mapStatusToMessage(status))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {errorMessage ? (
        <div role="alert" className="rounded-[12px] border border-transparent bg-destructive-soft px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {permissions.canEditProfile ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-subtle">Nome</span>
            <Input aria-label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-subtle">E-mail</span>
            <Input aria-label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </>
      ) : null}

      {permissions.canChangeStatus ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-subtle">Status</span>
          <select
            aria-label="Status"
            className="h-10 rounded-md border border-input bg-background px-4 text-foreground"
            value={status === "locked" ? "suspended" : status}
            onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
          >
            <option value="activated">Ativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </label>
      ) : null}

      {permissions.canChangeRole ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-subtle">Permissão</span>
          <select
            aria-label="Permissão"
            className="h-10 rounded-md border border-input bg-background px-4 text-foreground"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUser["role"])}
          >
            <option value="MEMBER">Membro</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>
      ) : null}

      <div className="flex gap-2">
        <Button variant="primary" onClick={handleSave} disabled={!hasChanges || isPending}>
          {isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
```

> Confirme os caminhos de import reais das mutations (`use-suspend-user`, `use-activate-user`, `use-promote-to-admin`, `use-demote-from-admin`) — todas em `@/features/admin/api/`. Confirme se elas expõem `mutateAsync` (TanStack Query expõe por padrão) e `isPending`. `mapStatusToMessage` é exportado de `@/lib/errors` (confirme com `sg --pattern 'export function mapStatusToMessage' --lang ts apps/frontend/src/lib/errors.ts`). Se o `ApiError` carrega `status`, prefira ler `err.status` diretamente do `ApiError` (confirme o shape na task de errors).
> Se o projeto tiver um componente `Select` de shadcn (`components/ui/select.tsx`), prefira-o ao `<select>` nativo para consistência visual — confirme com `sg --pattern 'export $X Select' --lang tsx apps/frontend/src/components/ui`.

- **Step 4: Rodar e ver passar**

Run: `pnpm --filter frontend test -- --run details-edit-form`
Expected: PASS.

- **Step 5: Integrar o modo edição na aba Detalhes**

Edite `details-tab.tsx` para alternar entre leitura e edição. A `DetailsTab` passa a receber `permissions` e renderizar um botão "Editar" (quando houver qualquer permissão de edição) que troca para o `DetailsEditForm`:

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DetailsEditForm } from "./details-edit-form"
import type { UserDetailPermissions } from "./use-user-detail-actions"

export function DetailsTab({
  user,
  permissions,
}: {
  user: AdminUser
  permissions: UserDetailPermissions
}) {
  const [editing, setEditing] = useState(false)
  const canEditAnything =
    permissions.canEditProfile || permissions.canChangeStatus || permissions.canChangeRole

  if (editing) {
    return (
      <DetailsEditForm
        user={user}
        permissions={permissions}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {canEditAnything ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </div>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-2">
        {/* ... manter os InfoItem existentes (Nome, E-mail, User ID, Status, Permissão, Membro desde, Último acesso) ... */}
      </dl>
    </div>
  )
}
```

> Mantenha todos os `InfoItem` já existentes no `details-tab.tsx`; apenas envolva-os com o cabeçalho do botão e a alternância de estado. Não remova o `InfoItem` nem os helpers `statusBadgeClassName`/`statusLabel`/`RoleBadge`.

- **Step 6: Passar `permissions` do painel para a aba**

Em `user-detail-panel.tsx`, a `DetailsTab` é renderizada dentro de `UserDetailTabs`. Propague `permissions` (já calculado no painel via `resolvePermissions`) até a `DetailsTab`. Localize a renderização com `sg --pattern '<DetailsTab $$$/>' --lang tsx apps/frontend/src` e adicione a prop `permissions={permissions}`. Se as abas são montadas em `UserDetailTabs`, repasse `permissions` por essa camada também.

> Após salvar, o `onSaved` fecha o modo edição; as mutations já invalidam `ADMIN_USERS_QUERY_KEY`, então a lista e o painel são atualizados (FR-004). Se o painel usa um `onUserPatched` para refletir mudanças locais, chame-o no `onSaved` conforme o padrão existente.

- **Step 7: Teste de fluxo do painel (editar e salvar)**

Adicione ao `user-detail-panel.test.tsx` um teste que, com um membro e permissões de admin, clica em "Editar", altera o nome e clica em "Salvar", usando MSW para interceptar `PATCH /users/:id`:

```typescript
test("admin edita o nome de um membro pela aba Detalhes", async () => {
  // render do painel com user membro; mockar PATCH /users/{id} no MSW retornando 200
  // clicar em 'Editar', limpar o input 'Nome', digitar novo valor, clicar 'Salvar alterações'
  // esperar que a requisição PATCH foi feita (ex.: via flag no handler MSW)
})
```

> Implemente o corpo seguindo o padrão de MSW + userEvent já usado nos testes de mutation. Se o `UserDetailPanel` exige `currentUser` root/admin via `useAuthStore`, configure o store no setup do teste (veja `@/test/setup.ts` para como o auth store é limpo/configurado).

- **Step 8: Rodar a suíte do user-detail**

Run: `pnpm --filter frontend test -- --run user-detail details-edit-form`
Expected: PASS.

- **Step 9: Lint, types**

Run: `pnpm --filter frontend lint:fix` → zero issues
Run: `pnpm --filter frontend tsc:check` → zero erros

- **Step 10: Verificação visual rápida (opcional, recomendada)**

Suba o frontend e confirme: ao abrir um membro como admin, o botão "Editar" aparece; ao abrir outro admin como admin comum, não aparece (ou campos read-only); como root, o campo Permissão aparece.

Run: `pnpm --filter frontend dev` e navegue até `admin/usuarios`.

- **Step 11: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx \
        apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx \
        apps/frontend/src/features/admin/components/user-detail/details-tab.tsx \
        apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx
git commit -m "feat(admin): aba Detalhes editavel inline com gating de permissao"
```

## Critérios de Sucesso

- A aba Detalhes alterna entre leitura e edição; o botão "Editar" só aparece quando há permissão (FR-001, FR-002).
- Campos editáveis (nome/email/status/role) respeitam `resolvePermissions`; Role só visível para root (FR-002, FR-007).
- Salvar dispara apenas as mutations dos campos alterados; lista/painel atualizam após sucesso (FR-003, FR-004).
- Erros (incl. 403 do backend) aparecem inline.
- `lint:fix`, `tsc:check` e os testes de componente passam.
