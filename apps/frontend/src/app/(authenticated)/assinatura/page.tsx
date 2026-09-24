"use client"

import { AlertTriangle, BadgeCheck, Check } from "lucide-react"
import { useId, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
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
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useCancelSubscription } from "@/features/subscriptions/api/use-cancel-subscription"
import { useChangePlan } from "@/features/subscriptions/api/use-change-plan"
import { useCreateSubscription } from "@/features/subscriptions/api/use-create-subscription"
import {
	type MySubscription,
	useMySubscription,
} from "@/features/subscriptions/api/use-my-subscription"
import { type Plan, usePlans } from "@/features/subscriptions/api/use-plans"
import {
	type CreateSubscriptionResponse,
	DEMO_PAYMENT_METHOD_ID,
} from "@/features/subscriptions/schemas"
import { cn } from "@/lib/cn"
import { ApiError } from "@/lib/errors"

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
})

function formatDay(isoInstant: string): string {
	return dayFormatter.format(new Date(isoInstant))
}

function subscriptionErrorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível concluir a assinatura. Tente novamente."
}

function changePlanErrorMessage(error: unknown): string {
	if (error instanceof ApiError && error.status === 409) {
		return "O cancelamento desta assinatura já está agendado, por isso não é possível trocar de plano."
	}
	if (error instanceof ApiError && error.status === 404) {
		return "Você não possui assinatura ativa."
	}
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível trocar o plano. Tente novamente."
}

function cancelErrorMessage(error: unknown): string {
	if (error instanceof ApiError && error.status === 404) {
		return "Você não possui assinatura ativa."
	}
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível cancelar a assinatura. Tente novamente."
}

interface MutationErrors {
	create: unknown
	change: unknown
	cancel: unknown
}

function resolveErrorMessage(errors: MutationErrors): string | null {
	if (errors.create) return subscriptionErrorMessage(errors.create)
	if (errors.change) return changePlanErrorMessage(errors.change)
	if (errors.cancel) return cancelErrorMessage(errors.cancel)
	return null
}

type PageMode = "subscribe" | "manage" | "cancel-scheduled"
type PendingAction = "create" | "change" | "cancel" | null

function modeOf(subscription: MySubscription | null): PageMode {
	if (!subscription) return "subscribe"
	return subscription.state === "cancel_scheduled"
		? "cancel-scheduled"
		: "manage"
}

interface PendingFlags {
	create: boolean
	change: boolean
	cancel: boolean
}

function pendingActionOf(flags: PendingFlags): PendingAction {
	if (flags.create) return "create"
	if (flags.change) return "change"
	if (flags.cancel) return "cancel"
	return null
}

interface DemoBannerProps {
	className?: string
}

function DemoBanner({ className }: DemoBannerProps) {
	return (
		<div
			role="note"
			aria-label="Aviso de demonstração"
			data-testid="subscription-demo-banner"
			className={cn(
				"flex items-start gap-3 rounded-[12px] border border-warning bg-warning-soft px-4 py-3 text-sm text-foreground",
				className,
			)}
		>
			<AlertTriangle
				className="mt-0.5 h-4 w-4 shrink-0 text-warning"
				aria-hidden="true"
			/>
			<div className="flex flex-col gap-1">
				<strong className="font-medium">
					Demonstração — sem cobrança real.
				</strong>
				<span className="text-muted-foreground">
					Esta tela simula o fluxo de assinatura. Nenhum pagamento será
					processado e nenhum cartão será cobrado.
				</span>
			</div>
		</div>
	)
}

interface BillingSummary {
	label: string
	name: string
	priceLabel: string
	note: string | null
}

function describeSelectedPlanBilling(
	selectedPlan: Plan | undefined,
): BillingSummary {
	return {
		label: "Plano selecionado",
		name: selectedPlan?.name ?? "Nenhum plano selecionado",
		priceLabel: selectedPlan?.priceLabel ?? "—",
		note: null,
	}
}

function billingNoteOf(subscription: MySubscription, end: string): string {
	return subscription.state === "cancel_scheduled"
		? `Cancelamento agendado. Acesso até ${end}`
		: `Próxima cobrança em ${end}`
}

