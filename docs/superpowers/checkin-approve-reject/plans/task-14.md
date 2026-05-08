# Task 14: Página /admin/check-ins — CheckInActions substituindo ValidateButton [RF-006, RF-007, RF-008, RF-009, RF-016, RF-018, RF-019]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar a página admin `/admin/check-ins` para:
- Remover `ValidateButton` interno (substituído por `CheckInActions`)
- Buscar `pending` e `validated` (sem status filter → filtra apenas rejected no cliente)
- Filtrar itens para exibir somente `status !== "rejected"` (pending + validated)
- Substituir filtro `validatedAt === null` pelo `status`
- Atualizar empty state para "Nenhum check-in pendente ou a revisar"

**Depende de:** Task 12

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`

## Passos

- [ ] **Step 1: Atualizar página admin /admin/check-ins**

```typescript
// apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx
"use client"

import { ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
	type CheckIn,
	useCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3"]

function LoadingState() {
	return (
		<ul
			data-testid="admin-checkins-skeleton"
			aria-label="Carregando check-ins pendentes"
			className="flex flex-col gap-2"
		>
			{SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-16 w-full rounded-[12px]" />
				</li>
			))}
		</ul>
	)
}

interface BodyProps {
	query: ReturnType<typeof useCheckIns>
}

function PendingError({ query }: BodyProps) {
	return (
		<EmptyState
			title="Não foi possível carregar os check-ins pendentes"
			description={query.error?.userMessage}
			action={
				<Button
					variant="outline"
					onClick={() => query.refetch()}
					data-testid="admin-checkins-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function PendingEmpty() {
	return (
		<EmptyState
			icon={ShieldCheck}
			title="Nenhum check-in pendente ou a revisar"
			description="Todos os check-ins foram validados ou rejeitados."
		/>
	)
}

function ActionableList({ items }: { items: ReadonlyArray<CheckIn> }) {
	return (
		<ul data-testid="admin-checkins-list" className="flex flex-col gap-2">
			{items.map((checkIn) => (
				<CheckInItem
					key={checkIn.id}
					checkIn={checkIn}
					action={<CheckInActions checkIn={checkIn} />}
				/>
			))}
		</ul>
	)
}

function AdminCheckInsBody({ query }: BodyProps) {
	if (query.isLoading) return <LoadingState />
	if (query.isError) return <PendingError query={query} />
	if (!query.isSuccess) return null
	// Exibe pending + validated; oculta rejected
	const items = (query.data?.items ?? []).filter(
		(item) => item.status !== "rejected",
	)
	if (items.length === 0) return <PendingEmpty />
	return <ActionableList items={items} />
}

export default function AdminCheckInsPage() {
	const [page] = useState(1)
	const query = useCheckIns({ page })

	return (
		<section
			aria-labelledby="admin-checkins-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex flex-col gap-1">
				<h1
					id="admin-checkins-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Check-ins pendentes
				</h1>
				<p className="text-sm text-muted-foreground">
					Aprove ou rejeite as presenças registradas pelos membros.
				</p>
			</header>

			<AdminCheckInsBody query={query} />
		</section>
	)
}
```

> **Notas:**
> - `ValidateButton` foi removido completamente — `CheckInActions` substitui com ambos os botões.
> - `useCheckIns({ page })` sem `status` retorna todos. O filtro `status !== "rejected"` garante que somente pending + validated aparecem (conforme decisão do usuário na etapa de brainstorming).
> - Empty state atualizado: "Nenhum check-in pendente ou a revisar" + "Todos os check-ins foram validados ou rejeitados."
> - Sub-descrição do header atualizado: "Aprove ou rejeite as presenças registradas pelos membros."

- [ ] **Step 2: Type-check do frontend**

```bash
pnpm --filter frontend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 3: Rodar testes do frontend**

```bash
pnpm --filter frontend test
```

Esperado: todos passam.

- [ ] **Step 4: Lint do frontend**

```bash
pnpm --filter frontend lint:fix
```

Esperado: 0 issues.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx
git commit -m "feat(frontend/admin): replace ValidateButton with CheckInActions in admin check-ins

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Admin página mostra check-ins `pending` e `validated` (não `rejected`)
- Cada item tem `CheckInActions` com botões adequados ao status
- `ValidateButton` foi removido (sem código morto)
- Empty state genérico para "sem actionable check-ins"
- Sub-header atualizado para "Aprove ou rejeite..."
- 0 erros de TypeScript
- Todos os testes passam
