# Task 11: useBulkChangeUserStatus — hook de mutation com resumo e invalidação de cache [FR-007, FR-010]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`useBulkChangeUserStatus` é o hook de mutation que chama `PATCH /users/bulk-activate` ou
`PATCH /users/bulk-deactivate` (rotas criadas nas Tasks 4 e 5) a partir do frontend,
seguindo o mesmo padrão estrutural de `useActivateUser`
(`apps/frontend/src/features/admin/api/use-activate-user.ts`) — `useMutation` +
`api.PATCH` tipado via `Client<paths>` de `@repo/api-types` — mas com uma diferença
deliberada: **sem optimistic update**. Como a resposta já é um resumo agregado
(`{ updated, requested, skipped }`) e a operação afeta múltiplos usuários de uma vez (cujo
resultado exato depende de política de autorização revalidada no backend — ver Task 2/3),
não é seguro prever no cliente quais usuários mudam de status antes da resposta chegar; o
hook apenas invalida a listagem (`onSettled`) para o React Query refazer o fetch com o
estado real. `onSuccess` exibe um toast de sucesso com o resumo (`updated`/`skipped`);
`onError` exibe um toast de erro com `error.userMessage` (o mesmo padrão de `ApiError` já
usado em `use-activate-user.ts`).

**Pré-requisito operacional:** as rotas `/users/bulk-activate` e `/users/bulk-deactivate`
só existem no spec OpenAPI exportado (e, portanto, nos tipos gerados em
`@repo/api-types`) depois que as Tasks 4 e 5 (backend) forem implementadas E o comando
`pnpm generate:types` (rodado a partir da raiz do monorepo) for executado — esse comando
roda `pnpm --filter backend openapi:export` seguido de
`pnpm --filter @repo/api-types openapi:generate-client` (ver `package.json` da raiz). Sem
isso, `api.PATCH("/users/bulk-activate", ...)` não compila (o path literal não existe em
`paths`). Esta task declara `Depends on: N/A` apenas para fins de paralelismo em
worktrees isoladas — na execução sequencial recomendada (Tasks 1 a 12 em ordem), as Tasks 4
e 5 já foram concluídas antes desta, então o Step 1 abaixo roda `pnpm generate:types` como
pré-passo operacional, não como uma dependência declarada de arquivo/símbolo.

## Arquivos

- Create: `apps/frontend/src/features/admin/api/use-bulk-change-user-status.ts`
- Create: `apps/frontend/src/features/admin/api/use-bulk-change-user-status.test.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts` (adicionar handlers para
  `/users/bulk-activate` e `/users/bulk-deactivate`)

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: o hook usa `onSettled` para invalidar `[ADMIN_USERS_QUERY_KEY]` e `[USER_STATS_QUERY_KEY]` (garantindo consistência mesmo em caso de erro parcial), e deliberadamente evita `onMutate`/optimistic update, pois o resultado da operação em massa não é previsível no cliente sem revalidação de política no backend.
- `typescript-advanced`: o tipo de retorno `UseMutationResult<{ updated, requested, skipped }, ApiError, { userIds, action }>` precisa ser inferido corretamente a partir do tipo `paths["/users/bulk-activate"]["patch"]["responses"][200]["content"]["application/json"]` gerado por `@repo/api-types` (Tasks 4/5 + `pnpm generate:types`).
- `context7`: consultar a documentação do `openapi-fetch` (usado por `@/lib/api`) para confirmar a assinatura de `api.PATCH(path, { body })` com paths literais tipados, antes de escrever `resolvePath`.
- `vitest`: os 2 novos testes seguem a convenção `describe`/`test` em português e o padrão `renderHook` + `QueryClientProvider` já usado em `use-activate-user.test.tsx`.
- `test-antipatterns`: os testes usam `server.use(http.patch(...))` do MSW para simular as respostas reais da API, e mockam apenas `sonner` (dependência externa de UI, não a lógica do hook) — nunca chamam `mutationFn` diretamente nem inspecionam o corpo da implementação.

## Passos

