# Task 15: Mutations `useUpdateGym` + `useSetGymImage` [FR-006, FR-007]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-11

## Visão Geral

Adiciona os hooks de mutação para atualizar dados cadastrais (`useUpdateGym` via `PUT /gyms/:id` tipado — FR-006) e para enviar/trocar a imagem (`useSetGymImage` via `POST /gyms/:id/image` com `FormData` — FR-007). A mutation de imagem usa `fetch` cru com o token do `auth-store` (endpoint multipart não tipado), invalidando o cache de academias no sucesso.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/api/index.ts`
- Test: `apps/frontend/src/features/gyms/api/index.test.tsx`

### Conformidade com as Skills Padrão

- use tanstack-query-best-practices: mutations com invalidação de `gymsKeys.all` no sucesso.
- use test-antipatterns: testes com MSW (sem mock manual de fetch), cobrindo sucesso.

## Passos

- **Step 1: Escrever os testes que falham**

Adicione ao final de `apps/frontend/src/features/gyms/api/index.test.tsx`:

```tsx
import { useSetGymImage, useUpdateGym } from "./index"

const validUpdateInput = {
	title: "Academia Editada",
	cnpj: "11222333000181",
	description: "",
	phone: "",
	location: { address: "Rua B, 2", latitude: -23.5, longitude: -46.6 },
}

describe("useUpdateGym", () => {
	it("atualiza a academia via PUT e retorna o id", async () => {
		server.use(
			http.put(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json({ message: "Gym updated", id: "gym-1" }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useUpdateGym(), { wrapper: Wrapper })
		result.current.mutate({ id: "gym-1", input: validUpdateInput })
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.id).toBe("gym-1")
	})
})

describe("useSetGymImage", () => {
	it("envia a imagem via POST e retorna imageKey + url", async () => {
		server.use(
			http.post(`${apiBaseUrl}/gyms/:id/image`, () =>
				HttpResponse.json({
					imageKey: "gyms/x.webp",
					url: "/uploads/gyms/x.webp",
				}),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useSetGymImage(), { wrapper: Wrapper })
		result.current.mutate({
			id: "gym-1",
			file: new Blob(["webp"], { type: "image/webp" }),
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.imageKey).toBe("gyms/x.webp")
	})
})
```

> O topo do arquivo já importa `server`, `http`, `HttpResponse`, `renderHook`, `waitFor`, `makeWrapper` e `apiBaseUrl`. Reutilize-os.

- **Step 2: Rodar os testes e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "useUpdateGym"`
Expected: FAIL — `useUpdateGym`/`useSetGymImage` não exportados.

- **Step 3: Implementar as mutations**

Em `apps/frontend/src/features/gyms/api/index.ts`:

1. Garanta os imports no topo (adicione os que faltarem):

```typescript
import { API_BASE_URL } from "@/lib/api"
import { useAuthStore } from "@/lib/auth/auth-store"
```

2. Adicione os tipos e as funções de request + hooks (ao final do arquivo):

```typescript
export interface UpdateGymVariables {
	id: string
	input: CreateGymInput
}

async function updateGymRequest({
	id,
	input,
}: UpdateGymVariables): Promise<CreateGymResult> {
	const client = getGymsExtendedClient()
	const { data, error } = await client.PUT("/gyms/{id}", {
		params: { path: { id } },
		body: buildCreateGymBody(input),
	})
	if (error || !data) throw toApiError(error)
	return { id: data.id }
}

export function useUpdateGym(): UseMutationResult<
	CreateGymResult,
	ApiError,
	UpdateGymVariables
> {
	const queryClient = useQueryClient()
	return useMutation<CreateGymResult, ApiError, UpdateGymVariables>({
		mutationFn: updateGymRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}

export interface SetGymImageVariables {
	id: string
	file: Blob
}

export interface SetGymImageResult {
	imageKey: string
	url: string
}

async function setGymImageRequest({
	id,
	file,
}: SetGymImageVariables): Promise<SetGymImageResult> {
	const form = new FormData()
	form.append("image", file, "gym-image.webp")
	const token = useAuthStore.getState().accessToken
	const response = await fetch(`${API_BASE_URL}/gyms/${id}/image`, {
		method: "POST",
		body: form,
		credentials: "include",
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	})
	if (!response.ok) {
		throw ApiError.fromStatus(response.status, "image_upload_failed")
	}
	return (await response.json()) as SetGymImageResult
}

export function useSetGymImage(): UseMutationResult<
	SetGymImageResult,
	ApiError,
	SetGymImageVariables
> {
	const queryClient = useQueryClient()
	return useMutation<SetGymImageResult, ApiError, SetGymImageVariables>({
		mutationFn: setGymImageRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}
```

> `buildCreateGymBody` e `getGymsExtendedClient` já existem no arquivo; `ApiError`/`toApiError` também. `ApiError.fromStatus(status, code)` é o mesmo helper usado em `lib/api.ts`.

- **Step 4: Rodar os testes e confirmar o sucesso**

Run: `pnpm --filter frontend test -- -t "useUpdateGym"`
Run: `pnpm --filter frontend test -- -t "useSetGymImage"`
Expected: PASS.

- **Step 5: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add apps/frontend/src/features/gyms/api/index.ts apps/frontend/src/features/gyms/api/index.test.tsx
git commit -m "feat(gyms): add useUpdateGym + useSetGymImage mutations"
```

## Critérios de Sucesso

- `useUpdateGym` faz `PUT /gyms/:id` e invalida o cache. [FR-006]
- `useSetGymImage` faz `POST /gyms/:id/image` (FormData + token) e retorna `{ imageKey, url }`. [FR-007]
- Testes, `tsc:check` e `lint:fix` sem problemas.
