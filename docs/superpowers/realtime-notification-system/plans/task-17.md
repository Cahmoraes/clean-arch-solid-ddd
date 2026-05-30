# Task 17: Frontend NotificationBell + Dropdown components [RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013, RF-014, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-16

## Visão Geral

Criar os componentes React do sistema de notificações e substituir o placeholder da sino em `authenticated-shell.tsx`:

1. **`NotificationItem`** — item individual: ícone por tipo, título, mensagem, tempo relativo, estado lido/não-lido
2. **`NotificationDropdown`** — painel dropdown com lista de notificações, estado vazio, botão "Marcar todas lidas"
3. **`NotificationBell`** — botão sino com badge de contagem não-lidas (oculto quando 0), toggle do dropdown
4. **Wiring** — substituir o `<button>` placeholder em `authenticated-shell.tsx` pelo `<NotificationBell />`

## Arquivos

- Create: `apps/frontend/src/components/notification/notification-item.tsx`
- Create: `apps/frontend/src/components/notification/notification-dropdown.tsx`
- Create: `apps/frontend/src/components/notification/notification-bell.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`

### Conformidade com as Skills Padrão

- code-style: componentes `.tsx`, kebab-case nos arquivos, shadcn/Radix UI pattern, Tailwind para estilo
- figma-to-code: dropdown estilo GitHub/Discord (flutuante, sombra, max-height com overflow scroll)

## Passos

### Passo 1: Criar `NotificationItem`

Arquivo: `apps/frontend/src/components/notification/notification-item.tsx`

```tsx
"use client"

import { CheckCircle, XCircle, ShieldAlert, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"

interface NotificationItemProps {
  notification: NotificationItemData
  onMarkAsRead: (id: string) => void
}

const TYPE_CONFIG = {
  CHECK_IN_APPROVED: {
    icon: CheckCircle,
    iconClass: "text-green-500",
    label: "Check-in aprovado",
  },
  CHECK_IN_REJECTED: {
    icon: XCircle,
    iconClass: "text-red-500",
    label: "Check-in rejeitado",
  },
  SECURITY_ALERT: {
    icon: ShieldAlert,
    iconClass: "text-amber-500",
    label: "Alerta de segurança",
  },
  PROMOTION: {
    icon: Tag,
    iconClass: "text-blue-500",
    label: "Promoção",
  },
} as const

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return "agora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const config =
    TYPE_CONFIG[notification.type as keyof typeof TYPE_CONFIG] ??
    TYPE_CONFIG.SECURITY_ALERT
  const Icon = config.icon
  const isRead = notification.readAt !== null

  return (
    <button
      type="button"
      onClick={() => {
        if (!isRead) onMarkAsRead(notification.id)
      }}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
        isRead && "opacity-60",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClass)}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {notification.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.message}
        </p>
        {!isRead && (
          <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        )}
      </div>
    </button>
  )
}
```

### Passo 2: Criar `NotificationDropdown`

Arquivo: `apps/frontend/src/components/notification/notification-dropdown.tsx`

```tsx
"use client"

import { BellOff } from "lucide-react"
import { NotificationItem } from "./notification-item"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"

interface NotificationDropdownProps {
  notifications: NotificationItemData[]
  isLoading: boolean
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

export function NotificationDropdown({
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDropdownProps) {
  const hasUnread = notifications.some((n) => n.readAt === null)

  return (
    <div
      role="dialog"
      aria-label="Notificações"
      className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold text-foreground">
          Notificações
        </span>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-xs text-accent hover:underline"
          >
            Marcar todas lidas
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <BellOff className="h-8 w-8 text-muted-foreground/40" />
            <span className="text-sm text-muted-foreground">
              Nenhuma notificação
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

### Passo 3: Criar `NotificationBell`

Arquivo: `apps/frontend/src/components/notification/notification-bell.tsx`

```tsx
"use client"

import { Bell } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/lib/notifications/use-notifications"
import { NotificationDropdown } from "./notification-dropdown"

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground",
          isOpen && "border-accent text-foreground",
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute right-2 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={async (id) => {
            await markAsRead(id)
          }}
          onMarkAllAsRead={async () => {
            await markAllAsRead()
            setIsOpen(false)
          }}
        />
      )}
    </div>
  )
}
```

### Passo 4: Substituir o placeholder em `authenticated-shell.tsx`

Arquivo: `apps/frontend/src/components/layout/authenticated-shell.tsx`

Localizar o bloco do botão placeholder (linhas ~187-194):

```tsx
<button
  type="button"
  aria-label="Notificações"
  className="relative inline-flex h-[42px] w-[42px] items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
>
  <Bell className="h-4 w-4" />
  <span className="absolute right-2.5 top-2.5 h-[7px] w-[7px] rounded-full border-2 border-surface bg-accent" />
</button>
```

Substituir por:

```tsx
<NotificationBell />
```

Adicionar o import no topo do arquivo (junto aos outros imports de componentes locais):

```tsx
import { NotificationBell } from "@/components/notification/notification-bell"
```

Remover o import de `Bell` de `lucide-react` se não for mais usado em outro lugar no arquivo.

### Passo 5: Verificar que o build do frontend passa

```bash
cd apps/frontend
pnpm build
```

Esperado: build Next.js completo sem erros.

### Passo 6: Type-check e lint

```bash
cd apps/frontend
pnpm tsc:check && pnpm lint:fix
```

Esperado: zero erros.

### Passo 7: Executar todos os testes do frontend

```bash
cd apps/frontend
pnpm test
```

Esperado: todos os testes passam.

### Passo 8: Commit

```bash
git add \
  apps/frontend/src/components/notification/notification-item.tsx \
  apps/frontend/src/components/notification/notification-dropdown.tsx \
  apps/frontend/src/components/notification/notification-bell.tsx \
  apps/frontend/src/components/layout/authenticated-shell.tsx
git commit -m "feat(frontend): add NotificationBell, NotificationDropdown, NotificationItem components"
```

## Critérios de Sucesso

- `NotificationBell` exibe badge com contagem de não-lidas (oculto quando 0) [RF-008, RF-009]
- Dropdown abre/fecha ao clicar no sino e ao clicar fora [RF-010, RF-011]
- Cada `NotificationItem` mostra ícone por tipo, título, mensagem, tempo relativo [RF-006, RF-007]
- Clicar em um item não-lido chama `markAsRead()` [RF-016, RF-017]
- Botão "Marcar todas lidas" aparece apenas quando há não-lidas e chama `markAllAsRead()` [RF-018, RF-019]
- Estado vazio com ícone BellOff quando não há notificações [RF-015]
- Fecha ao pressionar Escape [RF-014]
- `authenticated-shell.tsx` usa `<NotificationBell />` no lugar do placeholder [RF-010]
- `build`, `tsc:check` e `lint:fix` passam sem erros
