# Task 11: Frontend — `imageKey` em `GymSummary` + path `PUT` + helper de URL [FR-013, FR-014]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** N/A

## Visão Geral

Prepara o contrato local do frontend (via `extended-paths`) para a imagem: adiciona `imageKey` ao tipo `GymSummary` (FR-013, FR-014), o path tipado `PUT /gyms/{id}` (consumido pela mutation de edição) e um helper `gymImageUrl` que monta a URL pública a partir da `imageKey`. Mantém o frontend independente da regeneração de tipos do backend.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts`
- Create: `apps/frontend/src/features/gyms/lib/gym-image-url.ts`
- Test: `apps/frontend/src/features/gyms/lib/gym-image-url.test.ts`

### Conformidade com as Skills Padrão

- use zod: não aplicável aqui (apenas tipos TS + helper puro).
- use test-antipatterns: teste do helper cobre casos de borda (null/undefined/vazio).

## Passos

- **Step 1: Adicionar `imageKey` ao `GymSummary` e o path `PUT`**

Em `apps/frontend/src/features/gyms/api/extended-paths.ts`:

1. Adicione `imageKey` à interface `GymSummary`:

```typescript
export interface GymSummary {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	cnpj?: string
	latitude: number
	longitude: number
}
```

> `cnpj` é opcional porque só o endpoint de detalhe (`GET /gyms/:gymId`) o retorna; listagem e busca não. A tela de edição (task-17) usa o detalhe, então `cnpj` estará presente lá.

2. Adicione o body de atualização e o método `put` ao path `/gyms/{id}` em `GymExtendedPaths`:

```typescript
export interface GymUpdateBody {
	cnpj: string
	title: string
	description?: string
	phone?: string
	latitude: number
	longitude: number
	address: string
}

export interface GymExtendedPaths {
	"/gyms": {
		get: {
			parameters: { query?: { page?: number } }
			responses: {
				200: { content: { "application/json": GymSummary[] } }
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
}
```

- **Step 2: Escrever o teste que falha do helper de URL**

Crie `apps/frontend/src/features/gyms/lib/gym-image-url.test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import { API_BASE_URL } from "@/lib/api"
import { gymImageUrl } from "./gym-image-url"

describe("gymImageUrl", () => {
	test("retorna null quando imageKey é null/undefined/vazio", () => {
		expect(gymImageUrl(null)).toBeNull()
		expect(gymImageUrl(undefined)).toBeNull()
		expect(gymImageUrl("")).toBeNull()
	})

	test("monta a URL pública a partir da imageKey", () => {
		expect(gymImageUrl("gyms/abc.webp")).toBe(
			`${API_BASE_URL}/uploads/gyms/abc.webp`,
		)
	})
})
```

- **Step 3: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "gymImageUrl"`
Expected: FAIL — módulo `./gym-image-url` não existe.

- **Step 4: Implementar o helper**

Crie `apps/frontend/src/features/gyms/lib/gym-image-url.ts`:

```typescript
import { API_BASE_URL } from "@/lib/api"

/**
 * Monta a URL pública da imagem da academia a partir da chave relativa.
 * Retorna null quando não há imagem.
 */
export function gymImageUrl(
	imageKey: string | null | undefined,
): string | null {
	if (!imageKey) return null
	return `${API_BASE_URL}/uploads/${imageKey}`
}
```

- **Step 5: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter frontend test -- -t "gymImageUrl"`
Expected: PASS (2 testes).

- **Step 6: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add apps/frontend/src/features/gyms/api/extended-paths.ts apps/frontend/src/features/gyms/lib/gym-image-url.ts apps/frontend/src/features/gyms/lib/gym-image-url.test.ts
git commit -m "feat(gyms): add imageKey to GymSummary + PUT path + image URL helper"
```

## Critérios de Sucesso

- `GymSummary.imageKey` existe; path `PUT /gyms/{id}` tipado no client estendido. [FR-013, FR-014]
- `gymImageUrl` monta a URL e trata ausência (null). Testes, `tsc:check` e `lint:fix` sem problemas.
