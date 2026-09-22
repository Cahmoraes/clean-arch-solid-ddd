# Task 10: Frontend — página `/admin/planos` (grid de cards, ações editar/inativar/reativar) [FR-009, FR-006, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-09

## Visão Geral

Página administrativa `/admin/planos`: grid de cards, um por plano, com nome, preço, tagline,
features, selo de status (Ativo/Inativo) e ações de editar/inativar/reativar no rodapé, mais um
card tracejado "Adicionar novo plano" ao final da grade (Experiência do Usuário, PRD). O card
completo dá ao admin visão total do catálogo, inativos incluídos (FR-009). Inativar/reativar
reaproveita o padrão `GymStatusConfirmationDialog` → `PlanStatusConfirmationDialog` (FR-006,
FR-007). Esta task **não** inclui o formulário de criação/edição (dialog) — os botões "Editar" e
"Adicionar novo plano" apenas abrem o estado local que a task-11 vai conectar ao
`PlanFormDialog`; sem esse componente, clicar neles ainda não abre nada nesta task.

## Arquivos

- Create: `apps/frontend/src/app/(authenticated)/admin/planos/page.tsx`
- Create: `apps/frontend/src/app/(authenticated)/admin/planos/page.test.tsx`
- Create: `apps/frontend/src/features/plans-admin/components/plan-card.tsx`
- Create: `apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.tsx`
- Create: `apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.test.tsx`
- Create: `apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.ts`
- Test: `apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.test.ts`

## Interfaces

- **Consome:** `usePlans(): UseQueryResult<PlanAdmin[], ApiError>`, `useInactivatePlan(): UseMutationResult<PlanAdmin, ApiError, string>`, `useReactivatePlan(): UseMutationResult<PlanAdmin, ApiError, string>`, `type PlanAdmin` (task-09, `features/plans-admin/api/index.ts`); handlers MSW de `/admin/plans` (task-09, `test/msw/handlers.ts`).
- **Produz:** `resolvePlanStatusBadge(plan: PlanAdmin): { tone: "success" | "neutral"; label:
  "Ativo" | "Inativo" }` (`apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.ts`).
  `type PlanStatusAction = "inactivate" | "reactivate"`, `PlanStatusConfirmationDialog({ open:
  boolean; action: PlanStatusAction; planName: string; isPending: boolean; onOpenChange: (open:
  boolean) => void; onConfirm: () => void })`
  (`apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.tsx`).
  `PlanCard({ plan: PlanAdmin; onEdit: (plan: PlanAdmin) => void; onToggleStatus: (plan:
  PlanAdmin) => void })` (`apps/frontend/src/features/plans-admin/components/plan-card.tsx`).
  `app/(authenticated)/admin/planos/page.tsx` — export default `AdminPlansPage`; mantém estado
  local `isFormOpen: boolean` e `editingPlan: PlanAdmin | null` (via `useState`), com
  `openCreateDialog()`/`openEditDialog(plan)` chamados pelos botões "Adicionar novo plano"/
  "Editar" — a task-11 lê e conecta esse estado ao `PlanFormDialog`, sem precisar tocar na lógica
  de listagem/toggle desta task.

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: consumo de `usePlans`/`useInactivatePlan`/`useReactivatePlan`
  na página.
- `shadcn`: reuso de `AlertDialog`/`Button`/`StatusBadge` para o dialog de confirmação e os cards.
- `tailwindcss`: grid responsivo de cards.
- `wcag-audit-patterns`: selo de status com nome acessível, botões de ação com `aria-label`
  quando ícone-only, `role="status"`/`aria-live` no empty state (via `EmptyState` existente).