function describeActiveSubscriptionBilling(
	subscription: MySubscription,
	plans: ReadonlyArray<Plan>,
): BillingSummary {
	const catalogPlan = subscription.plan
		? plans.find((plan) => plan.id === subscription.plan?.id)
		: undefined
	return {
		label: "Plano atual",
		name: subscription.plan?.name ?? "Plano não identificado",
		priceLabel: catalogPlan?.priceLabel ?? "—",
		note: billingNoteOf(subscription, formatDay(subscription.currentPeriodEnd)),
	}
}

function describeBilling(
	subscription: MySubscription | null,
	plans: ReadonlyArray<Plan>,
	selectedPlan: Plan | undefined,
): BillingSummary {
	if (!subscription) return describeSelectedPlanBilling(selectedPlan)
	return describeActiveSubscriptionBilling(subscription, plans)
}

interface BillingBannerProps {
	subscription: MySubscription | null
	plans: ReadonlyArray<Plan>
	selectedPlan: Plan | undefined
}

function BillingBanner({
	subscription,
	plans,
	selectedPlan,
}: BillingBannerProps) {
	const summary = describeBilling(subscription, plans, selectedPlan)
	return (
		<div
			data-testid="billing-banner"
			className="mb-5 flex flex-wrap items-center justify-between gap-6 rounded-lg border border-border bg-card p-7 shadow-sm"
		>
			<div>
				<p className="font-mono text-[10.5px] uppercase tracking-wider text-subtle">
					{summary.label}
				</p>
				<p className="mt-1 font-display text-xl font-semibold">
					{summary.name}
				</p>
				{summary.note ? (
					<p className="text-sm text-muted-foreground">{summary.note}</p>
				) : null}
			</div>
			<div className="flex flex-col items-end gap-2">
				<span className="tabular font-mono text-[28px] font-bold leading-none">
					{summary.priceLabel}
				</span>
			</div>
		</div>
	)
}

interface PlanCardProps {
	plan: Plan
	selected: boolean
	current: boolean
	disabled: boolean
	onSelect: (plan: Plan) => void
	groupName: string
}

function PlanCard({
	plan,
	selected,
	current,
	disabled,
	onSelect,
	groupName,
}: PlanCardProps) {
	const inputId = `subscription-plan-input-${plan.id}`
	return (
		<label
			htmlFor={inputId}
			data-testid={`subscription-plan-${plan.id}`}
			data-selected={selected ? "true" : "false"}
			className={cn(
				"relative flex cursor-pointer flex-col rounded-lg border bg-card p-7 text-left shadow-sm transition-colors",
				"focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-2",
				disabled ? "cursor-not-allowed opacity-60" : "",
				selected
					? "border-accent shadow-[0_0_0_1px_var(--color-accent)]"
					: "border-border hover:border-border-strong",
			)}
		>
			<input
				id={inputId}
				type="radio"
				name={groupName}
				value={plan.id}
				checked={selected}
				disabled={disabled}
				onChange={() => onSelect(plan)}
				className="sr-only"
			/>
			{current ? (
				<span className="absolute right-4.5 top-4.5 rounded-full bg-accent px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
					Plano atual
				</span>
			) : null}
			<p className="mb-3.5 font-display text-lg font-bold text-foreground">
				{plan.name}
			</p>
			<p className="mb-3.5 text-sm text-muted-foreground">{plan.tagline}</p>
			<p className="tabular font-display text-2xl font-semibold text-foreground">
				{plan.priceLabel}
			</p>
			<ul className="mt-5 flex flex-1 flex-col gap-3">
				{plan.features.map((feature) => (
					<li
						key={feature}
						className="flex items-center gap-2.5 text-sm text-muted-foreground"
					>
						<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
							<Check className="h-3 w-3" aria-hidden="true" />
						</span>
						{feature}
					</li>
				))}
			</ul>
		</label>
	)
}

interface ConfirmationProps {
	plan: Plan
	subscription: CreateSubscriptionResponse
}

