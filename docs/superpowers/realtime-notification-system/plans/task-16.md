# Task 16: Frontend useNotifications hook [RF-006, RF-007, RF-008, RF-009, RF-016, RF-017, RF-018, RF-019]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-15

## Visão Geral

Implementar `useNotifications` hook que combina:
- TanStack Query para buscar lista de notificações e contagem de não-lidas via REST
- `useNotificationStream` para receber notificações em realtime (invalida a query ao receber evento SSE)
- Mutations para marcar como lida (individual + todas) com optimistic update

## Arquivos

- Create: `apps/frontend/src/lib/notifications/use-notifications.ts`
- Create: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: `useQuery`, `useMutation`, `queryClient.invalidateQueries`, optimistic update via `onMutate`/`onError`
- code-style: discriminated union hook state, `useAuthStore` via selector

## Passos

### Passo 1: Escrever os testes que falham

Arquivo: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, act, waitFor } from "@testing-library/react"
import { describe, expect, test, vi, beforeEach } from "vitest"
import { useNotifications } from "./use-notifications"

// Mock API client
const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock("@/lib/api", () => ({
  api: {
    GET: (...args: unknown[]) => mockGet(...args),
    PATCH: (...args: unknown[]) => mockPatch(...args),
  },
}))

// Mock SSE hook to be a no-op in tests
vi.mock("./use-notification-stream", () => ({
  useNotificationStream: vi.fn(),
}))

// Mock auth store — authenticated user
vi.mock("@/lib/auth/auth-store", () => ({
  useAuthStore: vi.fn((selector: (s: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: "user-1", role: "MEMBER" } }),
  ),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue({
      data: { notifications: [], total: 0 },
      error: undefined,
    })
    mockPatch.mockResolvedValue({ data: { readAt: new Date().toISOString() }, error: undefined })
  })

  test("should return empty notifications on initial load", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.notifications).toEqual([])
    expect(result.current.total).toBe(0)
  })

  test("should return notifications from API", async () => {
    mockGet.mockResolvedValue({
      data: {
        notifications: [
          {
            id: "n-1",
            type: "CHECK_IN_APPROVED",
            title: "Aprovado",
            message: "Aprovado",
            gymName: null,
            reason: null,
            readAt: null,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
      error: undefined,
    })

    const { result } = renderHook(() => useNotifications(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.total).toBe(1)
  })

  test("markAsRead() should call PATCH endpoint", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.markAsRead("n-1")
    })

    expect(mockPatch).toHaveBeenCalledWith(
      "/api/v1/notifications/{id}/read",
      expect.objectContaining({ params: { path: { id: "n-1" } } }),
    )
  })

  test("markAllAsRead() should call PATCH read-all endpoint", async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.markAllAsRead()
    })

    expect(mockPatch).toHaveBeenCalledWith(
      "/api/v1/notifications/read-all",
      expect.anything(),
    )
  })
})
```

### Passo 2: Executar os testes para confirmar falha

```bash
cd apps/frontend
pnpm test -- use-notifications
```

Esperado: FAIL — hook não existe.

### Passo 3: Implementar `useNotifications`

Arquivo: `apps/frontend/src/lib/notifications/use-notifications.ts`

```ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/lib/auth/auth-store"
import { api } from "@/lib/api"
import { useNotificationStream } from "./use-notification-stream"

export interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  gymName: string | null
  reason: string | null
  readAt: string | null
  createdAt: string
}

export interface UseNotificationsResult {
  notifications: NotificationItem[]
  total: number
  unreadCount: number
  isLoading: boolean
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

const QUERY_KEYS = {
  list: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
}

export function useNotifications(): UseNotificationsResult {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = user !== null

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.list,
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/notifications", {
        params: { query: { page: 1 } },
      })
      if (error) throw new Error("Failed to fetch notifications")
      return data
    },
  })

  const unreadCountQuery = useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/api/v1/notifications/unread-count",
        {},
      )
      if (error) throw new Error("Failed to fetch unread count")
      return data
    },
  })

  // SSE: invalidate list + count when new notification arrives
  useNotificationStream({
    enabled: isAuthenticated,
    onMessage(msg) {
      if (msg.type === "notification") {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount })
      }
    },
  })

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await api.PATCH(
        "/api/v1/notifications/{id}/read",
        { params: { path: { id: notificationId } } },
      )
      if (error) throw new Error("Failed to mark notification as read")
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.list })
      const previous = queryClient.getQueryData(QUERY_KEYS.list)

      queryClient.setQueryData(
        QUERY_KEYS.list,
        (old: typeof listQuery.data) => {
          if (!old) return old
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, readAt: new Date().toISOString() }
                : n,
            ),
          }
        },
      )

      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.list, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH(
        "/api/v1/notifications/read-all",
        {},
      )
      if (error) throw new Error("Failed to mark all notifications as read")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.list })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount })
    },
  })

  return {
    notifications: listQuery.data?.notifications ?? [],
    total: listQuery.data?.total ?? 0,
    unreadCount: unreadCountQuery.data?.count ?? 0,
    isLoading: listQuery.isLoading,
    markAsRead: (id: string) => markAsReadMutation.mutateAsync(id),
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
  }
}
```

### Passo 4: Executar os testes para confirmar que passam

```bash
cd apps/frontend
pnpm test -- use-notifications
```

Esperado: PASS.

### Passo 5: Type-check e lint

```bash
cd apps/frontend
pnpm tsc:check && pnpm lint:fix
```

Esperado: zero erros.

### Passo 6: Commit

```bash
git add \
  apps/frontend/src/lib/notifications/use-notifications.ts \
  apps/frontend/src/lib/notifications/use-notifications.test.tsx
git commit -m "feat(frontend): add useNotifications hook with TanStack Query + SSE integration"
```

## Critérios de Sucesso

- `notifications` e `total` vêm de `GET /api/v1/notifications` [RF-006, RF-007]
- `unreadCount` vem de `GET /api/v1/notifications/unread-count` [RF-008, RF-009]
- SSE invalida as queries ao receber `type: "notification"` [RF-006]
- `markAsRead()` faz optimistic update e invalida queries [RF-016, RF-017]
- `markAllAsRead()` invalida queries após mutation [RF-018, RF-019]
- Todos os testes passam; `tsc:check` + `lint:fix` sem erros
