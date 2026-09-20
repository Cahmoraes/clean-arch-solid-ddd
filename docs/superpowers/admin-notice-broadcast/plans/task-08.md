# Task 8: Schema, mutation e handler MSW do aviso [FR-002, FR-003]

**Status:** PENDING
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** task-05

## Visão Geral

Camada de dados do frontend para o aviso: `noticeSchema` (zod; título 1-100 e mensagem 1-500, com `trim`), hook `useBroadcastNotice` (mutation TanStack Query sobre o cliente OpenAPI tipado, `POST /api/v1/notifications/broadcast`) e o handler MSW padrão em `src/test/msw/handlers.ts` (o setup usa `onUnhandledRequest: "error"`, então todo endpoint novo precisa de handler). O cliente tipado depende dos tipos gerados na task 5. O middleware de `@/lib/api` já converte respostas não-2xx em `ApiError`.

## Arquivos

- Create: `apps/frontend/src/features/notices/schemas/notice-schema.ts`
- Create: `apps/frontend/src/features/notices/api/use-broadcast-notice.ts`
- Modify: `apps/frontend/src/test/msw/handlers.ts`
- Test: `apps/frontend/src/features/notices/schemas/notice-schema.test.ts`
- Test: `apps/frontend/src/features/notices/api/use-broadcast-notice.test.tsx`

### Conformidade com as Skills Padrão

- `test-antipatterns`: o hook é testado contra o servidor MSW (rede simulada na borda), sem mockar `api` nem o `useMutation`; o schema é testado por entradas e saídas.
- `no-workarounds`: usa `api.POST` tipado com a rota gerada; não copia o cast `(api.PATCH as any)` de hooks antigos.
- `vercel-react-best-practices`: hook sem efeito colateral em render; erros normalizados em `ApiError` de forma única.
- `tanstack-query-best-practices`: `useMutation` tipado (`UseMutationResult<Resultado, ApiError, NoticeInput>`), sem `onSuccess` que invalide queries desnecessárias (o aviso não altera a lista de quem envia além do que o SSE já cobre).

## Passos

- **Step 1: Write the failing test (schema)**

```ts
// apps/frontend/src/features/notices/schemas/notice-schema.test.ts
import { describe, expect, test } from "vitest"
import {
	NOTICE_MESSAGE_MAX,
	NOTICE_TITLE_MAX,
	noticeSchema,
} from "./notice-schema"

const VALID = { title: "Manutenção", message: "Sistema fora do ar às 22h." }

describe("noticeSchema", () => {
	test("aceita título e mensagem válidos", () => {
		expect(noticeSchema.safeParse(VALID).success).toBe(true)
	})

	test("limites são 100 e 500", () => {
		expect(NOTICE_TITLE_MAX).toBe(100)
		expect(NOTICE_MESSAGE_MAX).toBe(500)
	})

	test("aceita título com exatamente 100 caracteres", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			title: "a".repeat(NOTICE_TITLE_MAX),
		})
		expect(result.success).toBe(true)
	})

	test("recusa título com 101 caracteres com mensagem clara", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			title: "a".repeat(NOTICE_TITLE_MAX + 1),
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"O título deve ter no máximo 100 caracteres.",
		)
	})

	test("aceita título com 1 caractere", () => {
		expect(noticeSchema.safeParse({ ...VALID, title: "a" }).success).toBe(true)
	})

	test("recusa título vazio com mensagem clara", () => {
		const result = noticeSchema.safeParse({ ...VALID, title: "" })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe("Informe o título do aviso.")
	})

	test("recusa título só com espaços", () => {
		const result = noticeSchema.safeParse({ ...VALID, title: "     " })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe("Informe o título do aviso.")
	})

	test("aceita mensagem com exatamente 500 caracteres", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			message: "a".repeat(NOTICE_MESSAGE_MAX),
		})
		expect(result.success).toBe(true)
	})

	test("recusa mensagem com 501 caracteres com mensagem clara", () => {
		const result = noticeSchema.safeParse({
			...VALID,
			message: "a".repeat(NOTICE_MESSAGE_MAX + 1),
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"A mensagem deve ter no máximo 500 caracteres.",
		)
	})

	test("recusa mensagem vazia com mensagem clara", () => {
		const result = noticeSchema.safeParse({ ...VALID, message: "" })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"Informe a mensagem do aviso.",
		)
	})

	test("recusa mensagem só com espaços", () => {
		const result = noticeSchema.safeParse({ ...VALID, message: "   " })
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toBe(
			"Informe a mensagem do aviso.",
		)
	})

	test("aplica trim nos valores aceitos", () => {
		const result = noticeSchema.parse({
			title: "  Aviso  ",
			message: "  Mensagem  ",
		})
		expect(result).toEqual({ title: "Aviso", message: "Mensagem" })
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/schemas/notice-schema.test.ts`
Expected: FAIL - não foi possível resolver `./notice-schema` (módulo inexistente).

- **Step 3: Write minimal implementation (schema)**