function Confirmation({ plan, subscription }: ConfirmationProps) {
	return (
		<section
			data-testid="subscription-confirmation"
			aria-live="polite"
			className="flex flex-col gap-3 rounded-2xl border border-primary bg-card p-5"
		>
			<div className="flex items-center gap-2">
				<BadgeCheck className="h-5 w-5 text-foreground" aria-hidden="true" />
				<h2 className="font-display text-xl font-medium text-foreground">
					Assinatura demonstrativa criada
				</h2>
			</div>
			<p className="text-sm text-foreground">
				Plano: <strong>{plan.name}</strong>
			</p>
			<dl className="grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
				<div className="flex flex-col">
					<dt className="text-muted-foreground">ID da subscription</dt>
					<dd
						data-testid="subscription-confirmation-id"
						className="font-mono text-foreground"
					>
						{subscription.subscriptionId}
					</dd>
				</div>
				<div className="flex flex-col">
					<dt className="text-muted-foreground">Status</dt>
					<dd
						data-testid="subscription-confirmation-status"
						className="font-mono text-foreground"
					>
						{subscription.status}
					</dd>
				</div>
			</dl>
			<p className="text-xs text-muted-foreground">
				Lembrete: nenhum valor foi cobrado — este é um fluxo demonstrativo.
			</p>
		</section>
	)
}

interface PlansListProps {
	plans: ReadonlyArray<Plan>
	selectedPlanId: string
	currentPlanId: string | null
	disabled: boolean
	groupName: string
	onSelect: (plan: Plan) => void
}

function PlansList({
	plans,
	selectedPlanId,
	currentPlanId,
	disabled,
	groupName,
	onSelect,
}: PlansListProps) {
	return (
		<fieldset
			aria-label="Planos disponíveis"
			data-testid="plan-grid"
			className="grid grid-cols-1 gap-4 border-0 p-0 md:grid-cols-2"
		>
			{plans.map((plan) => (
				<PlanCard
					key={plan.id}
					plan={plan}
					selected={plan.id === selectedPlanId}
					current={plan.id === currentPlanId}
					disabled={disabled}
					onSelect={onSelect}
					groupName={groupName}
				/>
			))}
		</fieldset>
	)
}

interface ErrorAlertProps {
	message: string | null
}

function ErrorAlert({ message }: ErrorAlertProps) {
	if (!message) return null
	return (
		<p
			role="alert"
			data-testid="subscription-error"
			className="rounded-[12px] bg-destructive-soft px-4 py-3 text-sm text-destructive"
		>
			{message}
		</p>
	)
}

interface SubscribeActionsProps {
	isPending: boolean
	disabled: boolean
	onSubscribe: () => void
}

function SubscribeActions({
	isPending,
	disabled,
	onSubscribe,
}: SubscribeActionsProps) {
	return (
		<div className="flex flex-col gap-3">
			<Button
				type="button"
				data-testid="subscription-submit"
				disabled={disabled}
				onClick={onSubscribe}
				aria-busy={isPending}
				className="h-11 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-strong disabled:opacity-60"
			>
				{isPending ? "Processando…" : "Assinar plano demo"}
			</Button>
			<DemoBanner className="border-border" />
		</div>
	)
}

interface ManageActionsProps {
	pendingAction: PendingAction
	disabled: boolean
	canChange: boolean
	onChange: () => void
	onCancel: () => void
}

function ManageActions({
	pendingAction,
	disabled,
	canChange,
	onChange,
	onCancel,
}: ManageActionsProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-3">
				<Button
					type="button"
					data-testid="subscription-change-plan"
					disabled={disabled || !canChange}
					onClick={onChange}
					aria-busy={pendingAction === "change"}
					className="h-11 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-strong disabled:opacity-60"
				>
					{pendingAction === "change" ? "Processando…" : "Trocar plano"}
				</Button>
				<Button
					type="button"
					variant="outline"
					data-testid="subscription-cancel"
					disabled={disabled}
					onClick={onCancel}
					aria-busy={pendingAction === "cancel"}
					className="h-11 rounded-md px-5 font-semibold"
				>
					{pendingAction === "cancel" ? "Processando…" : "Cancelar assinatura"}
				</Button>
			</div>
			<DemoBanner className="border-border" />
		</div>
	)
}

interface CancellationNoticeProps {
	endDate: string
}

function CancellationNotice({ endDate }: CancellationNoticeProps) {
	return (
		<p
			role="status"
			data-testid="subscription-cancellation-notice"
			className="rounded-[12px] border border-border bg-card px-4 py-3 text-sm text-foreground"
		>
			Seu cancelamento está agendado. Você mantém o acesso até {endDate}.
		</p>
	)
}

