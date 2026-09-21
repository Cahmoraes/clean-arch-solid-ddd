# Task 7: Tipos regenerados, schema e hook do frontend enviam o público [FR-002, FR-005]

**Status:** DONE
**Verified:** `bash -c cd apps/frontend && pnpm exec vitest run src/features/notices/schemas/notice-schema.test.ts src/features/notices/notice-audience-options.test.ts src/features/notices/api/use-broadcast-notice.test.tsx src/features/notices/components/notice-form.test.tsx` → exit 0
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-05

## Visão Geral

Leva o público para o frontend sem ainda mudar a tela. (1) Regenera os tipos de `@repo/api-types` com `pnpm generate:types` (raiz), para que o body do broadcast tipado no cliente `api` conheça `audience`. (2) `noticeSchema` ganha `audience: z.enum(["ALL", "MEMBERS", "ADMINS"])` (sem `default` no schema: o formulário fornece `"ALL"` em `defaultValues`, FR-002) e o tipo `NoticeAudience` é exportado dele. (3) Novo `notice-audience-options.ts` exporta `NOTICE_AUDIENCE_OPTIONS` (valor, rótulo e descrição de cada público) e o helper `noticeAudienceLabel`. (4) O hook `useBroadcastNotice` já repassa o `NoticeInput` inteiro como body, então não muda: o teste passa a provar que `audience` chega no corpo (FR-005). Como `NoticeInput` agora exige `audience`, o `EMPTY_NOTICE` do `notice-form.tsx` passa a `{ title: "", message: "", audience: "ALL" }` (para o arquivo continuar compilando e o formulário continuar enviando o padrão "Todos") e a asserção do caso de sucesso de `notice-form.test.tsx` passa a incluir `audience: "ALL"`. O seletor visual e o resto do formulário são as tasks 8 a 10.

## Arquivos

- Modify: `packages/api-types/index.d.ts` (regenerado por `pnpm generate:types`, não editar à mão)
- Modify: `apps/frontend/src/features/notices/schemas/notice-schema.ts`
- Create: `apps/frontend/src/features/notices/notice-audience-options.ts`
- Modify: `apps/frontend/src/features/notices/components/notice-form.tsx` (só a constante `EMPTY_NOTICE`)
- Test: `apps/frontend/src/features/notices/schemas/notice-schema.test.ts`
- Test: `apps/frontend/src/features/notices/notice-audience-options.test.ts`
- Test: `apps/frontend/src/features/notices/api/use-broadcast-notice.test.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-form.test.tsx` (só a asserção do caso de sucesso)

### Conformidade com as Skills Padrão

- `no-workarounds`: os tipos vêm da regeneração do OpenAPI (`pnpm generate:types`), nunca de edição manual de `index.d.ts` nem de `as`/`@ts-expect-error` no hook; o `audience` sem `default` no schema é decisão fechada, então nada de `?? "ALL"` espalhado.
- `test-antipatterns`: o teste do hook usa MSW real (`server.use`) e assere o corpo recebido; o teste do schema usa `safeParse` real; nada de mock do `api`.
- `typescript-advanced`: `NoticeAudience` é derivado do schema com `z.infer`, e o `NoticeInput` continua sendo `z.infer<typeof noticeSchema>`; as opções são `ReadonlyArray<{ value: NoticeAudience; ... }>`, então um valor novo no enum quebra a compilação até ganhar rótulo.
- `tanstack-query-best-practices`: o hook continua uma `useMutation` sem alteração de chaves de cache; o `NoticeInput` inteiro (com `audience`) é o `TVariables`.

## Passos

- **Step 1: Regenerar os tipos da API e conferir o diff**

Run (na raiz do repositório): `pnpm generate:types`
Expected: termina com código 0 (exporta o OpenAPI do backend e gera o cliente em `packages/api-types/index.d.ts`).

Run: `git diff -U3 packages/api-types/index.d.ts`
Expected: o diff mostra uma propriedade `audience` (com os valores `"ALL" | "MEMBERS" | "ADMINS"`) dentro do `requestBody` de `/api/v1/notifications/broadcast`. Registrar no relatório se o gerador a emitiu como opcional (`audience?:`) ou obrigatória, e se o diff trouxe alguma alteração alheia ao broadcast; alterações alheias devem ser reportadas antes do commit, não descartadas às cegas.

- **Step 2: Write the failing test (schema)**

