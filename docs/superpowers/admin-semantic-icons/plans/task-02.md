# Task 2: Mapeamento centralizado de ícones (status-icon.ts)

**Status:** PENDING
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Criar `status-icon.ts` como fonte única de mapeamento status→ícone e ação→ícone, usando `lucide-react`. É a decisão arquitetural D2 da spec ("Consistência" — Restrição Técnica de Alto Nível do PRD, não um FR numerado). Os nomes de export (`STATUS_ICON`, `ACTION_ICON`) e os tipos (`StatusIconTone`, `ActionIconName`) são o contrato consumido pelas tasks 4, 6, 7 e 8 — preservá-los literalmente.

## Arquivos

- Create: `apps/frontend/src/components/ui/status-icon.ts`
- Test: `apps/frontend/src/components/ui/status-icon.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: `Record<K, V>` mapeado sobre union de string literals, `LucideIcon` como tipo de componente.
- `no-workarounds`: o ponto desta task é justamente eliminar duplicação de literais de ícone entre componentes — resistir a atalhos que reintroduzam mapeamento local em outro arquivo.

## Passos

- **Step 1: Write the failing test**

```typescript
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react"
import { describe, expect, test } from "vitest"
import { ACTION_ICON, STATUS_ICON } from "./status-icon"

describe("STATUS_ICON", () => {
	test("mapeia cada tom de status ao ícone lucide correspondente", () => {
		expect(STATUS_ICON.success).toBe(CircleCheck)
		expect(STATUS_ICON.warning).toBe(TriangleAlert)
		expect(STATUS_ICON.danger).toBe(CircleSlash)
	})
})

describe("ACTION_ICON", () => {
	test("mapeia cada ação ao ícone lucide correspondente", () => {
		expect(ACTION_ICON.edit).toBe(Pencil)
		expect(ACTION_ICON.moreActions).toBe(MoreHorizontal)
		expect(ACTION_ICON.approve).toBe(Check)
		expect(ACTION_ICON.reject).toBe(X)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/status-icon.test.ts`
Expected: FAIL — `Failed to resolve import "./status-icon"` (arquivo `status-icon.ts` ainda não existe).

- **Step 3: Write minimal implementation**

```typescript
import {
	Check,
	CircleCheck,
	CircleSlash,
	MoreHorizontal,
	Pencil,
	TriangleAlert,
	X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type StatusIconTone = "success" | "warning" | "danger"

export const STATUS_ICON: Record<StatusIconTone, LucideIcon> = {
	success: CircleCheck,
	warning: TriangleAlert,
	danger: CircleSlash,
}

export type ActionIconName = "edit" | "moreActions" | "approve" | "reject"

export const ACTION_ICON: Record<ActionIconName, LucideIcon> = {
	edit: Pencil,
	moreActions: MoreHorizontal,
	approve: Check,
	reject: X,
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/status-icon.test.ts`
Expected: PASS (2 testes)

- **Step 5: Commit** *(sequencial — esta task roda sozinha na Wave 1 junto da task 1, mas em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos criados/alterados.)*

```bash
git add apps/frontend/src/components/ui/status-icon.ts apps/frontend/src/components/ui/status-icon.test.ts
git commit -m "feat: adiciona mapeamento centralizado status/ação para ícone"
```

## Critérios de Sucesso

- `STATUS_ICON` e `ACTION_ICON` são exportados nomeadamente de `apps/frontend/src/components/ui/status-icon.ts`, com os tipos `StatusIconTone` e `ActionIconName`.
- Nenhum outro arquivo do projeto duplica literais de ícone lucide para status/ação (esses mapas são a fonte única).
- Os nomes de export permanecem exatamente `STATUS_ICON`, `ACTION_ICON`, `StatusIconTone`, `ActionIconName` para consumo pelas tasks 4, 6, 7 e 8.
