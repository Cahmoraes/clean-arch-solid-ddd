# Task 11: Camada de API do frontend — extended-paths + hooks [RF-001, RF-013, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar `extended-paths.ts` para incluir `status` e `rejectedAt` na interface `CheckIn`, o endpoint `/check-ins/reject`, e `"rejected"` no filtro de status. Adicionar o hook `useRejectCheckIn` em `api/index.ts`.

**Depende de:** Task 8, Task 9 (backend estável)

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/api/extended-paths.ts`
- Modify: `apps/frontend/src/features/check-ins/api/index.ts`

## Passos

- [ ] **Step 1: Atualizar extended-paths.ts**

```typescript
// apps/frontend/src/features/check-ins/api/extended-paths.ts
import type { Client } from "openapi-fetch"
import { getApi } from "@/lib/api"

/**
 * Extended OpenAPI paths for `/check-ins` endpoints not yet present in
 * `@repo/api-types` (notably the GET list endpoint and the PATCH validate
 * verb adopted by the frontend contract). Once the spec is regenerated and
 * aligned, these can be removed and `api` can be used directly.
 */
export interface CheckIn {
	id: string
	gymId: string
	gymTitle?: string | null
	userId?: string
	validatedAt: string | null
	rejectedAt: string | null
	status: "pending" | "validated" | "rejected"
	createdAt: string
}

export interface PaginatedCheckIns {
	items: CheckIn[]
	page: number
	total: number
}

export interface CheckInsListQuery {
	page?: number
	status?: "pending" | "validated" | "rejected"
}

export interface CheckInExtendedPaths {
	"/check-ins": {
		get: {
			parameters: { query?: CheckInsListQuery }
			responses: {
				200: { content: { "application/json": PaginatedCheckIns } }
			}
		}
	}
	"/check-ins/validate": {
		patch: {
			requestBody: {
				content: { "application/json": { checkInId: string } }
			}
			responses: {
				200: {
					content: { "application/json": { checkInId: string } }
				}
			}
		}
	}
	"/check-ins/reject": {
		patch: {
			requestBody: {
				content: { "application/json": { checkInId: string } }
			}
			responses: {
				200: {
					content: { "application/json": { rejectedAt: string } }
				}
			}
		}
	}
}

export function getCheckInsExtendedClient(): Client<CheckInExtendedPaths> {
	return getApi() as unknown as Client<CheckInExtendedPaths>
}
```

- [ ] **Step 2: Adicionar useRejectCheckIn em api/index.ts**

Adicionar a função request e o hook após `useValidateCheckIn`. Também atualizar o tipo de `UseCheckInsParams.status`:

```typescript
// adicionar após useValidateCheckIn

async function rejectCheckInRequest(checkInId: string): Promise<string> {
	const client = getCheckInsExtendedClient()
	const { data, error } = await client.PATCH("/check-ins/reject", {
		body: { checkInId },
	})
	if (error || !data) throw toApiError(error)
	return data.rejectedAt
}

/**
 * Admin mutation to reject a pending or validated check-in. Invalidates all
 * check-in queries so the list refreshes automatically.
 */
export function useRejectCheckIn(): UseMutationResult<
	string,
	ApiError,
	string
> {
	const queryClient = useQueryClient()
	return useMutation<string, ApiError, string>({
		mutationFn: rejectCheckInRequest,
		retry: 0,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: checkInsKeys.all })
		},
	})
}
```

Além disso, atualizar a interface `UseCheckInsParams` para incluir `"rejected"`:

```typescript
export interface UseCheckInsParams {
	page: number
	status?: "pending" | "validated" | "rejected"
}
```

E atualizar a re-exportação no início do arquivo:

```typescript
export type { CheckIn, PaginatedCheckIns } from "./extended-paths"
```

(já existe, mas garante que `CheckIn` agora inclui os novos campos)

- [ ] **Step 3: Type-check do frontend**

```bash
pnpm --filter frontend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 4: Rodar testes do frontend**

```bash
pnpm --filter frontend test
```

Esperado: todos passam.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/check-ins/api/extended-paths.ts \
        apps/frontend/src/features/check-ins/api/index.ts
git commit -m "feat(frontend/check-ins): add rejectedAt, status fields and useRejectCheckIn hook
```

## Critérios de Sucesso

- `CheckIn.status: "pending" | "validated" | "rejected"` disponível
- `CheckIn.rejectedAt: string | null` disponível
- `CheckInsListQuery.status` aceita `"rejected"`
- `useRejectCheckIn()` faz `PATCH /check-ins/reject`
- `useCheckIns({ status: "rejected" })` funciona
- 0 erros de TypeScript no frontend