Em `apps/frontend/src/features/notices/schemas/notice-schema.test.ts`, trocar a constante `VALID`:

```ts
const VALID = {
	title: "Manutenção",
	message: "Sistema fora do ar às 22h.",
	audience: "ALL",
}
```

Trocar o último teste (`aplica trim nos valores aceitos`) por:

```ts
	test("aplica trim nos valores aceitos", () => {
		const result = noticeSchema.parse({
			title: "  Aviso  ",
			message: "  Mensagem  ",
			audience: "ALL",
		})
		expect(result).toEqual({
			title: "Aviso",
			message: "Mensagem",
			audience: "ALL",
		})
	})
```

Adicionar ao final do `describe`:

```ts
	test.each(["ALL", "MEMBERS", "ADMINS"])(
		"aceita o público %s",
		(audience) => {
			expect(noticeSchema.safeParse({ ...VALID, audience }).success).toBe(true)
		},
	)

	test.each([
		["em minúsculas", "all"],
		["string vazia", ""],
		["nome em português", "todos"],
		["papel do domínio user", "ADMIN"],
		["null", null],
	])("recusa público %s", (_, audience) => {
		expect(noticeSchema.safeParse({ ...VALID, audience }).success).toBe(false)
	})

	test("recusa envio sem público: o formulário é quem fornece o padrão ALL", () => {
		const { audience: _audience, ...withoutAudience } = VALID

		expect(noticeSchema.safeParse(withoutAudience).success).toBe(false)
	})
```

- **Step 3: Write the failing test (opções)**

Criar `apps/frontend/src/features/notices/notice-audience-options.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import {
	NOTICE_AUDIENCE_OPTIONS,
	noticeAudienceLabel,
} from "./notice-audience-options"

describe("NOTICE_AUDIENCE_OPTIONS", () => {
	test("exporta as três opções na ordem Todos, Alunos, Administradores", () => {
		expect(NOTICE_AUDIENCE_OPTIONS.map((option) => option.value)).toEqual([
			"ALL",
			"MEMBERS",
			"ADMINS",
		])
		expect(NOTICE_AUDIENCE_OPTIONS.map((option) => option.label)).toEqual([
			"Todos",
			"Alunos",
			"Administradores",
		])
	})

	test("cada opção descreve o grupo que alcança", () => {
		expect(NOTICE_AUDIENCE_OPTIONS.map((option) => option.description)).toEqual(
			[
				"Alunos e administradores ativos",
				"Somente alunos ativos",
				"Somente administradores ativos",
			],
		)
	})

	test.each([
		["ALL", "Todos"],
		["MEMBERS", "Alunos"],
		["ADMINS", "Administradores"],
	] as const)("noticeAudienceLabel(%s) devolve %s", (audience, label) => {
		expect(noticeAudienceLabel(audience)).toBe(label)
	})
})
```

- **Step 4: Write the failing test (hook e formulário)**

Substituir o conteúdo de `apps/frontend/src/features/notices/api/use-broadcast-notice.test.tsx`:

```tsx
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
	test("envia título, mensagem e público e devolve o número de destinatários (handler padrão)", async () => {
		const { result } = renderHook(() => useBroadcastNotice(), {
			wrapper: wrapper(makeQueryClient()),
		})

		await act(async () => {
			await result.current.mutateAsync({
				title: "Manutenção",
				message: "Sistema fora do ar às 22h.",
				audience: "ALL",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({ recipients: 3 })
	})

	test("envia o corpo { title, message, audience } para POST /api/v1/notifications/broadcast", async () => {
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
			await result.current.mutateAsync({
				title: "Aviso",
				message: "Mensagem",
				audience: "MEMBERS",
			})
		})

		expect(receivedBody).toEqual({
			title: "Aviso",
			message: "Mensagem",
			audience: "MEMBERS",
		})
		await waitFor(() => expect(result.current.data).toEqual({ recipients: 1 }))
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
				result.current.mutateAsync({
					title: "Aviso",
					message: "Mensagem",
					audience: "ALL",
				}),
			).rejects.toBeInstanceOf(ApiError)
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.status).toBe(500)
	})
})
```

Em `apps/frontend/src/features/notices/components/notice-form.test.tsx`, no teste `sucesso: envia o corpo, mostra o toast com o total e limpa o formulário`, trocar a asserção do corpo por:

