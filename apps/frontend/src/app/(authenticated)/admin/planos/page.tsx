"use client"

import type { UseQueryResult } from "@tanstack/react-query"
import { Plus } from "@/components/ui/pixel-icons"
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
import { PlanFormDialog } from "@/features/plans-admin/components/plan-form-dialog"
import {
	type PlanStatusAction,
	PlanStatusConfirmationDialog,
} from "@/features/plans-admin/components/plan-status-confirmation-dialog"
import type { ApiError } from "@/lib/errors"

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

function ErrorState({
	error,
	onRetry,
}: {
	error: ApiError | null
	onRetry: () => void
}) {
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

interface PlansContentProps {
	plansQuery: UseQueryResult<PlanAdmin[], ApiError>
	onAdd: () => void
	onEdit: (plan: PlanAdmin) => void
	onToggleStatus: (plan: PlanAdmin) => void
}

function PlansContent({
	plansQuery,
	onAdd,
	onEdit,
	onToggleStatus,
}: PlansContentProps) {
	if (plansQuery.isLoading) return <LoadingGrid />
	if (plansQuery.isError) {
		return (
			<ErrorState
				error={plansQuery.error}
				onRetry={() => plansQuery.refetch()}
			/>
		)
	}
	if (!plansQuery.data) return null
	if (plansQuery.data.length === 0) {
		return (
			<EmptyState
				title="Nenhum plano cadastrado"
				description="Cadastre o primeiro plano para que ele apareça na tela de assinaturas."
				action={<Button onClick={onAdd}>Novo plano</Button>}
			/>
		)
	}
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{plansQuery.data.map((plan) => (
				<PlanCard
					key={plan.id}
					plan={plan}
					onEdit={onEdit}
					onToggleStatus={onToggleStatus}
				/>
			))}
			<button
				type="button"
				data-testid="plan-card-add"
				onClick={onAdd}
				className="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
			>
				<Plus className="h-6 w-6" aria-hidden="true" />
				Adicionar novo plano
			</button>
		</div>
	)
}

interface ToggleState {
	plan: PlanAdmin
	action: PlanStatusAction
}

const TOGGLE_SUCCESS_MESSAGE: Record<PlanStatusAction, string> = {
	inactivate: "Plano inativado com sucesso!",
	reactivate: "Plano reativado com sucesso!",
}

export default function AdminPlansPage() {
	const plansQuery = usePlans()
	const inactivatePlan = useInactivatePlan()
	const reactivatePlan = useReactivatePlan()
	const [toggleState, setToggleState] = useState<ToggleState | null>(null)
	const [isFormOpen, setIsFormOpen] = useState(false)
	const [editingPlan, setEditingPlan] = useState<PlanAdmin | null>(null)

	const toggleMutations: Record<
		PlanStatusAction,
		ReturnType<typeof useInactivatePlan>
	> = {
		inactivate: inactivatePlan,
		reactivate: reactivatePlan,
	}

	function openCreateDialog() {
		setEditingPlan(null)
		setIsFormOpen(true)
	}

	function openEditDialog(plan: PlanAdmin) {
		setEditingPlan(plan)
		setIsFormOpen(true)
	}

	function handleToggleStatus(plan: PlanAdmin) {
		setToggleState({
			plan,
			action: plan.isActive ? "inactivate" : "reactivate",
		})
	}

	async function handleConfirmToggle() {
		if (!toggleState) return
		const { plan, action } = toggleState
		try {
			await toggleMutations[action].mutateAsync(plan.id)
			toast.success(TOGGLE_SUCCESS_MESSAGE[action])
			setToggleState(null)
		} catch {
			toast.error(
				"Não foi possível atualizar o status do plano. Tente novamente.",
			)
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

			<PlansContent
				plansQuery={plansQuery}
				onAdd={openCreateDialog}
				onEdit={openEditDialog}
				onToggleStatus={handleToggleStatus}
			/>

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

			<PlanFormDialog
				open={isFormOpen}
				plan={editingPlan}
				onOpenChange={setIsFormOpen}
				onSuccess={() => setEditingPlan(null)}
			/>
		</PageContainer>
	)
}