- `vercel-react-best-practices`: página com lista, estados de loading/erro/vazio bem definidos.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/plans-catalog-admin-visual.md` (baseline de
  layout/spacing/hierarquia/tokens — grid de cards de plano, badge de status, card tracejado
  "Adicionar novo plano", núcleo HTML de referência incluído no mockup).
- **Fonte de design original:** nenhuma — o próprio mockup registra que o layout foi definido a
  partir dos tokens reais do projeto (Tailwind v4 `@theme` em `apps/frontend/src/app/globals.css`)
  e dos padrões já existentes nas telas admin (`academias`, `usuarios`) e nos cards de plano de
  `/assinatura` (`plan-card-hero.tsx`, `plan-card-secondary.tsx`).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela, além
  do mockup curado já registrado?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma skill/MCP de design-to-code
  ou teste visual dedicado identificado neste repo no momento do planejamento; construir
  manualmente a partir do mockup, reaproveitando os componentes shadcn/ui já existentes
  (`PageContainer`, `PageHeader`, `StatusBadge`, `AlertDialog`, `Button`) em vez de recriar CSS ad
  hoc — decisão já registrada no próprio mockup ("Fidelidade").
- **Decisões visuais já tomadas (não refazer):** grid de cards responsivo
  (`repeat(auto-fill, minmax(300px, 1fr))`), badge de status (Ativo = tom success, Inativo = tom
  neutro) no canto superior direito do card, preço grande em `font-display` + período pequeno,
  lista de features com ícone check-em-círculo, rodapé com ações "Editar" (outline) e
  "Inativar"/"Reativar", card inativo com opacidade reduzida (~0.55) em vez de escondido, card
  tracejado "Adicionar novo plano" ao final da grid. Layout em grid de cards (não tabela/lista) foi
  validado com o usuário via preview visual em 2026-09-22.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`
acima (descobertas uma vez, em tempo de planejamento). Confirme com o usuário se existe uma fonte
de design original além do mockup curado — só este passo precisa do usuário, por isso fica aqui,
em tempo de execução — e preencha qualquer lacuna deixada em aberto (só redescubra ferramentas se
o campo estiver vazio, inspecionando as skills disponíveis e os MCPs conectados; combine por
capacidade, nunca fixe o nome de uma ferramenta). Se existir uma URL de fonte ou uma ferramenta de
fidelidade, use-a; caso contrário, construa manualmente a partir do mockup curado em
`../specs/mockups/plans-catalog-admin-visual.md`. O mockup é o *norte* — reaproveite seu layout,
espaçamento e tokens já decididos; não os re-derive.

Este passo nunca bloqueia: "sem fonte / sem ferramenta disponível" é uma resposta válida que leva
à implementação manual contra o mockup — que é exatamente o caminho seguido pelos Steps 1-6 desta
task (nenhuma fonte de design original ou ferramenta de fidelidade foi identificada no
planejamento).

- **Step 1: Write the failing test**

```typescript
// apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.test.ts
import { describe, expect, test } from "vitest"
import type { PlanAdmin } from "@/features/plans-admin/api"
import { resolvePlanStatusBadge } from "./resolve-plan-status-badge"

function makePlan(overrides: Partial<PlanAdmin> = {}): PlanAdmin {
	return {
		id: "plan-1",
		name: "Premium Mensal",
		priceCents: 4990,
		billingPeriod: "monthly",
		tagline: "Tagline.",
		features: ["Check-ins ilimitados"],
		isActive: true,
		stripePriceId: "",
		...overrides,
	}
}

describe("resolvePlanStatusBadge", () => {
	test("plano ativo retorna tone success e label Ativo", () => {
		const badge = resolvePlanStatusBadge(makePlan({ isActive: true }))

		expect(badge).toEqual({ tone: "success", label: "Ativo" })
	})

	test("plano inativo retorna tone neutral e label Inativo", () => {
		const badge = resolvePlanStatusBadge(makePlan({ isActive: false }))

		expect(badge).toEqual({ tone: "neutral", label: "Inativo" })
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/lib/resolve-plan-status-badge.test.ts`
Expected: FAIL — `Cannot find module './resolve-plan-status-badge'`

- **Step 2: Write minimal implementation**

```typescript
// apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.ts
import type { PlanAdmin } from "@/features/plans-admin/api"

export function resolvePlanStatusBadge(plan: PlanAdmin) {
	return plan.isActive
		? { tone: "success" as const, label: "Ativo" }
		: { tone: "neutral" as const, label: "Inativo" }
}
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/lib/resolve-plan-status-badge.test.ts`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.test.tsx
import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { PlanStatusConfirmationDialog } from "./plan-status-confirmation-dialog"