```ts
		expect(receivedBody).toEqual({
			title: "Manutenção programada",
			message: "O sistema ficará fora do ar às 22h.",
			audience: "ALL",
		})
```

- **Step 5: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/schemas/notice-schema.test.ts src/features/notices/notice-audience-options.test.ts src/features/notices/api/use-broadcast-notice.test.tsx src/features/notices/components/notice-form.test.tsx`
Expected: FAIL. No schema: `recusa público ...` (5 casos) e `recusa envio sem público` falham com `expected true to be false` (o schema atual descarta o campo desconhecido), e `aplica trim` falha porque o resultado não traz `audience`. `notice-audience-options.test.ts` falha com `Failed to resolve import "./notice-audience-options"`. No formulário, o caso `sucesso` falha porque o corpo enviado ainda não traz `audience`. O teste do hook passa: o hook já repassa o objeto inteiro como body e o vitest não checa tipos; ele fixa que o público chega ao servidor.

- **Step 6: Write minimal implementation**

Substituir `apps/frontend/src/features/notices/schemas/notice-schema.ts`:

```ts
import { z } from "zod"

export const NOTICE_TITLE_MAX = 100
export const NOTICE_MESSAGE_MAX = 500

export const noticeAudienceSchema = z.enum(["ALL", "MEMBERS", "ADMINS"])

export type NoticeAudience = z.infer<typeof noticeAudienceSchema>

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
	audience: noticeAudienceSchema,
})

export type NoticeInput = z.infer<typeof noticeSchema>
```

Criar `apps/frontend/src/features/notices/notice-audience-options.ts`:

```ts
import type { NoticeAudience } from "@/features/notices/schemas/notice-schema"

export interface NoticeAudienceOption {
	value: NoticeAudience
	label: string
	description: string
}

export const NOTICE_AUDIENCE_OPTIONS: ReadonlyArray<NoticeAudienceOption> = [
	{
		value: "ALL",
		label: "Todos",
		description: "Alunos e administradores ativos",
	},
	{
		value: "MEMBERS",
		label: "Alunos",
		description: "Somente alunos ativos",
	},
	{
		value: "ADMINS",
		label: "Administradores",
		description: "Somente administradores ativos",
	},
]

export function noticeAudienceLabel(audience: NoticeAudience): string {
	const option = NOTICE_AUDIENCE_OPTIONS.find(
		(candidate) => candidate.value === audience,
	)
	if (!option) {
		throw new Error(`Público de aviso desconhecido: ${audience}`)
	}
	return option.label
}
```

Em `apps/frontend/src/features/notices/components/notice-form.tsx`, trocar apenas a constante:

```ts
const EMPTY_NOTICE: NoticeInput = { title: "", message: "", audience: "ALL" }
```

- **Step 7: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/schemas/notice-schema.test.ts src/features/notices/notice-audience-options.test.ts src/features/notices/api/use-broadcast-notice.test.tsx src/features/notices/components/notice-form.test.tsx`
Expected: PASS (4 arquivos; schema 12 testes anteriores + 3 + 5 + 1 = 21; opções 5; hook 3; formulário os testes existentes).

- **Step 8: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add packages/api-types/index.d.ts apps/frontend/src/features/notices/schemas/notice-schema.ts apps/frontend/src/features/notices/schemas/notice-schema.test.ts apps/frontend/src/features/notices/notice-audience-options.ts apps/frontend/src/features/notices/notice-audience-options.test.ts apps/frontend/src/features/notices/api/use-broadcast-notice.test.tsx apps/frontend/src/features/notices/components/notice-form.tsx apps/frontend/src/features/notices/components/notice-form.test.tsx
git commit -m "feat(notice-audience): tipos, schema e hook do frontend enviam o publico"
```

## Critérios de Sucesso

- `packages/api-types/index.d.ts` traz `audience` no `requestBody` do broadcast, gerado por `pnpm generate:types`.
- `noticeSchema` aceita `ALL`, `MEMBERS` e `ADMINS` e recusa qualquer outro valor, inclusive `null`, `""`, minúsculas e ausência (FR-005: o público faz parte do envio).
- `NOTICE_AUDIENCE_OPTIONS` expõe "Todos", "Alunos" e "Administradores" com suas descrições.
- `useBroadcastNotice` envia `audience` no corpo do `POST /api/v1/notifications/broadcast`.
- O formulário, ainda sem seletor, envia o padrão `audience: "ALL"` (FR-002).
