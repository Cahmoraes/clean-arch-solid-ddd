# Task 17: `useDeactivateGym`/`useActivateGym` (frontend) [FR-001, FR-002]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-11, task-12

## Visão Geral

Cria os hooks `useDeactivateGym`/`useActivateGym`, mirror de `useUpdateGym`
(`apps/frontend/src/features/gyms/api/index.ts`), que chamam
`PATCH /gyms/{id}/deactivate` e `PATCH /gyms/{id}/activate` (Tasks 11/12) e invalidam o cache
do TanStack Query para que listagem, busca e detalhe reflitam o novo `status` imediatamente.

Os endpoints `PATCH /gyms/{id}/deactivate` e `PATCH /gyms/{id}/activate` ainda não existem no
pacote gerado `@repo/api-types` (localizado em `packages/api-types`, gerado a partir do
contrato OpenAPI do backend) — regenerar esse contrato está fora do escopo desta feature
(mesma decisão já aplicada nas Tasks 11-15, que não usam `toSatisfyApiSpec()` nos testes de
controller). Por isso, assim como `GET /gyms`, `GET /gyms/{id}` e `PUT /gyms/{id}` já fazem, os
dois novos endpoints são declarados em `GymExtendedPaths`
(`apps/frontend/src/features/gyms/api/extended-paths.ts`) e consumidos via
`getGymsExtendedClient()` — não via `client.PATCH` do `openapi-fetch` `Client<paths>` padrão
(esse não tem o path tipado).

## Arquivos

- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts`
- Modify: `apps/frontend/src/features/gyms/api/index.ts`
- Test: `apps/frontend/src/features/gyms/api/index.test.tsx`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipagem completa dos dois novos paths em `GymExtendedPaths`
  (parâmetros de rota + shape de resposta), sem `any`.
- `tanstack-query` (se disponível no repo; caso não exista skill nomeada correspondente,
  aplicar a categoria mínima — `useMutation` + `queryClient.invalidateQueries` no padrão já
  usado por `useUpdateGym`/`useCreateGym`): `onSuccess` invalida `gymsKeys.all`, cobrindo
  listagem, busca e detalhe de uma só vez.
- `vitest`: suíte de teste de hook usando `renderHook` de `@testing-library/react` +
  interceptação HTTP via MSW (`http.patch`/`HttpResponse.json` sobre `server` de
  `@/test/msw/server`), seguindo o padrão real já usado por `useCreateGym`/`useUpdateGym` no
  mesmo arquivo `index.test.tsx`.
- `no-workarounds`: propagar o erro da API via `toApiError` já existente no arquivo, sem
  engolir falhas de rede/HTTP silenciosamente.

## Passos

- **Step 1: Escrever o teste que falha**

`apps/frontend/src/features/gyms/api/index.test.tsx` já testa `useCreateGym`/`useUpdateGym`/
`useSetGymImage` com MSW (`http.post`/`http.put` interceptando `${apiBaseUrl}/gyms/...`) em
vez de mockar o client diretamente — este teste segue o mesmo padrão real, usando
`http.patch`. Adicionar ao final do arquivo, reaproveitando `makeWrapper()` já definido nele:

```typescript
describe("useDeactivateGym", () => {
	it("desativa a academia via PATCH e retorna a mensagem", async () => {
		server.use(
			http.patch(`${apiBaseUrl}/gyms/:id/deactivate`, () =>
				HttpResponse.json({ message: "Gym deactivated" }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useDeactivateGym(), { wrapper: Wrapper })
		result.current.mutate("gym-1")
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.message).toBe("Gym deactivated")
	})

	it("propaga ApiError quando backend retorna 409", async () => {
		server.use(
			http.patch(`${apiBaseUrl}/gyms/:id/deactivate`, () =>
				HttpResponse.json({ message: "Gym already deactivated" }, { status: 409 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useDeactivateGym(), { wrapper: Wrapper })
		await expect(result.current.mutateAsync("gym-1")).rejects.toMatchObject({
			status: 409,
		})
	})
})

describe("useActivateGym", () => {
	it("reativa a academia via PATCH e retorna a mensagem", async () => {
		server.use(
			http.patch(`${apiBaseUrl}/gyms/:id/activate`, () =>
				HttpResponse.json({ message: "Gym activated" }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useActivateGym(), { wrapper: Wrapper })
		result.current.mutate("gym-1")
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.message).toBe("Gym activated")
	})
})
```

Adicionar `useDeactivateGym`, `useActivateGym` ao import já existente de `"./index"` no topo
do arquivo de teste (junto de `useAllGyms`, `useCreateGym`, etc.).

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test:run -- gyms/api/index`
Expected: FAIL — `useDeactivateGym`/`useActivateGym` ainda não existem, e
`GymExtendedPaths` ainda não declara `/gyms/{id}/deactivate`/`/gyms/{id}/activate`.

- **Step 3: Implementação mínima**

`extended-paths.ts` — adicionar os dois novos paths ao final da interface
`GymExtendedPaths` já existente:
```typescript
export interface GymStatusChangeResult {
	message: string
}

export interface GymExtendedPaths {
	"/gyms": {
		get: {
			parameters: { query?: { page?: number } }
			responses: {
				200: {
					content: {
						"application/json": {
							gyms: GymSummary[]
							pagination: {
								total: number
								page: number
								limit: number
							}
						}
					}
				}
			}
		}
	}
	"/gyms/{id}": {
		get: {
			parameters: { path: { id: string } }
			responses: {
				200: { content: { "application/json": GymSummary } }
			}
		}
		put: {
			parameters: { path: { id: string } }
			requestBody: { content: { "application/json": GymUpdateBody } }
			responses: {
				200: {
					content: { "application/json": { message: string; id: string } }
				}
			}
		}
	}
	"/gyms/{id}/deactivate": {
		patch: {
			parameters: { path: { id: string } }
			responses: {
				200: { content: { "application/json": GymStatusChangeResult } }
			}
		}
	}
	"/gyms/{id}/activate": {
		patch: {
			parameters: { path: { id: string } }
			responses: {
				200: { content: { "application/json": GymStatusChangeResult } }
			}
		}
	}
}
```

`index.ts` — adicionar as duas mutation functions e os dois hooks, seguindo o padrão de
`useUpdateGym`:
```typescript
async function deactivateGymRequest(id: string): Promise<GymStatusChangeResult> {
	const client = getGymsExtendedClient()
	const { data, error } = await client.PATCH("/gyms/{id}/deactivate", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useDeactivateGym(): UseMutationResult<
	GymStatusChangeResult,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<GymStatusChangeResult, ApiError, string>({
		mutationFn: deactivateGymRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}

async function activateGymRequest(id: string): Promise<GymStatusChangeResult> {
	const client = getGymsExtendedClient()
	const { data, error } = await client.PATCH("/gyms/{id}/activate", {
		params: { path: { id } },
	})
	if (error || !data) throw toApiError(error)
	return data
}

export function useActivateGym(): UseMutationResult<
	GymStatusChangeResult,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<GymStatusChangeResult, ApiError, string>({
		mutationFn: activateGymRequest,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: gymsKeys.all })
		},
	})
}
```

Também adicionar `GymStatusChangeResult` ao import de `"./extended-paths"` no topo de
`index.ts`, junto de `GymSummary`/`getGymsExtendedClient`/`PaginatedGyms` já importados.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test:run -- gyms/api/index`
Expected: PASS — os 2 novos casos e todos os já existentes no arquivo passam.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/api/extended-paths.ts \
  apps/frontend/src/features/gyms/api/index.ts \
  apps/frontend/src/features/gyms/api/index.test.tsx
git commit -m "feat(gym): add useDeactivateGym/useActivateGym hooks"
```

## Critérios de Sucesso

- `useDeactivateGym().mutateAsync(gymId)` chama `PATCH /gyms/{id}/deactivate` via
  `getGymsExtendedClient()` e, em caso de sucesso, invalida `gymsKeys.all` (FR-001).
- `useActivateGym().mutateAsync(gymId)` chama `PATCH /gyms/{id}/activate` via
  `getGymsExtendedClient()` e, em caso de sucesso, invalida `gymsKeys.all` (FR-002).
- Ambos os hooks propagam erros de API como `ApiError` via `toApiError`, sem engolir falhas.
- `GymExtendedPaths` tipa os dois novos paths com `parameters.path.id: string` e resposta
  `200` com `{ message: string }`.
- `pnpm --filter frontend test:run -- gyms/api/index` passa sem regressão nos casos já
  existentes no arquivo.
