# Task 4: StatusBadge — ícone semântico e vocabulário de academia [FR-003, FR-004]

**Status:** DONE
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Generalizar `StatusBadge` para renderizar um ícone semântico (via `STATUS_ICON` de `status-icon.ts`) ao lado do texto, em vez do dot atual (FR-003), e confirmar que o mesmo componente (`tone` + `children`, sem props novas de domínio) já aceita o vocabulário de academia (FR-004). FR-003 e FR-004 ficam juntos porque tocam o mesmo arquivo pequeno (~25 linhas) e o segundo reaproveita a extensão de ícone feita pelo primeiro.

**Correção incluída (achado da revisão de spec):** o mapeamento real de tom em `apps/frontend/src/features/admin/components/user-row.tsx` hoje resolve o status `"suspended"` ("Inativo") para `tone="neutral"` — um tom que `STATUS_ICON` não cobre (só `success`/`warning`/`danger`, task 2). Sem corrigir isso, a badge "Inativo" seria a única, em toda a tela de usuários, sem ícone semântico, violando o FR-003 e a decisão visual aprovada no mockup ("Inativo/Desativada → CircleSlash"). Esta task corrige `statusTone()` para retornar `"danger"` no caso `"suspended"`, alinhando com o ícone `CircleSlash` do mockup.

## Arquivos

- Modify: `apps/frontend/src/components/ui/status-badge.tsx`
- Create: `apps/frontend/src/components/ui/status-badge.test.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: badge/pill como componente reutilizável seguindo convenção de `components/ui/`.
- `tailwindcss`: classes de tom (`bg-success-soft text-success`, etc.) já existentes, mais a classe de tamanho do ícone.
- `typescript-advanced`: `Record<StatusTone, ...>` parcial (só 3 dos 4 tons mapeados) — tipar corretamente o acesso opcional a `STATUS_ICON[tone]` quando `tone === "neutral"`.
- `test-antipatterns`: testar presença simultânea de ícone+texto sem depender de detalhes de implementação do SVG do `lucide-react`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-semantic-icons-visual.md`
- **Fonte de design original:** nenhuma — layout definido via mockup do companion de brainstorming, aprovado interativamente pelo usuário.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** o ícone substitui o dot (`h-1.5 w-1.5 rounded-full bg-current`) mas o texto do rótulo nunca é removido — ícone e texto sempre juntos. Ícones por tom: `success` → `CircleCheck`, `warning` → `TriangleAlert`, `danger` → `CircleSlash` (via `STATUS_ICON`, task 2). `neutral` não faz parte do vocabulário desta feature e fica sem ícone dedicado (fallback sem ícone, mantendo compatibilidade com consumidores futuros fora de escopo). As classes de tom (`bg-success-soft text-success`, etc.) e o formato de pill (`rounded-full px-2.5 py-1 text-xs font-semibold`) não mudam.

## Passos

- **Step 1: Write the failing test (FR-003)**

```tsx
import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { StatusBadge } from "./status-badge"

describe("StatusBadge", () => {
	test("FR-003: renderiza o ícone semântico de status junto do texto", () => {
		render(<StatusBadge tone="success">Ativo</StatusBadge>)
		const badge = screen.getByText("Ativo").closest("span")
		expect(badge).not.toBeNull()
		expect(within(badge as HTMLElement).getByText("Ativo")).toBeInTheDocument()
		expect(
			(badge as HTMLElement).querySelector("svg"),
		).toBeInTheDocument()
	})

	test("FR-004: aceita vocabulário de academia com o mesmo par tone+children", () => {
		render(<StatusBadge tone="danger">Desativada</StatusBadge>)
		const badge = screen.getByText("Desativada").closest("span")
		expect(badge).not.toBeNull()
		expect(
			within(badge as HTMLElement).getByText("Desativada"),
		).toBeInTheDocument()
		expect(
			(badge as HTMLElement).querySelector("svg"),
		).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/status-badge.test.tsx`
Expected: FAIL — o `<span>` do dot (`h-1.5 w-1.5 rounded-full bg-current`) não é um `<svg>`, então `querySelector("svg")` retorna `null` e a asserção `toBeInTheDocument()` falha.