interface CancelSubscriptionDialogProps {
	open: boolean
	isPending: boolean
	endDate: string
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}

function CancelSubscriptionDialog({
	open,
	isPending,
	endDate,
	onOpenChange,
	onConfirm,
}: CancelSubscriptionDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
					<AlertDialogDescription>
						Você mantém acesso até {endDate}. Essa ação não pode ser desfeita.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>
						Manter assinatura
					</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							type="button"
							variant="destructive"
							data-testid="subscription-cancel-confirm"
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPending}
						>
							{isPending ? "Cancelando…" : "Confirmar cancelamento"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

interface UseSubscriptionFlow {
	groupName: string
	mode: PageMode
	selectedPlan: Plan | undefined
	selectedPlanId: string
	currentPlanId: string | null
	pendingAction: PendingAction
	isPending: boolean
	errorMessage: string | null
	data: ReturnType<typeof useCreateSubscription>["data"]
	cancelDialogOpen: boolean
	handleSelectPlan: (plan: Plan) => void
	handleSubscribe: () => Promise<void>
	handleChangePlan: () => Promise<void>
	requestCancel: () => void
	setCancelDialogOpen: (open: boolean) => void
	confirmCancel: () => Promise<void>
}

function useSubscriptionFlow(
	plans: ReadonlyArray<Plan>,
	subscription: MySubscription | null,
): UseSubscriptionFlow {
	const groupName = useId()
	const currentPlanId = subscription?.plan?.id ?? null
	const [selectedPlanId, setSelectedPlanId] = useState<string>(
		currentPlanId ?? plans[0]?.id ?? "",
	)
	const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
	const createMutation = useCreateSubscription()
	const changeMutation = useChangePlan()
	const cancelMutation = useCancelSubscription()
	const selectedPlan =
		plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]
	const pendingAction = pendingActionOf({
		create: createMutation.isPending,
		change: changeMutation.isPending,
		cancel: cancelMutation.isPending,
	})

	async function handleSubscribe() {
		if (!selectedPlan) return
		try {
			await createMutation.mutateAsync({
				priceId: selectedPlan.priceId,
				paymentMethodId: DEMO_PAYMENT_METHOD_ID,
			})
		} catch {
			// erro é exposto via `error` do useMutation; renderizado por <ErrorAlert />.
		}
	}

	async function handleChangePlan() {
		if (!selectedPlan) return
		try {
			await changeMutation.mutateAsync({ priceId: selectedPlan.priceId })
		} catch {
			// erro é exposto via `error` do useMutation; renderizado por <ErrorAlert />.
		}
	}

	function requestCancel() {
		setCancelDialogOpen(true)
	}

	async function confirmCancel() {
		setCancelDialogOpen(false)
		try {
			await cancelMutation.mutateAsync()
		} catch {
			// erro é exposto via `error` do useMutation; renderizado por <ErrorAlert />.
		}
	}

	function handleSelectPlan(plan: Plan) {
		setSelectedPlanId(plan.id)
		createMutation.reset()
		changeMutation.reset()
		cancelMutation.reset()
	}

	return {
		groupName,
		mode: modeOf(subscription),
		selectedPlan,
		selectedPlanId,
		currentPlanId,
		pendingAction,
		isPending: pendingAction !== null,
		errorMessage: resolveErrorMessage({
			create: createMutation.error,
			change: changeMutation.error,
			cancel: cancelMutation.error,
		}),
		data: createMutation.data,
		cancelDialogOpen,
		handleSelectPlan,
		handleSubscribe,
		handleChangePlan,
		requestCancel,
		setCancelDialogOpen,
		confirmCancel,
	}
}

interface SubscriptionPageContentProps {
	plans: ReadonlyArray<Plan>
	subscription: MySubscription | null
}

function canChangePlan(
	selectedPlan: Plan | undefined,
	currentPlanId: string | null,
): boolean {
	return selectedPlan !== undefined && selectedPlan.id !== currentPlanId
}

interface ManageSectionProps {
	flow: UseSubscriptionFlow
	subscription: MySubscription | null
}

