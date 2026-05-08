# Task 12: Componentes frontend — CheckInItem badge + CheckInActions [RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RF-012]

**Status:** DONE
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar o badge de status em `CheckInItem` para suportar `"pending"`, `"validated"` e `"rejected"`. Criar o componente `CheckInActions` com os botões Aprovar/Rejeitar, com loading states e toast de feedback.

**Depende de:** Task 11

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-item.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`

## Passos

- [ ] **Step 1: Atualizar CheckInItem para suportar status "rejected"**

```typescript
// apps/frontend/src/features/check-ins/components/check-in-item.tsx
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import type { CheckIn } from "@/features/check-ins/api"

function formatDate(iso: string): string {
	try {
		return new Date(iso).toLocaleString("pt-BR", {
			dateStyle: "short",
			timeStyle: "short",
		})
	} catch {
		return iso
	}
}

function StatusBadge({ checkIn }: { checkIn: CheckIn }) {
	const status = checkIn.status
	if (status === "validated") {
		return (
			<span
				data-testid={`checkin-status-${checkIn.id}`}
				className="inline-flex items-center gap-1 text-xs text-emerald-600"
			>
				<CheckCircle2 aria-hidden className="h-4 w-4" />
				Validado
			</span>
		)
	}
	if (status === "rejected") {
		return (
			<span
				data-testid={`checkin-status-${checkIn.id}`}
				className="inline-flex items-center gap-1 text-xs text-muted-foreground"
			>
				<XCircle aria-hidden className="h-4 w-4" />
				Rejeitado
			</span>
		)
	}
	return (
		<span
			data-testid={`checkin-status-${checkIn.id}`}
			className="inline-flex items-center gap-1 text-xs text-muted-foreground"
		>
			<Clock aria-hidden className="h-4 w-4" />
			Pendente
		</span>
	)
}

export interface CheckInItemProps {
	checkIn: CheckIn
	action?: React.ReactNode
}

export function CheckInItem({ checkIn, action }: CheckInItemProps) {
	return (
		<li
			data-testid={`checkin-item-${checkIn.id}`}
			className="flex flex-col gap-3 rounded-[12px] border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex flex-col gap-1">
				<p className="text-sm font-medium text-card-foreground">
					{checkIn.gymTitle ?? `Academia ${checkIn.gymId}`}
				</p>
				<p className="text-xs text-muted-foreground">
					Realizado em {formatDate(checkIn.createdAt)}
				</p>
			</div>
			<div className="flex items-center gap-3">
				<StatusBadge checkIn={checkIn} />
				{action}
			</div>
		</li>
	)
}
```

> **Nota:** Removemos `const validated = checkIn.validatedAt !== null` e substituímos pelo campo `status` do objeto `CheckIn`.

- [ ] **Step 2: Criar CheckInActions**

```typescript
// apps/frontend/src/features/check-ins/components/check-in-actions.tsx
"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { CheckIn } from "@/features/check-ins/api"
import { useRejectCheckIn, useValidateCheckIn } from "@/features/check-ins/api"
import { ApiError } from "@/lib/errors"

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) return error.userMessage
	return fallback
}

interface CheckInActionsProps {
	checkIn: CheckIn
}

export function CheckInActions({ checkIn }: CheckInActionsProps) {
	const validate = useValidateCheckIn()
	const reject = useRejectCheckIn()
	const isLoading = validate.isPending || reject.isPending

	async function handleValidate() {
		try {
			await validate.mutateAsync(checkIn.id)
			toast.success("Check-in aprovado com sucesso.")
		} catch (error) {
			toast.error(errorMessage(error, "Não foi possível aprovar o check-in."))
		}
	}

	async function handleReject() {
		try {
			await reject.mutateAsync(checkIn.id)
			toast.success("Check-in rejeitado.")
		} catch (error) {
			toast.error(errorMessage(error, "Não foi possível rejeitar o check-in."))
		}
	}

	if (checkIn.status === "validated") {
		return (
			<Button
				type="button"
				variant="destructive"
				size="sm"
				onClick={handleReject}
				disabled={isLoading}
				aria-busy={reject.isPending}
				data-testid={`checkin-reject-${checkIn.id}`}
			>
				{reject.isPending ? "Rejeitando..." : "Rejeitar"}
			</Button>
		)
	}

	if (checkIn.status === "pending") {
		return (
			<div className="flex gap-2">
				<Button
					type="button"
					size="sm"
					onClick={handleValidate}
					disabled={isLoading}
					aria-busy={validate.isPending}
					data-testid={`checkin-approve-${checkIn.id}`}
				>
					{validate.isPending ? "Aprovando..." : "Aprovar"}
				</Button>
				<Button
					type="button"
					variant="destructive"
					size="sm"
					onClick={handleReject}
					disabled={isLoading}
					aria-busy={reject.isPending}
					data-testid={`checkin-reject-${checkIn.id}`}
				>
					{reject.isPending ? "Rejeitando..." : "Rejeitar"}
				</Button>
			</div>
		)
	}

	// rejected — sem ações disponíveis
	return null
}
```

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
git add apps/frontend/src/features/check-ins/components/check-in-item.tsx \
        apps/frontend/src/features/check-ins/components/check-in-actions.tsx
git commit -m "feat(frontend/check-ins): add status badge and CheckInActions component
```

## Critérios de Sucesso

- Badge `"validated"` = verde com CheckCircle2
- Badge `"rejected"` = muted com XCircle
- Badge `"pending"` = muted com Clock
- `CheckInActions` com `"pending"`: botões Aprovar + Rejeitar
- `CheckInActions` com `"validated"`: botão Rejeitar apenas
- `CheckInActions` com `"rejected"`: nenhum botão
- Loading state em cada botão durante mutação
- Toast de sucesso/erro após mutação
- 0 erros de TypeScript