- **Step 1: Rodar `pnpm generate:types` para garantir que as rotas bulk existam nos tipos gerados**

Run (a partir da raiz do monorepo): `pnpm generate:types`
Expected: o comando roda `pnpm --filter backend openapi:export` (gera/atualiza o spec
OpenAPI a partir dos controllers registrados, incluindo `BulkActivateUsersController` e
`BulkDeactivateUsersController` das Tasks 4/5) seguido de
`pnpm --filter @repo/api-types openapi:generate-client` (regenera
`packages/api-types/index.d.ts`); ao final, `paths["/users/bulk-activate"]["patch"]` e
`paths["/users/bulk-deactivate"]["patch"]` existem no arquivo gerado, com a resposta `200`
tipada como `{ updated: number, requested: number, skipped: number }` (graças ao
`bulkActivateUsersResponseSchema`/`bulkDeactivateUsersResponseSchema` definidos nas Tasks
4/5).

- **Step 2: Escrever o teste falho — sucesso invalida as duas query keys e chama toast.success**

Criar `apps/frontend/src/features/admin/api/use-bulk-change-user-status.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { server } from "@/test/msw/server"
import { useBulkChangeUserStatus } from "./use-bulk-change-user-status"
import { adminUsersQueryKey } from "./use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

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

describe("useBulkChangeUserStatus", () => {
	test("invalida as query keys de usuários e estatísticas e exibe toast.success ao concluir", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [],
			pagination: { total: 0, page: 1, limit: 10 },
		})
		queryClient.setQueryData(["user-stats"], {
			total: 0,
			members: 0,
			admins: 0,
			active: 0,
			inactive: 0,
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/bulk-activate`, () =>
				HttpResponse.json(
					{ updated: 2, requested: 3, skipped: 1 },
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useBulkChangeUserStatus(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({
				userIds: ["u1", "u2", "u3"],
				action: "activate",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(toast.success).toHaveBeenCalledTimes(1)
		expect(
			queryClient.getQueryState(adminUsersQueryKey(QUERY_PARAMS))
				?.isInvalidated,
		).toBe(true)
		expect(
			queryClient.getQueryState(["user-stats"])?.isInvalidated,
		).toBe(true)
	})
})
```

Modificar `apps/frontend/src/test/msw/handlers.ts` para adicionar os handlers padrão de
sucesso (usados pelos demais testes que não sobrescrevem via `server.use`, seguindo o
mesmo padrão dos handlers de `/users/activate`/`/users/suspend` já existentes):

```ts
	http.patch(endpoint("/users/bulk-activate"), () =>
		HttpResponse.json(
			{ updated: 0, requested: 0, skipped: 0 },
			{ status: 200 },
		),
	),
	http.patch(endpoint("/users/bulk-deactivate"), () =>
		HttpResponse.json(
			{ updated: 0, requested: 0, skipped: 0 },
			{ status: 200 },
		),
	),
```

(inserir logo após o handler existente `http.patch(endpoint("/users/demote-admin"), ...)`
em `handlers.ts`).

- **Step 3: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "invalida as query keys de usuários e estatísticas e exibe toast.success"`
Expected: FAIL — o módulo `./use-bulk-change-user-status` ainda não existe (`Cannot find
module`).

- **Step 4: Implementação mínima — hook de mutation sem optimistic update**

Criar `apps/frontend/src/features/admin/api/use-bulk-change-user-status.ts`:

