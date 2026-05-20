# Task 5: Redesenhar página `/perfil` [RF-001, RF-002, RF-003, RF-004]

**Status:** PENDING
**PRD:** `../prd/prd-user-profile-enrichment.md`
**Spec:** `../specs/user-profile-enrichment-design.md`

## Visão Geral

Substituir o layout atual da página `/perfil` pelo novo layout de cartão compacto: avatar com iniciais, nome + e-mail no header, badges de role e status, grid com ID/data de cadastro/check-ins, e botão "Editar perfil". O `EditProfileModal` será adicionado na Task 6 — por ora, adicionar o botão que chama uma prop `onEdit` (preparação para o modal).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`

### Conformidade com as Skills Padrão

- react: componentes funcionais com hooks; estado de loading/error granular
- shadcn: usar componentes do shadcn/ui (`Button`, `Skeleton`, `Badge` se disponível)
- tailwindcss: classes utilitárias; sem estilos inline

## Passos

- [ ] **Step 1: Verificar componentes shadcn disponíveis**

```bash
ls apps/frontend/src/components/ui/
```

Identifique se existe um componente `Badge` ou `badge.tsx`. Se não existir, o status e role serão estilizados via `className` no próprio `<span>`.

- [ ] **Step 2: Criar uma função auxiliar para gerar iniciais do nome**

No topo do arquivo `apps/frontend/src/app/(authenticated)/perfil/page.tsx`, adicione:

```typescript
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("")
}
```

- [ ] **Step 3: Criar função auxiliar para formatar a data em pt-BR**

```typescript
function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString))
}
```

- [ ] **Step 4: Criar componente `StatusBadge`**

```typescript
import type { StatusTypes } from "@repo/api-types" // ou usar string literal diretamente

const statusConfig = {
  activated: {
    label: "Ativo",
    className: "bg-green-950 text-green-400 border border-green-800",
  },
  suspended: {
    label: "Suspenso",
    className: "bg-red-950 text-red-400 border border-red-800",
  },
} as const

function StatusBadge({ status }: { status: string }) {
  const config =
    statusConfig[status as keyof typeof statusConfig] ?? statusConfig.activated
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  )
}
```

- [ ] **Step 5: Substituir o componente `ProfileSection`**

Substitua o `ProfileSection` existente e o `MetricsSection` por um componente unificado `ProfileCard`:

```typescript
interface ProfileCardProps {
  me: Me | undefined
  meLoading: boolean
  meError: boolean
  meFetching: boolean
  onRetry: () => void
  checkInsCount: number | undefined
  metricsLoading: boolean
  metricsError: boolean
  onMetricsRetry: () => void
  onEdit: () => void
}

function ProfileCard({
  me,
  meLoading,
  meError,
  meFetching,
  onRetry,
  checkInsCount,
  metricsLoading,
  metricsError,
  onMetricsRetry,
  onEdit,
}: ProfileCardProps) {
  if (meLoading) {
    return (
      <div className="rounded-[12px] border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="col-span-2 h-20 rounded-lg" />
        </div>
      </div>
    )
  }

  if (meError || !me) {
    return (
      <EmptyState
        icon={UserCircle}
        title="Não foi possível carregar seu perfil"
        description="Verifique sua conexão e tente novamente."
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={onRetry}
            disabled={meFetching}
          >
            Tentar novamente
          </Button>
        }
      />
    )
  }

  return (
    <div
      data-testid="profile-card"
      className="rounded-[12px] border border-border bg-card p-6 flex flex-col gap-5"
    >
      {/* Header: avatar + nome + badges */}
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-lg"
        >
          {getInitials(me.name)}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span
            data-testid="profile-name"
            className="font-semibold text-foreground truncate"
          >
            {me.name}
          </span>
          <span
            data-testid="profile-email"
            className="text-sm text-muted-foreground truncate"
          >
            {me.email}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {me.role === "ADMIN" && <AdminBadge />}
          {me.status && <StatusBadge status={me.status} />}
        </div>
      </div>

      {/* Grid de dados */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
            ID
          </p>
          <p
            data-testid="profile-id"
            className="text-xs font-mono text-foreground truncate"
          >
            {me.id}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
            Membro desde
          </p>
          <p
            data-testid="profile-created-at"
            className="text-sm text-foreground"
          >
            {me.createdAt ? formatDate(me.createdAt) : "—"}
          </p>
        </div>
        <div className="col-span-2 rounded-lg bg-muted/50 p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
              Check-ins realizados
            </p>
            {metricsLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : metricsError ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onMetricsRetry}
                className="h-auto p-0 text-xs"
              >
                Tentar novamente
              </Button>
            ) : (
              <span
                data-testid="metric-checkins"
                className="font-display text-2xl font-semibold text-primary"
              >
                {checkInsCount ?? 0}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Botão de edição */}
      <Button
        type="button"
        variant="secondary"
        onClick={onEdit}
        data-testid="profile-edit-button"
        className="w-full"
      >
        ✏️ Editar perfil
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Atualizar o componente `ProfilePage`**

Substitua o componente `ProfilePage` existente pelo seguinte:

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

      {/* EditProfileModal será adicionado na Task 6 */}
    </main>
  )
}
```

Adicione o import do React no topo do arquivo:

```typescript
import React from "react"
```

- [ ] **Step 7: Verificar type-check e lint**

```bash
cd apps/frontend
pnpm tsc:check && pnpm lint:fix
```

Esperado: zero erros.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/app/(authenticated)/perfil/page.tsx
git commit -m "feat(profile): redesign /perfil page with enriched compact card layout

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Página exibe avatar com iniciais, nome, e-mail, badge de role, badge de status [RF-003, RF-004]
- Exibe ID, data de cadastro formatada em pt-BR, total de check-ins [RF-001]
- `activated` → badge "Ativo" (verde); `suspended` → badge "Suspenso" (vermelho) [RF-002]
- Botão "Editar perfil" presente com `data-testid="profile-edit-button"` [RF-004]
- `tsc:check` e `lint:fix` sem erros