describe("PlanStatusConfirmationDialog", () => {
	test("ação inactivate mostra título e descrição de inativação e chama onConfirm", () => {
		const onConfirm = vi.fn()
		renderWithProviders(
			<PlanStatusConfirmationDialog
				open
				action="inactivate"
				planName="Premium Mensal"
				isPending={false}
				onOpenChange={() => {}}
				onConfirm={onConfirm}
			/>,
		)

		expect(screen.getByText("Confirmar inativação")).toBeInTheDocument()
		fireEvent.click(screen.getByRole("button", { name: /confirmar inativação/i }))
		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	test("ação reactivate mostra título de reativação", () => {
		renderWithProviders(
			<PlanStatusConfirmationDialog
				open
				action="reactivate"
				planName="Premium Mensal"
				isPending={false}
				onOpenChange={() => {}}
				onConfirm={() => {}}
			/>,
		)

		expect(screen.getByText("Confirmar reativação")).toBeInTheDocument()
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/components/plan-status-confirmation-dialog.test.tsx`
Expected: FAIL — `Cannot find module './plan-status-confirmation-dialog'`

- **Step 4: Write minimal implementation**

```typescript
// apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.tsx
"use client"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, type ButtonProps } from "@/components/ui/button"

export type PlanStatusAction = "inactivate" | "reactivate"

export interface PlanStatusConfirmationDialogProps {
	open: boolean
	action: PlanStatusAction
	planName: string
	isPending: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

interface StatusActionConfig {
	title: string
	description: (planName: string) => string
	confirmLabel: string
	pendingLabel: string
	variant: ButtonProps["variant"]
}

const STATUS_ACTION_CONFIG: Record<PlanStatusAction, StatusActionConfig> = {
	inactivate: {
		title: "Confirmar inativação",
		description: (planName) =>
			`O plano "${planName}" deixará de aparecer na tela pública de assinaturas. Os dados do plano são mantidos e você pode reverter essa ação depois.`,
		confirmLabel: "Confirmar inativação",
		pendingLabel: "Inativando...",
		variant: "destructive",
	},
	reactivate: {
		title: "Confirmar reativação",
		description: (planName) =>
			`O plano "${planName}" voltará a aparecer na tela pública de assinaturas.`,
		confirmLabel: "Confirmar reativação",
		pendingLabel: "Reativando...",
		variant: "primary",
	},
}

export function PlanStatusConfirmationDialog({
	open,
	action,
	planName,
	isPending,
	onOpenChange,
	onConfirm,
}: PlanStatusConfirmationDialogProps) {
	const config = STATUS_ACTION_CONFIG[action]

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{config.title}</AlertDialogTitle>
					<AlertDialogDescription>
						{config.description(planName)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant={config.variant}
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPending}
						>
							{isPending ? config.pendingLabel : config.confirmLabel}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/components/plan-status-confirmation-dialog.test.tsx`
Expected: PASS

- **Step 5: Write the failing test**

```typescript
// apps/frontend/src/app/(authenticated)/admin/planos/page.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminPlansPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const PLAN_ACTIVE = {
	id: "plan-active",
	name: "Premium Mensal",
	priceCents: 4990,
	billingPeriod: "monthly",
	tagline: "Acesso ilimitado.",
	features: ["Check-ins ilimitados"],
	isActive: true,
	stripePriceId: "",
}

const PLAN_INACTIVE = {
	id: "plan-inactive",
	name: "Premium Anual",
	priceCents: 47900,
	billingPeriod: "yearly",
	tagline: "Economia anual.",
	features: ["Tudo do mensal"],
	isActive: false,
	stripePriceId: "",
}

describe("AdminPlansPage", () => {
	test("lista planos ativos e inativos com selo de status", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([PLAN_ACTIVE, PLAN_INACTIVE], { status: 200 }),
			),
		)

		renderWithProviders(<AdminPlansPage />)

		await waitFor(() => expect(screen.getByText("Premium Mensal")).toBeInTheDocument())
		expect(screen.getByText("Premium Anual")).toBeInTheDocument()
		expect(screen.getByText("Ativo")).toBeInTheDocument()
		expect(screen.getByText("Inativo")).toBeInTheDocument()
	})

	test("lista vazia mostra empty state", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([], { status: 200 }),
			),
		)

		renderWithProviders(<AdminPlansPage />)

		await waitFor(() =>
			expect(screen.getByText(/nenhum plano cadastrado/i)).toBeInTheDocument(),
		)
	})

	test("inativar um plano ativo chama PATCH /admin/plans/:id/inactivate", async () => {
		server.use(
			http.get(`${apiBaseUrl}/admin/plans`, () =>
				HttpResponse.json([PLAN_ACTIVE], { status: 200 }),
			),
		)
		let called = false
		server.use(
			http.patch(`${apiBaseUrl}/admin/plans/:id/inactivate`, () => {
				called = true
				return HttpResponse.json({ ...PLAN_ACTIVE, isActive: false }, { status: 200 })
			}),
		)

		renderWithProviders(<AdminPlansPage />)
		await waitFor(() => expect(screen.getByText("Premium Mensal")).toBeInTheDocument())

		fireEvent.click(screen.getByRole("button", { name: /inativar premium mensal/i }))
		fireEvent.click(screen.getByRole("button", { name: /confirmar inativação/i }))

		await waitFor(() => expect(called).toBe(true))
	})
})
```

Run (from `apps/frontend`): `npx vitest run "src/app/(authenticated)/admin/planos/page.test.tsx"`
Expected: FAIL — `Cannot find module './page'`

- **Step 6: Write minimal implementation**

```tsx
// apps/frontend/src/features/plans-admin/components/plan-card.tsx
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import type { PlanAdmin } from "@/features/plans-admin/api"
import { resolvePlanStatusBadge } from "@/features/plans-admin/lib/resolve-plan-status-badge"

