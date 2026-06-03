"use client"

import { AlertTriangle, BadgeCheck, Check } from "lucide-react"
import { useId, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { useCreateSubscription } from "@/features/subscriptions/api/use-create-subscription"
import {
	type CreateSubscriptionResponse,
	DEMO_PAYMENT_METHOD_ID,
	DEMO_PLANS,
	type DemoPlan,
} from "@/features/subscriptions/schemas"
import { cn } from "@/lib/cn"
import { ApiError } from "@/lib/errors"

function subscriptionErrorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível concluir a assinatura. Tente novamente."
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
				"flex items-start gap-3 rounded-[12px] border border-primary bg-accent px-4 py-3 text-sm text-accent-foreground",
				className,
			)}
		>
			<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
			<div className="flex flex-col gap-1">
				<strong className="font-medium">
					Demonstração — sem cobrança real.
				</strong>
				<span className="text-accent-foreground/70">
					Esta tela simula o fluxo de assinatura. Nenhum pagamento será
					processado e nenhum cartão será cobrado.
				</span>
			</div>
		</div>
	)
}

interface BillingBannerProps {
	plan: DemoPlan | undefined
}

function BillingBanner({ plan }: BillingBannerProps) {
	return (
		<div
			data-testid="billing-banner"
			className="mb-5 flex flex-wrap items-center justify-between gap-6 rounded-lg border border-border bg-card p-7 shadow-sm"
		>
			<div>
				<p className="font-mono text-[10.5px] uppercase tracking-wider text-subtle">
					Plano atual
				</p>
				<p className="mt-1 font-display text-xl font-semibold">
					{plan?.name ?? "Nenhum plano selecionado"}
				</p>
				<p className="text-sm text-muted-foreground">
					Próxima cobrança em 30 dias
				</p>
			</div>
			<div className="flex flex-col items-end gap-2">
				<span className="tabular font-mono text-[28px] font-bold leading-none">
					{plan?.priceLabel ?? "—"}
				</span>
			</div>
		</div>
	)
}

interface PlanCardProps {
	plan: DemoPlan
	selected: boolean
	disabled: boolean
	onSelect: (plan: DemoPlan) => void
	groupName: string
}

function PlanCard({
	plan,
	selected,
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
			{selected ? (
				<span className="absolute right-[18px] top-[18px] rounded-full bg-accent px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
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
	plan: DemoPlan
	subscription: CreateSubscriptionResponse
}

function Confirmation({ plan, subscription }: ConfirmationProps) {
	return (
		<section
			data-testid="subscription-confirmation"
			aria-live="polite"
			className="flex flex-col gap-3 rounded-[16px] border border-primary bg-card p-5"
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
	selectedPlanId: string
	disabled: boolean
	groupName: string
	onSelect: (plan: DemoPlan) => void
}

function PlansList({
	selectedPlanId,
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
			{DEMO_PLANS.map((plan) => (
				<PlanCard
					key={plan.id}
					plan={plan}
					selected={plan.id === selectedPlanId}
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
				className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-primary-strong disabled:opacity-60"
			>
				{isPending ? "Processando…" : "Assinar plano demo"}
			</Button>
			<DemoBanner className="border-border" />
		</div>
	)
}

interface UseSubscriptionFlow {
	groupName: string
	selectedPlan: DemoPlan | undefined
	selectedPlanId: string
	isPending: boolean
	errorMessage: string | null
	data: ReturnType<typeof useCreateSubscription>["data"]
	handleSelectPlan: (plan: DemoPlan) => void
	handleSubscribe: () => Promise<void>
}

function useSubscriptionFlow(): UseSubscriptionFlow {
	const groupName = useId()
	const [selectedPlanId, setSelectedPlanId] = useState<string>(
		DEMO_PLANS[0]?.id ?? "",
	)
	const { mutateAsync, isPending, error, data, reset } = useCreateSubscription()
	const selectedPlan =
		DEMO_PLANS.find((plan) => plan.id === selectedPlanId) ?? DEMO_PLANS[0]

	async function handleSubscribe() {
		if (!selectedPlan) return
		try {
			await mutateAsync({
				priceId: selectedPlan.priceId,
				paymentMethodId: DEMO_PAYMENT_METHOD_ID,
			})
		} catch {
			// erro é exposto via `error` do useMutation; renderizado por <ErrorAlert />.
		}
	}

	function handleSelectPlan(plan: DemoPlan) {
		setSelectedPlanId(plan.id)
		if (data || error) reset()
	}

	return {
		groupName,
		selectedPlan,
		selectedPlanId,
		isPending,
		errorMessage: error ? subscriptionErrorMessage(error) : null,
		data,
		handleSelectPlan,
		handleSubscribe,
	}
}

export default function SubscriptionPage() {
	const flow = useSubscriptionFlow()

	return (
		<PageContainer as="section" width="default">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Assinatura Premium
				</h1>
				<p className="text-sm text-accent-foreground/70">
					Escolha um plano para experimentar o fluxo de assinatura.
				</p>
			</header>

			<BillingBanner plan={flow.selectedPlan} />

			<PlansList
				selectedPlanId={flow.selectedPlan?.id ?? ""}
				disabled={flow.isPending}
				groupName={flow.groupName}
				onSelect={flow.handleSelectPlan}
			/>

			<ErrorAlert message={flow.errorMessage} />

			{flow.data && flow.selectedPlan ? (
				<Confirmation plan={flow.selectedPlan} subscription={flow.data} />
			) : null}

			<SubscribeActions
				isPending={flow.isPending}
				disabled={flow.isPending || !flow.selectedPlan}
				onSubscribe={flow.handleSubscribe}
			/>
		</PageContainer>
	)
}