- **Step 3: Write minimal implementation**

Editar `apps/frontend/src/components/ui/status-badge.tsx`:

```typescript
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import { STATUS_ICON, type StatusIconTone } from "@/components/ui/status-icon"

type StatusTone = "success" | "warning" | "danger" | "neutral"

const TONE_CLASSES: Record<StatusTone, string> = {
	success: "bg-success-soft text-success",
	warning: "bg-warning-soft text-warning",
	danger: "bg-destructive-soft text-destructive",
	neutral: "bg-surface-2 text-muted-foreground border border-border",
}

export interface StatusBadgeProps {
	tone: StatusTone
	children: ReactNode
	className?: string
}

function isIconTone(tone: StatusTone): tone is StatusIconTone {
	return tone !== "neutral"
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
	const Icon = isIconTone(tone) ? STATUS_ICON[tone] : null
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
				TONE_CLASSES[tone],
				className,
			)}
		>
			{Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
			{children}
		</span>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/status-badge.test.tsx`
Expected: PASS (2 testes)

- **Step 5: Write the failing test (correção do tom "Inativo")**

Adicionar ao final de `apps/frontend/src/features/admin/components/user-row.test.tsx` (dentro do `describe` existente, reaproveitando o `buildUser` de fixture já presente no arquivo):

```tsx
test("status Inativo (suspenso) renderiza com ícone semântico (tone danger)", () => {
	render(<UserRow user={buildUser({ status: "suspended" })} />)
	const badge = screen.getByText("Inativo").closest("span")
	expect(badge).not.toBeNull()
	expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-row.test.tsx`
Expected: FAIL — `statusTone("suspended")` hoje retorna `"neutral"`, e `STATUS_ICON` (task 2) não mapeia `"neutral"`, então `StatusBadge` não renderiza nenhum `<svg>` para o status "Inativo"; `querySelector("svg")` retorna `null`.

- **Step 7: Write minimal implementation**

Editar `apps/frontend/src/features/admin/components/user-row.tsx`: alargar o tipo local `StatusTone` (hoje `"success" | "warning" | "neutral"`, sem `"danger"`) e adicionar o caso `"suspended"` explícito em `statusTone()`, antes do fallback:

```typescript
type StatusTone = "success" | "warning" | "danger" | "neutral"

function statusTone(status: string): StatusTone {
	if (status === "activated") return "success"
	if (status === "locked") return "warning"
	if (status === "suspended") return "danger"
	return "neutral"
}
```

O fallback `"neutral"` continua existindo para um `status` desconhecido/futuro fora do vocabulário atual (`activated`/`suspended`/`locked`) — comportamento defensivo preservado, só o caso `"suspended"` explícito muda de implícito-via-fallback para explícito-e-correto.

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-row.test.tsx`
Expected: PASS (todos os testes do arquivo, incluindo o novo)

- **Step 9: Commit** *(esta task participa da Wave 2 em paralelo com a task 3, em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos criados/alterados — o orquestrador comita na barreira de integração da wave.)*

```bash
git add apps/frontend/src/components/ui/status-badge.tsx apps/frontend/src/components/ui/status-badge.test.tsx apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx
git commit -m "feat: StatusBadge renderiza icone semantico de status e corrige tom Inativo (FR-003, FR-004)"
```

## Critérios de Sucesso

- `StatusBadge` renderiza um ícone de `STATUS_ICON[tone]` (quando `tone !== "neutral"`) junto ao texto de `children`, nunca substituindo o texto.
- A API pública (`tone` + `children` + `className`, tipo `StatusTone` com os 4 valores) não muda — nenhuma prop nova de "domínio" foi introduzida.
- `tone="neutral"` continua renderizando sem quebrar (sem ícone, fallback documentado).
- FR-003 e FR-004 cobertos por um teste cada em `status-badge.test.tsx`.
- Em `user-row.tsx`, o status "Inativo" (`suspended`) passa a resolver para `tone="danger"` e renderiza o ícone `CircleSlash`, alinhado ao mockup — nenhum status do vocabulário de usuário fica sem ícone.