const BILLING_PERIOD_LABEL: Record<PlanAdmin["billingPeriod"], string> = {
	monthly: "mês",
	yearly: "ano",
}

function formatPriceLabel(plan: PlanAdmin): string {
	const amount = (plan.priceCents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})
	return `R$ ${amount}/${BILLING_PERIOD_LABEL[plan.billingPeriod]}`
}

export interface PlanCardProps {
	plan: PlanAdmin
	onEdit: (plan: PlanAdmin) => void
	onToggleStatus: (plan: PlanAdmin) => void
}

export function PlanCard({ plan, onEdit, onToggleStatus }: PlanCardProps) {
	const badge = resolvePlanStatusBadge(plan)
	const toggleLabel = plan.isActive
		? `Inativar ${plan.name}`
		: `Reativar ${plan.name}`

	return (
		<article
			data-testid={`plan-card-${plan.id}`}
			className="flex flex-col gap-4 rounded-[12px] border border-border bg-card p-6"
		>
			<div className="flex items-start justify-between gap-2">
				<h3 className="font-display text-lg font-semibold text-foreground">
					{plan.name}
				</h3>
				<StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
			</div>
			<p className="font-display text-2xl font-bold text-foreground">
				{formatPriceLabel(plan)}
			</p>
			<p className="text-sm text-muted-foreground">{plan.tagline}</p>
			<ul className="flex flex-col gap-2">
				{plan.features.map((feature) => (
					<li
						key={feature}
						className="flex items-center gap-2 text-sm text-muted-foreground"
					>
						<Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
						{feature}
					</li>
				))}
			</ul>
			<div className="mt-auto flex items-center gap-2">
				<Button variant="outline" size="sm" onClick={() => onEdit(plan)}>
					Editar
				</Button>
				<Button
					variant={plan.isActive ? "destructive" : "primary"}
					size="sm"
					aria-label={toggleLabel}
					onClick={() => onToggleStatus(plan)}
				>
					{plan.isActive ? "Inativar" : "Reativar"}
				</Button>
			</div>
		</article>
	)
}
```

```tsx
// apps/frontend/src/app/(authenticated)/admin/planos/page.tsx
"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import {
	type PlanAdmin,
	useInactivatePlan,
	usePlans,
	useReactivatePlan,
} from "@/features/plans-admin/api"
import { PlanCard } from "@/features/plans-admin/components/plan-card"
import {
	type PlanStatusAction,
	PlanStatusConfirmationDialog,
} from "@/features/plans-admin/components/plan-status-confirmation-dialog"
import { ApiError } from "@/lib/errors"

function LoadingGrid() {
	return (
		<div
			data-testid="admin-plans-skeleton"
			className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
		>
			{["a", "b", "c"].map((key) => (
				<Skeleton key={key} className="h-64 w-full" />
			))}
		</div>
	)
}

function ErrorState({ error, onRetry }: { error: ApiError | null; onRetry: () => void }) {
	return (
		<EmptyState
			title="Não foi possível carregar os planos"
			description={error?.userMessage ?? "Tente novamente."}
			action={
				<Button variant="outline" onClick={onRetry}>
					Tentar novamente
				</Button>
			}
		/>
	)
}

interface ToggleState {
	plan: PlanAdmin
	action: PlanStatusAction
}