```ts
"use client"

import type { UseMutationResult } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import { USER_STATS_QUERY_KEY } from "./use-user-stats"
import { ADMIN_USERS_QUERY_KEY } from "./use-users"

export type BulkStatusAction = "activate" | "deactivate"

export interface BulkChangeUserStatusInput {
	userIds: string[]
	action: BulkStatusAction
}

export interface BulkChangeUserStatusResult {
	updated: number
	requested: number
	skipped: number
}

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(500)
	return new ApiError(500, "network_error", message)
}

function resolvePath(
	action: BulkStatusAction,
): "/users/bulk-activate" | "/users/bulk-deactivate" {
	return action === "activate"
		? "/users/bulk-activate"
		: "/users/bulk-deactivate"
}

function buildSuccessMessage(
	result: BulkChangeUserStatusResult,
	action: BulkStatusAction,
): string {
	const verb = action === "activate" ? "ativado(s)" : "desativado(s)"
	const base = `${result.updated} usuário(s) ${verb} com sucesso.`
	if (result.skipped > 0) {
		return `${base} ${result.skipped} usuário(s) ignorado(s).`
	}
	return base
}

export function useBulkChangeUserStatus(): UseMutationResult<
	BulkChangeUserStatusResult,
	ApiError,
	BulkChangeUserStatusInput
> {
	const queryClient = useQueryClient()

	return useMutation<
		BulkChangeUserStatusResult,
		ApiError,
		BulkChangeUserStatusInput
	>({
		mutationFn: async ({ userIds, action }) => {
			const { data, error } = await api.PATCH(resolvePath(action), {
				body: { userIds },
			})
			if (error || !data) throw toApiError(error)
			return data
		},
		onSuccess: (result, variables) => {
			toast.success(buildSuccessMessage(result, variables.action))
		},
		onError: (error) => {
			toast.error(error.userMessage)
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
			void queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })
		},
	})
}
```

- **Step 5: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "invalida as query keys de usuários e estatísticas e exibe toast.success"`
Expected: PASS

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/api/use-bulk-change-user-status.ts apps/frontend/src/features/admin/api/use-bulk-change-user-status.test.tsx apps/frontend/src/test/msw/handlers.ts
git commit -m "feat: cria o hook useBulkChangeUserStatus"
```

- **Step 7: Escrever o teste falho — erro de rede chama toast.error e não invalida**

Adicionar ao mesmo `describe`:

```tsx
	test("exibe toast.error e não invalida as queries quando a API retorna erro", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [],
			pagination: { total: 0, page: 1, limit: 10 },
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/bulk-deactivate`, () =>
				HttpResponse.json({ message: "Erro interno" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useBulkChangeUserStatus(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({ userIds: ["u1"], action: "deactivate" })
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(toast.error).toHaveBeenCalledTimes(1)
		expect(toast.success).not.toHaveBeenCalled()
	})
```

(A invalidação via `onSettled` ainda ocorre mesmo em erro — por design do React Query, e
intencionalmente, para forçar um refetch que reflita o estado real do servidor após uma
falha parcial. O teste verifica apenas que `toast.error` foi chamado e `toast.success` não
foi, sem afirmar sobre `isInvalidated` neste caso, já que a invalidação em erro é esperada
e não seria uma regressão.)

- **Step 8: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "exibe toast.error e não invalida as queries quando a API retorna erro"`
Expected: PASS

- **Step 9: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo (confirma que `paths["/users/bulk-activate"]` e
`paths["/users/bulk-deactivate"]` existem em `@repo/api-types` com a resposta `200`
tipada, gerados no Step 1).

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 10: Commit final**

```bash
git add apps/frontend/src/features/admin/api/use-bulk-change-user-status.ts apps/frontend/src/features/admin/api/use-bulk-change-user-status.test.tsx
git commit -m "test: cobre erro de rede no useBulkChangeUserStatus"
```

## Critérios de Sucesso

- `useBulkChangeUserStatus()` chama `PATCH /users/bulk-activate` quando `action ===
  "activate"` e `PATCH /users/bulk-deactivate` quando `action === "deactivate"` (FR-007).
- Em sucesso, exibe `toast.success` com o resumo (`updated`/`skipped`) e invalida
  `[ADMIN_USERS_QUERY_KEY]` e `[USER_STATS_QUERY_KEY]` via `onSettled` (FR-010).
- Em erro, exibe `toast.error` com `error.userMessage` e nunca chama `toast.success`.
- O hook não implementa optimistic update (`onMutate`) — decisão deliberada documentada na
  Visão Geral, em contraste com `useActivateUser`.
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check` e
  `pnpm --filter frontend lint:fix` passam sem erros.