```ts
// apps/frontend/src/features/notices/schemas/notice-schema.ts
import { z } from "zod"

export const NOTICE_TITLE_MAX = 100
export const NOTICE_MESSAGE_MAX = 500

export const noticeSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Informe o título do aviso.")
		.max(
			NOTICE_TITLE_MAX,
			`O título deve ter no máximo ${NOTICE_TITLE_MAX} caracteres.`,
		),
	message: z
		.string()
		.trim()
		.min(1, "Informe a mensagem do aviso.")
		.max(
			NOTICE_MESSAGE_MAX,
			`A mensagem deve ter no máximo ${NOTICE_MESSAGE_MAX} caracteres.`,
		),
})

export type NoticeInput = z.infer<typeof noticeSchema>
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/schemas/notice-schema.test.ts`
Expected: PASS (12 testes).

- **Step 5: Write the failing test (hook)**

```tsx
// apps/frontend/src/features/notices/api/use-broadcast-notice.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { ApiError } from "@/lib/errors"
import { server } from "@/test/msw/server"
import { useBroadcastNotice } from "./use-broadcast-notice"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const BROADCAST_URL = `${apiBaseUrl}/api/v1/notifications/broadcast`

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity, staleTime: 0 },
			mutations: { retry: false },
		},
	})
}

function wrapper(
	queryClient: QueryClient,
): (props: { children: ReactNode }) => React.JSX.Element {
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useBroadcastNotice", () => {
	test("envia título e mensagem e devolve o número de destinatários (handler padrão)", async () => {
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await result.current.mutateAsync({
				title: "Manutenção",
				message: "Sistema fora do ar às 22h.",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({ recipients: 3 })
	})

	test("envia o corpo { title, message } para POST /api/v1/notifications/broadcast", async () => {
		let receivedBody: unknown
		server.use(
			http.post(BROADCAST_URL, async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json({ recipients: 1 }, { status: 201 })
			}),
		)
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await result.current.mutateAsync({ title: "Aviso", message: "Mensagem" })
		})

		expect(receivedBody).toEqual({ title: "Aviso", message: "Mensagem" })
		expect(result.current.data).toEqual({ recipients: 1 })
	})

	test("erro do servidor vira ApiError com o status", async () => {
		server.use(
			http.post(BROADCAST_URL, () =>
				HttpResponse.json({ message: "Erro" }, { status: 500 }),
			),
		)
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await expect(
				result.current.mutateAsync({ title: "Aviso", message: "Mensagem" }),
			).rejects.toBeInstanceOf(ApiError)
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.status).toBe(500)
	})
})
```

- **Step 6: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/api/use-broadcast-notice.test.tsx`
Expected: FAIL - não foi possível resolver `./use-broadcast-notice` (módulo inexistente).

- **Step 7: Write minimal implementation (hook + handler MSW)**

Antes de escrever, confirmar em `apps/frontend/src/features/admin/api/use-suspend-user.ts` o import de `ApiError`/`mapStatusToMessage` (`@/lib/errors`) e o `toApiError` local; o hook abaixo segue o mesmo padrão.

```ts
// apps/frontend/src/features/notices/api/use-broadcast-notice.ts
"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { NoticeInput } from "../schemas/notice-schema"

export interface BroadcastNoticeResult {
	recipients: number
}

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(500)
	return new ApiError(500, "network_error", message)
}

async function broadcastNoticeRequest(
	input: NoticeInput,
): Promise<BroadcastNoticeResult> {
	const { data, error } = await api.POST("/api/v1/notifications/broadcast", {
		body: input,
	})
	if (error || !data) throw toApiError(error)
	return { recipients: data.recipients }
}

export function useBroadcastNotice(): UseMutationResult<
	BroadcastNoticeResult,
	ApiError,
	NoticeInput
> {
	return useMutation<BroadcastNoticeResult, ApiError, NoticeInput>({
		mutationFn: broadcastNoticeRequest,
	})
}
```

```ts
// apps/frontend/src/test/msw/handlers.ts: novo item dentro do array `handlers`
	http.post(endpoint("/api/v1/notifications/broadcast"), () =>
		HttpResponse.json({ recipients: 3 }, { status: 201 }),
	),
```

- **Step 8: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/api/use-broadcast-notice.test.tsx`
Expected: PASS (3 testes). Se `api.POST` não aceitar a rota, os tipos gerados da task 5 não foram aplicados: rodar `pnpm generate:types` (raiz) e conferir `packages/api-types/index.d.ts`.

- **Step 9: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/frontend/src/features/notices apps/frontend/src/test/msw/handlers.ts
git commit -m "feat(notices): adiciona schema, mutation e handler MSW do aviso"
```

## Critérios de Sucesso

- `noticeSchema` recusa título fora de 1-100 e mensagem fora de 1-500 (após `trim`, incluindo só espaços) com mensagem de validação clara, e aceita os limites exatos (FR-002).
- `useBroadcastNotice` faz `POST /api/v1/notifications/broadcast` com o corpo `{ title, message }` e devolve `{ recipients }` para o toast de sucesso (FR-003).
- Erros do servidor chegam como `ApiError`; o handler MSW padrão responde 201 `{ recipients: 3 }`.