export default function AdminPlansPage() {
	const plansQuery = usePlans()
	const inactivatePlan = useInactivatePlan()
	const reactivatePlan = useReactivatePlan()
	const [toggleState, setToggleState] = useState<ToggleState | null>(null)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [editingPlan, setEditingPlan] = useState<PlanAdmin | null>(null)

	function openCreateDialog() {
		setEditingPlan(null)
		setIsFormOpen(true)
	}

	function openEditDialog(plan: PlanAdmin) {
		setEditingPlan(plan)
		setIsFormOpen(true)
	}

	function handleToggleStatus(plan: PlanAdmin) {
		setToggleState({ plan, action: plan.isActive ? "inactivate" : "reactivate" })
	}

	async function handleConfirmToggle() {
		if (!toggleState) return
		const mutation =
			toggleState.action === "inactivate" ? inactivatePlan : reactivatePlan
		try {
			await mutation.mutateAsync(toggleState.plan.id)
			toast.success(
				toggleState.action === "inactivate"
					? "Plano inativado com sucesso!"
					: "Plano reativado com sucesso!",
			)
			setToggleState(null)
		} catch {
			toast.error("Não foi possível atualizar o status do plano. Tente novamente.")
		}
	}

	return (
		<PageContainer width="wide">
			<PageHeader
				title="Planos"
				subtitle="Cadastre, edite e gerencie a disponibilidade dos planos de assinatura."
				action={
					<Button onClick={openCreateDialog}>
						<Plus className="h-4 w-4" aria-hidden="true" />
						Novo plano
					</Button>
				}
			/>

			{plansQuery.isLoading ? <LoadingGrid /> : null}
			{plansQuery.isError ? (
				<ErrorState error={plansQuery.error} onRetry={() => plansQuery.refetch()} />
			) : null}
			{!plansQuery.isLoading && !plansQuery.isError && plansQuery.data ? (
				plansQuery.data.length === 0 ? (
					<EmptyState
						title="Nenhum plano cadastrado"
						description="Cadastre o primeiro plano para que ele apareça na tela de assinaturas."
						action={<Button onClick={openCreateDialog}>Novo plano</Button>}
					/>
				) : (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{plansQuery.data.map((plan) => (
							<PlanCard
								key={plan.id}
								plan={plan}
								onEdit={openEditDialog}
								onToggleStatus={handleToggleStatus}
							/>
						))}
						<button
							type="button"
							data-testid="plan-card-add"
							onClick={openCreateDialog}
							className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-[12px] border border-dashed border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
						>
							<Plus className="h-6 w-6" aria-hidden="true" />
							Adicionar novo plano
						</button>
					</div>
				)
			) : null}

			<PlanStatusConfirmationDialog
				open={toggleState !== null}
				action={toggleState?.action ?? "inactivate"}
				planName={toggleState?.plan.name ?? ""}
				isPending={inactivatePlan.isPending || reactivatePlan.isPending}
				onOpenChange={(open) => {
					if (!open) setToggleState(null)
				}}
				onConfirm={handleConfirmToggle}
			/>

			{/* PlanFormDialog é conectado a isFormOpen/editingPlan pela task-11 */}
		</PageContainer>
	)
}
```

Run (from `apps/frontend`): `npx vitest run "src/app/(authenticated)/admin/planos/page.test.tsx"`
Expected: PASS

- **Step 7: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/frontend/src/app/\(authenticated\)/admin/planos/page.tsx \
  apps/frontend/src/app/\(authenticated\)/admin/planos/page.test.tsx \
  apps/frontend/src/features/plans-admin/components/plan-card.tsx \
  apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.tsx \
  apps/frontend/src/features/plans-admin/components/plan-status-confirmation-dialog.test.tsx \
  apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.ts \
  apps/frontend/src/features/plans-admin/lib/resolve-plan-status-badge.test.ts
git commit -m "feat(plans-admin): add admin plans grid page with inactivate/reactivate"
```

## Critérios de Sucesso

- `/admin/planos` lista todos os planos (ativos e inativos) em um grid de cards, cada um com selo
  de status visível (FR-009).
- Inativar um plano ativo chama `PATCH /admin/plans/:id/inactivate` após confirmação no dialog;
  reativar chama `.../reactivate` (FR-006, FR-007).
- Lista vazia mostra um `EmptyState` com call-to-action para cadastrar o primeiro plano.
- Os botões "Editar" e "Adicionar novo plano" atualizam `isFormOpen`/`editingPlan`, prontos para a
  task-11 conectar o `PlanFormDialog` sem alterar a lógica de listagem/toggle desta task.
