# Task 6: Criar `EditProfileModal` e integrar na página [RF-006, RF-007, RF-008, RF-009, RF-010]

**Status:** DONE
**PRD:** `../prd/prd-user-profile-enrichment.md`
**Spec:** `../specs/user-profile-enrichment-design.md`

## Visão Geral

Criar o componente `EditProfileModal` com: campo de nome validado, link para `/perfil/senha` (label dinâmico), botões "Cancelar" / "Salvar". Integrar à página `/perfil` substituindo o placeholder `{/* EditProfileModal será adicionado na Task 6 */}`.

## Arquivos

- Create: `apps/frontend/src/features/profile/components/EditProfileModal.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`

### Conformidade com as Skills Padrão

- react: componentes controlados; formulário com react-hook-form ou estado local; `isPending` para loading
- shadcn: usar `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`; `Input`; `Label`
- no-workarounds: usar `updateProfileSchema` já definido em `features/profile/schemas/update-profile-schema.ts`

## Passos

- [ ] **Step 1: Verificar componentes shadcn disponíveis**

```bash
ls apps/frontend/src/components/ui/ | grep -E "dialog|input|label|form"
```

Se `dialog.tsx`, `input.tsx`, `label.tsx` existirem, use-os. Se não, instale:

```bash
cd apps/frontend
npx shadcn@latest add dialog input label
```

- [ ] **Step 2: Criar o componente `EditProfileModal`**

Crie `apps/frontend/src/features/profile/components/EditProfileModal.tsx`:

```typescript
"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateProfile } from "@/features/profile/api"
import { updateProfileSchema } from "@/features/profile/schemas/update-profile-schema"

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  hasPassword: boolean
}

export function EditProfileModal({
  open,
  onOpenChange,
  currentName,
  hasPassword,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentName)
  const [nameError, setNameError] = useState<string | null>(null)
  const { mutate: updateProfile, isPending } = useUpdateProfile()

  // Sincroniza o campo quando o modal abre com um nome atualizado
  useEffect(() => {
    if (open) {
      setName(currentName)
      setNameError(null)
    }
  }, [open, currentName])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = updateProfileSchema.safeParse({ name })
    if (!parsed.success) {
      setNameError(parsed.error.errors[0]?.message ?? "Nome inválido.")
      return
    }
    setNameError(null)
    updateProfile(
      { name: parsed.data.name },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
        onError: () => {
          setNameError("Não foi possível salvar. Tente novamente.")
        },
      },
    )
  }

  const passwordLabel = hasPassword ? "Alterar senha" : "Definir senha"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              data-testid="edit-profile-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError(null)
              }}
              disabled={isPending}
              autoComplete="name"
            />
            {nameError && (
              <p
                role="alert"
                className="text-xs text-destructive"
              >
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
              Segurança da conta
            </p>
            <Link
              href="/perfil/senha"
              data-testid="edit-profile-password-link"
              className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm hover:bg-muted transition-colors"
              onClick={() => onOpenChange(false)}
            >
              <span>{passwordLabel}</span>
              <span className="text-muted-foreground">→</span>
            </Link>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              data-testid="edit-profile-cancel"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="edit-profile-save"
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Integrar o `EditProfileModal` na página `/perfil`**

Em `apps/frontend/src/app/(authenticated)/perfil/page.tsx`:

1. Adicione o import do modal:

```typescript
import { EditProfileModal } from "@/features/profile/components/EditProfileModal"
```

2. Substitua o comentário `{/* EditProfileModal será adicionado na Task 6 */}` pelo componente:

```typescript
{me && (
  <EditProfileModal
    open={editOpen}
    onOpenChange={setEditOpen}
    currentName={me.name}
    hasPassword={me.hasPassword}
  />
)}
```

O JSX final do `ProfilePage` fica:

```typescript
export default function ProfilePage() {
  const [editOpen, setEditOpen] = React.useState(false)
  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    refetch: meRefetch,
    isFetching: meFetching,
  } = useMe()
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: metricsRefetch,
  } = useMetrics()

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Meu perfil
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
        </p>
      </header>

      <ProfileCard
        me={me}
        meLoading={meLoading}
        meError={meError}
        meFetching={meFetching}
        onRetry={() => void meRefetch()}
        checkInsCount={metrics?.checkInsCount}
        metricsLoading={metricsLoading}
        metricsError={metricsError}
        onMetricsRetry={() => void metricsRefetch()}
        onEdit={() => setEditOpen(true)}
      />

      {me && (
        <EditProfileModal
          open={editOpen}
          onOpenChange={setEditOpen}
          currentName={me.name}
          hasPassword={me.hasPassword}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 4: Verificar type-check e lint**

```bash
cd apps/frontend
pnpm tsc:check && pnpm lint:fix
```

Esperado: zero erros.

- [ ] **Step 5: Rodar os testes do frontend**

```bash
cd apps/frontend
pnpm test
```

Esperado: todos passando (testes existentes não devem quebrar).

- [ ] **Step 6: Build final de verificação**

```bash
cd /path/to/repo-root
pnpm build
```

Esperado: build completa sem erros.

- [ ] **Step 7: Validação final completa**

```bash
pnpm --filter backend biome:fix && \
pnpm --filter backend tsc:check && \
pnpm --filter backend test:run && \
pnpm --filter frontend tsc:check && \
pnpm --filter frontend test && \
pnpm build
```

Esperado: tudo passando com zero erros.

- [ ] **Step 8: Commit final**

```bash
git add apps/frontend/src/features/profile/components/EditProfileModal.tsx \
        apps/frontend/src/app/(authenticated)/perfil/page.tsx
git commit -m "feat(profile): add EditProfileModal with name edit and password link

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Modal abre ao clicar em "Editar perfil" [RF-006]
- Campo nome pré-preenchido e editável; validação inline com mensagem de erro [RF-007]
- Link senha com label dinâmico: "Alterar senha" se `hasPassword === true`, "Definir senha" se false [RF-008]
- Ao salvar com sucesso: modal fecha e nome atualizado aparece sem reload [RF-007, RF-009]
- Botão "Salvar" desabilitado e mostra "Salvando..." durante a requisição [RF-007]
- Botão "Cancelar" fecha o modal sem salvar [RF-006]
- Build completa sem erros; `biome:fix`, `tsc:check`, `test:run` todos passando [RF-010]
