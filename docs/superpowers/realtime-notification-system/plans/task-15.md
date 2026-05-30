# Task 15: Frontend SSE hook + @microsoft/fetch-event-source [RF-001, RF-002, RF-003]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-14

## Visão Geral

Instalar `@microsoft/fetch-event-source` (suporta headers customizados, ao contrário do `EventSource` nativo), implementar `useNotificationStream` hook que abre e mantém a conexão SSE com o Bearer token, e expõe callbacks para novos eventos. Inclui lógica de reconnect automático via `Last-Event-ID`.

## Arquivos

- Modify: `apps/frontend/package.json` (instalar dep)
- Create: `apps/frontend/src/lib/notifications/use-notification-stream.ts`
- Create: `apps/frontend/src/lib/notifications/use-notification-stream.test.ts`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: este hook é de side-effect (SSE), não de fetching — não usar `useQuery`; usar `useEffect` + ref pattern
- code-style: hook com discriminated union state, cleanup no return do useEffect

## Passos

### Passo 1: Instalar `@microsoft/fetch-event-source`

```bash
cd apps/frontend
pnpm add @microsoft/fetch-event-source
```

Esperado: pacote adicionado em `package.json` e instalado em `node_modules`.

### Passo 2: Verificar instalação

```bash
cd apps/frontend
node -e "require('@microsoft/fetch-event-source'); console.log('ok')"
```

Esperado: `ok`

### Passo 3: Escrever os testes que falham

Arquivo: `apps/frontend/src/lib/notifications/use-notification-stream.test.ts`

```ts
import { renderHook, act } from "@testing-library/react"
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest"
import { useNotificationStream } from "./use-notification-stream"

// Mock @microsoft/fetch-event-source
vi.mock("@microsoft/fetch-event-source", () => ({
  fetchEventSource: vi.fn(
    async (
      _url: string,
      options: {
        onmessage?: (event: { data: string }) => void
        onerror?: (err: Error) => void
        signal?: AbortSignal
      },
    ) => {
      // Simulate receiving a message
      if (options.onmessage) {
        options.onmessage({
          data: JSON.stringify({
            type: "notification",
            payload: { notificationId: "n-1", userId: "u-1", type: "CHECK_IN_APPROVED", title: "Aprovado", message: "Aprovado" },
          }),
        })
      }
      // Keep the promise pending until aborted
      return new Promise<void>((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => reject(new Error("AbortError")))
      })
    },
  ),
}))

const mockGetAuthSnapshot = vi.fn(() => ({
  accessToken: "mock-token",
  user: { id: "u-1", role: "MEMBER" as const },
  expiresAt: null,
  setSession: vi.fn(),
  clear: vi.fn(),
}))

vi.mock("@/lib/auth/auth-store", () => ({
  getAuthSnapshot: () => mockGetAuthSnapshot(),
}))

describe("useNotificationStream", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("should call onMessage when SSE event is received", async () => {
    const onMessage = vi.fn()

    renderHook(() =>
      useNotificationStream({
        enabled: true,
        onMessage,
      }),
    )

    // Give time for the useEffect to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "notification" }),
    )
  })

  test("should not connect when enabled=false", async () => {
    const { fetchEventSource } = await import(
      "@microsoft/fetch-event-source"
    )

    renderHook(() =>
      useNotificationStream({
        enabled: false,
        onMessage: vi.fn(),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(fetchEventSource).not.toHaveBeenCalled()
  })

  test("should abort connection on unmount", async () => {
    const { fetchEventSource } = await import(
      "@microsoft/fetch-event-source"
    )

    const { unmount } = renderHook(() =>
      useNotificationStream({
        enabled: true,
        onMessage: vi.fn(),
      }),
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(fetchEventSource).toHaveBeenCalledOnce()

    unmount()

    // After unmount, the AbortController should have been aborted
    const callArgs = (fetchEventSource as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(callArgs.signal.aborted).toBe(true)
  })
})
```

### Passo 4: Executar os testes para confirmar falha

```bash
cd apps/frontend
pnpm test -- use-notification-stream
```

Esperado: FAIL — hook não existe.

### Passo 5: Implementar `useNotificationStream`

Arquivo: `apps/frontend/src/lib/notifications/use-notification-stream.ts`

```ts
"use client"

import { fetchEventSource } from "@microsoft/fetch-event-source"
import { useEffect, useRef } from "react"
import { getAuthSnapshot } from "@/lib/auth/auth-store"

export interface NotificationStreamPayload {
  notificationId: string
  userId: string
  type: string
  title: string
  message: string
}

export interface SseMessage {
  type: "notification" | "connected"
  payload?: NotificationStreamPayload
  userId?: string
}

export interface UseNotificationStreamOptions {
  enabled: boolean
  onMessage: (message: SseMessage) => void
}

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/v1/notifications/stream`

export function useNotificationStream({
  enabled,
  onMessage,
}: UseNotificationStreamOptions): void {
  const abortControllerRef = useRef<AbortController | null>(null)
  const onMessageRef = useRef(onMessage)

  // Keep callback ref current without triggering reconnect
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    const { accessToken } = getAuthSnapshot()

    fetchEventSource(SSE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken ?? ""}`,
        Accept: "text/event-stream",
      },
      signal: controller.signal,
      onmessage(event) {
        try {
          const data = JSON.parse(event.data) as SseMessage
          onMessageRef.current(data)
        } catch {
          // Ignore malformed messages
        }
      },
      onerror(err) {
        // fetchEventSource retries automatically; re-throw to stop retries on abort
        if (controller.signal.aborted) throw err
      },
    }).catch(() => {
      // Connection ended (abort or error) — no-op
    })

    return () => {
      controller.abort()
    }
  }, [enabled])
}
```

### Passo 6: Executar os testes para confirmar que passam

```bash
cd apps/frontend
pnpm test -- use-notification-stream
```

Esperado: PASS.

### Passo 7: Type-check e lint

```bash
cd apps/frontend
pnpm tsc:check && pnpm lint:fix
```

Esperado: zero erros.

### Passo 8: Commit

```bash
git add \
  apps/frontend/package.json \
  apps/frontend/src/lib/notifications/use-notification-stream.ts \
  apps/frontend/src/lib/notifications/use-notification-stream.test.ts
git commit -m "feat(frontend): add useNotificationStream hook with fetch-event-source"
```

## Critérios de Sucesso

- `@microsoft/fetch-event-source` instalado no frontend [RF-003]
- `useNotificationStream` abre SSE com `Authorization: Bearer <token>` [RF-001]
- Chama `onMessage` ao receber eventos SSE [RF-002]
- Aborta conexão ao desmontar (cleanup no `useEffect`) [RF-002]
- Não conecta quando `enabled=false` [RF-003]
- Testes passam; `tsc:check` + `lint:fix` sem erros