function ManageSection({ flow, subscription }: ManageSectionProps) {
	return (
		<>
			<ManageActions
				pendingAction={flow.pendingAction}
				disabled={flow.isPending}
				canChange={canChangePlan(flow.selectedPlan, flow.currentPlanId)}
				onChange={flow.handleChangePlan}
				onCancel={flow.requestCancel}
			/>
			{subscription ? (
				<CancelSubscriptionDialog
					open={flow.cancelDialogOpen}
					isPending={flow.pendingAction === "cancel"}
					endDate={formatDay(subscription.currentPeriodEnd)}
					onOpenChange={flow.setCancelDialogOpen}
					onConfirm={flow.confirmCancel}
				/>
			) : null}
		</>
	)
}

interface SubscriptionStateSectionProps {
	flow: UseSubscriptionFlow
	subscription: MySubscription | null
}

function SubscriptionStateSection({
	flow,
	subscription,
}: SubscriptionStateSectionProps) {
	if (flow.mode === "subscribe") {
		return (
			<SubscribeActions
				isPending={flow.pendingAction === "create"}
				disabled={flow.isPending || !flow.selectedPlan}
				onSubscribe={flow.handleSubscribe}
			/>
		)
	}
	if (flow.mode === "manage") {
		return <ManageSection flow={flow} subscription={subscription} />
	}
	if (subscription) {
		return (
			<CancellationNotice endDate={formatDay(subscription.currentPeriodEnd)} />
		)
	}
	return null
}

function SubscriptionPageContent({
	plans,
	subscription,
}: SubscriptionPageContentProps) {
	const flow = useSubscriptionFlow(plans, subscription)

	return (
		<PageContainer as="section" width="default">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Assinatura Premium
				</h1>
				<p className="text-sm text-muted-foreground">
					Escolha um plano para experimentar o fluxo de assinatura.
				</p>
			</header>

			<BillingBanner
				subscription={subscription}
				plans={plans}
				selectedPlan={flow.selectedPlan}
			/>

			<PlansList
				plans={plans}
				selectedPlanId={flow.selectedPlan?.id ?? ""}
				currentPlanId={flow.currentPlanId}
				disabled={flow.isPending || flow.mode === "cancel-scheduled"}
				groupName={flow.groupName}
				onSelect={flow.handleSelectPlan}
			/>

			<ErrorAlert message={flow.errorMessage} />

			{flow.data && flow.selectedPlan ? (
				<Confirmation plan={flow.selectedPlan} subscription={flow.data} />
			) : null}

			<SubscriptionStateSection flow={flow} subscription={subscription} />
		</PageContainer>
	)
}

function activeSubscriptionOf(
	subscription: MySubscription | null | undefined,
): MySubscription | null {
	if (!subscription || subscription.state === "expired") return null
	return subscription
}

function SubscriptionLoadingState() {
	return (
		<PageContainer as="section" width="default">
			<Skeleton className="h-10 w-2/3" />
			<Skeleton className="h-64 w-full" />
		</PageContainer>
	)
}

interface SubscriptionQueryErrorStateProps {
	title: string
	description?: string
	onRetry: () => void
}

function SubscriptionQueryErrorState({
	title,
	description,
	onRetry,
}: SubscriptionQueryErrorStateProps) {
	return (
		<PageContainer as="section" width="default">
			<EmptyState
				title={title}
				description={description ?? "Tente novamente."}
				action={
					<Button variant="outline" onClick={onRetry}>
						Tentar novamente
					</Button>
				}
			/>
		</PageContainer>
	)
}

export default function SubscriptionPage() {
	const plansQuery = usePlans()
	const subscriptionQuery = useMySubscription()

	if (plansQuery.isLoading || subscriptionQuery.isLoading) {
		return <SubscriptionLoadingState />
	}

	if (plansQuery.isError || !plansQuery.data) {
		return (
			<SubscriptionQueryErrorState
				title="Não foi possível carregar os planos"
				description={plansQuery.error?.userMessage}
				onRetry={() => plansQuery.refetch()}
			/>
		)
	}

	if (subscriptionQuery.isError) {
		return (
			<SubscriptionQueryErrorState
				title="Não foi possível carregar sua assinatura"
				description={subscriptionQuery.error?.userMessage}
				onRetry={() => subscriptionQuery.refetch()}
			/>
		)
	}

	return (
		<SubscriptionPageContent
			plans={plansQuery.data}
			subscription={activeSubscriptionOf(subscriptionQuery.data)}
		/>
	)
}
