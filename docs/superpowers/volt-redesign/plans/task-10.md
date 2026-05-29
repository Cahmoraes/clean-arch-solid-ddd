# Task 10: Redesign Admin Check-ins (segmented, checkin-row, ações inline) [RF-018]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila a tela de Admin Check-ins (`/admin/check-ins`) no vocabulário VOLT: `PageHeader`, filtros via `SegmentedControl` (Todos/Pendentes/Aprovados/Rejeitados), e linhas de check-in (`checkin-row`) com chip de ícone de status (success/warning/danger) e ações inline (Aprovar/Rejeitar/Reverter). Preserva os hooks (`useCheckIns`, `useValidateCheckIn`, `useRejectCheckIn`) e o `useCheckInFilters` (sincronização com URL).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-item.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-item.test.tsx` (novo ou estendido)

### Conformidade com as Skills Padrão

- use code-style: reusar `SegmentedControl`/`PageHeader`, tokens semânticos, ações com cores de status
- use test-antipatterns: asserir status/ações visíveis, mockar mutations

## Passos

- [ ] **Step 1: Escrever o teste que falha (chip de status VOLT)**

Crie/estenda `apps/frontend/src/features/check-ins/components/check-in-item.test.tsx` (ajuste o shape ao tipo real):

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CheckInItem } from "./check-in-item"

const checkIn = {
	id: "c1",
	userName: "Caique Moraes",
	gymName: "VOLT Centro",
	status: "PENDING" as const,
	createdAt: "2026-05-29T10:00:00Z",
}

describe("CheckInItem VOLT", () => {
	test("exibe usuário e academia", () => {
		render(<CheckInItem checkIn={checkIn} />)
		expect(screen.getByText("Caique Moraes")).toBeInTheDocument()
		expect(screen.getByText(/VOLT Centro/)).toBeInTheDocument()
	})

	test("aplica o chip de status pendente", () => {
		const { container } = render(<CheckInItem checkIn={checkIn} />)
		expect(container.querySelector('[data-status="PENDING"]')).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "CheckInItem VOLT"`
Expected: FAIL — falta o chip `data-status`.

- [ ] **Step 3: Reescrever `check-in-item.tsx`**

Linha de check-in com chip de ícone de status e área de ações. Mapa de tom por status:

```tsx
import { Check, Clock, X } from "lucide-react"
import { cn } from "@/lib/cn"

const STATUS_CHIP = {
	APPROVED: { cls: "bg-success-soft text-success", Icon: Check },
	PENDING: { cls: "bg-warning-soft text-warning", Icon: Clock },
	REJECTED: { cls: "bg-destructive-soft text-destructive", Icon: X },
} as const

// no JSX:
const chip = STATUS_CHIP[checkIn.status] ?? STATUS_CHIP.PENDING
<div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[transform,border-color] hover:translate-x-0.5 hover:border-border-strong">
	<span
		data-status={checkIn.status}
		className={cn("inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[13px]", chip.cls)}
	>
		<chip.Icon className="h-5 w-5" aria-hidden="true" />
	</span>
	<div className="min-w-0 flex-1">
		<p className="text-[15px] font-semibold">{checkIn.userName}</p>
		<p className="text-[13px] text-muted-foreground">{checkIn.gymName}</p>
	</div>
	<time className="font-mono text-xs text-subtle tabular max-[560px]:hidden">
		{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(checkIn.createdAt))}
	</time>
	{/* CheckInActions renderiza aqui */}
</div>
```

> Ajuste os nomes de campos (`userName`, `gymName`, `status`, `createdAt`) ao tipo real do módulo.

- [ ] **Step 4: Restilar `check-in-actions.tsx`**

Botões inline preservando as mutations (`useValidateCheckIn`/`useRejectCheckIn`):

```tsx
// Aprovar (accent)
<button type="button" onClick={onApprove} disabled={isPending} className="h-[38px] rounded-md bg-accent px-3.5 text-[13.5px] font-semibold text-accent-foreground hover:bg-primary-strong disabled:opacity-60">Aprovar</button>
// Rejeitar (danger soft → solid)
<button type="button" onClick={onReject} disabled={isPending} className="h-[38px] rounded-md bg-destructive-soft px-3.5 text-[13.5px] font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60">Rejeitar</button>
```

Em telas estreitas as ações empilham: envolva-as em `<div className="flex gap-2 max-[560px]:flex-col">`.

- [ ] **Step 5: Substituir o filtro pelo `SegmentedControl` e aplicar `PageHeader`**

Reescreva `check-in-filter-bar.tsx` com `SegmentedControl` (Todos/Pendentes/Aprovados/Rejeitados), mantendo `value`/`onChange` ligados ao `useCheckInFilters`. Em `page.tsx`, use `PageHeader` (título "Check-ins", eyebrow "Admin").

```tsx
const items = [
	{ value: "todos", label: "Todos" },
	{ value: "pendentes", label: "Pendentes" },
	{ value: "aprovados", label: "Aprovados" },
	{ value: "rejeitados", label: "Rejeitados" },
]
<SegmentedControl aria-label="Filtrar check-ins" items={items} value={status} onValueChange={setStatus} />
```

- [ ] **Step 6: Rodar o teste, suíte, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "CheckInItem VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend test && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde. Atualize specs e2e/unit que dependam de seletores do filtro antigo, preservando os testids de ação validados pelo e2e (`admin-validate-checkin.spec.ts`).

- [ ] **Step 7: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx" apps/frontend/src/features/check-ins/
git commit -m "feat(volt-redesign): admin check-ins com segmented, checkin-row e ações VOLT"
```

## Critérios de Sucesso

- `PageHeader` + `SegmentedControl` (4 status) na tela [RF-018]
- `checkin-row` com chip de status colorido (success/warning/danger) e ações inline
- Funcionalidade preservada: filtro sincronizado com URL, aprovar/rejeitar
- e2e `admin-validate-checkin` continua passando
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
