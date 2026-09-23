# Task 10: Frontend: tela /assinatura com plano vigente, troca e cancelamento [FR-007, FR-010, FR-011, FR-015, FR-019]

**Status:** DONE

**PRD:** `../prd/prd-subscription-plan-link.md`

**Spec:** `../specs/subscription-plan-link-design.md`

**Tier:** capable

**Depends on:** task-09

## Visão Geral

A tela `/assinatura` deixa de guardar o plano só em estado local: ela consulta a assinatura vigente, pré-seleciona e marca "Plano atual" no plano contratado, mostra período e cancelamento agendado com dados reais (no lugar do texto fixo "30 dias"), oferece "Trocar plano" e "Cancelar assinatura" para quem tem assinatura e mantém o fluxo atual de assinar para quem não tem ou teve a assinatura vencida. Assinaturas legadas sem plano aparecem como "plano não identificado", com troca e cancelamento disponíveis, e um 409 na troca recarrega a assinatura.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/assinatura-volt.test.tsx`

## Interfaces

- **Consome:** de task-09: `useMySubscription(): UseQueryResult<MySubscription | null, ApiError>` e `type MySubscription` (`{ id: string; state: "active" | "cancel_scheduled" | "expired"; plan: { id: string; name: string; priceId: string } | null; currentPeriodStart: string; currentPeriodEnd: string; cancelAtPeriodEnd: boolean }`) de `@/features/subscriptions/api/use-my-subscription`; `useChangePlan(): UseMutationResult<MySubscription, ApiError, { priceId: string }>` de `@/features/subscriptions/api/use-change-plan` (`mutateAsync({ priceId })`, `isPending`, `error`, `reset`); `useCancelSubscription(): UseMutationResult<MySubscription, ApiError, void>` de `@/features/subscriptions/api/use-cancel-subscription` (`mutateAsync()`, `isPending`, `error`, `reset`); `MY_SUBSCRIPTION_QUERY_KEY` de `use-my-subscription`. Já existentes: `useCreateSubscription`, `usePlans`, `Plan` (`id`, `name`, `priceId`, `priceLabel`, `tagline`, `features`), `ApiError` (`status`, `userMessage`), `DEMO_PAYMENT_METHOD_ID`. Handlers MSW padrão de `GET /subscriptions/me` (200 `null`), `PATCH /subscriptions/me/plan` e `POST /subscriptions/me/cancel` (task-09).
- **Produz:** N/A (a página é folha; nenhuma task depende dela). Contrato visual e testids da tela: `billing-banner`, `subscription-plan-${plan.id}` (com `data-selected` e o texto "Plano atual" só no plano vigente), `subscription-submit` ("Assinar plano demo", sem assinatura ativa), `subscription-change-plan` ("Trocar plano"), `subscription-cancel` ("Cancelar assinatura"), `subscription-cancellation-notice` (cancelamento agendado), `subscription-error` (`role="alert"`).

### Conformidade com as Skills Padrão

- `no-workarounds`: estado desatualizado (409/404) é tratado recarregando a assinatura via invalidação do hook, sem estado paralelo na tela.
- `test-antipatterns`: testes com RTL e MSW exercitam a tela por comportamento (papéis, textos, requisições reais), sem mockar os hooks novos no teste principal.
- `tanstack-query-best-practices`: a tela consome as queries/mutations dos hooks; `isLoading` só na primeira carga para não desmontar a tela em refetch.
- `vercel-react-best-practices`: estado derivado calculado no render (sem `useEffect` para sincronizar), componentes pequenos e sem estado duplicado.
- `wcag-audit-patterns`: botões nativos com nome acessível, `aria-busy` durante ação, `role="alert"` nos erros e `role="status"` no aviso de cancelamento agendado; tudo operável por teclado.
- `shadcn`: reutiliza `Button` (variantes `default` e `outline`), `EmptyState` e `Skeleton` existentes.
- `tailwindcss`: mesmas classes utilitárias e tokens da tela atual.

## Passos

- **Step 1: Confirm the runner form and read the frontend rules**

Confirme a forma estreita do runner: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"` deve coletar exatamente 1 arquivo (o script `test` do pacote roda todos os ~188 arquivos e não serve para isso). Leia `apps/frontend/AGENTS.md` (188 linhas) antes de editar a página. Confirme que `Button` aceita `variant="outline"` (`EmptyState` já o usa na própria página) e que `@/features/subscriptions/api/use-my-subscription` exporta `useMySubscription` e `MySubscription` (task-09).

- **Step 2: Write the failing test (comportamento da página)**

Acrescente ao final de `apps/frontend/src/app/(authenticated)/assinatura/page.test.tsx`:

```tsx
const PLAN_ANUAL = { id: "plan-anual", name: "Premium Anual", priceId: "price_demo_yearly" }
const PLAN_MENSAL = { id: "plan-mensal", name: "Premium Mensal", priceId: "price_demo_monthly" }

function makeSubscription(overrides: Record<string, unknown> = {}) {
	return {
		id: "sub-1",
		state: "active",
		plan: PLAN_ANUAL,
		currentPeriodStart: "2026-10-15T12:00:00.000Z",
		currentPeriodEnd: "2026-11-15T12:00:00.000Z",
		cancelAtPeriodEnd: false,
		...overrides,
	}
}

function serveSubscription(initial: Record<string, unknown> | null) {
	const state = { current: initial, getCalls: 0 }
	server.use(
		http.get(`${apiBaseUrl}/subscriptions/me`, () => {
			state.getCalls += 1
			return HttpResponse.json(state.current)
		}),
	)
	return state
}

describe("SubscriptionPage com assinatura", () => {
	beforeEach(() => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
	})

	it("pré-seleciona o plano vigente e marca Plano atual só nele", async () => {
		serveSubscription(makeSubscription())
		renderWithProviders(<SubscriptionPage />)

		const annual = await screen.findByTestId("subscription-plan-plan-anual")
		const monthly = screen.getByTestId("subscription-plan-plan-mensal")

		expect(annual).toHaveAttribute("data-selected", "true")
		expect(monthly).toHaveAttribute("data-selected", "false")
		expect(within(annual).getByText("Plano atual")).toBeInTheDocument()
		expect(within(monthly).queryByText("Plano atual")).not.toBeInTheDocument()
	})

	it("mostra dados reais no banner, sem o texto fixo de 30 dias", async () => {
		serveSubscription(makeSubscription())
		renderWithProviders(<SubscriptionPage />)

		const banner = await screen.findByTestId("billing-banner")

		expect(banner).toHaveTextContent("Premium Anual")
		expect(banner).toHaveTextContent("R$ 479,00/ano")
		expect(banner).toHaveTextContent("15/11/2026")
		expect(banner).not.toHaveTextContent(/30 dias/)
	})

	it("oferece Trocar plano no lugar de Assinar e só habilita com outro plano selecionado", async () => {
		serveSubscription(makeSubscription())
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		const change = await screen.findByRole("button", { name: "Trocar plano" })

		expect(
			screen.queryByRole("button", { name: /assinar plano demo/i }),
		).not.toBeInTheDocument()
		expect(change).toBeDisabled()

		await user.click(screen.getByTestId("subscription-plan-plan-mensal"))

		expect(screen.getByRole("button", { name: "Trocar plano" })).toBeEnabled()
	})

	it("troca de plano enviando o priceId escolhido e passa a marcar o novo plano como atual", async () => {
		const state = serveSubscription(makeSubscription())
		let received: { priceId: string } | null = null
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, async ({ request }) => {
				received = (await request.json()) as { priceId: string }
				state.current = makeSubscription({ plan: PLAN_MENSAL })
				return HttpResponse.json(state.current)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-plan-plan-mensal"))
		await user.click(screen.getByRole("button", { name: "Trocar plano" }))

		await waitFor(() => {
			expect(received).toEqual({ priceId: "price_demo_monthly" })
		})
		const monthly = screen.getByTestId("subscription-plan-plan-mensal")
		await waitFor(() => {
			expect(within(monthly).getByText("Plano atual")).toBeInTheDocument()
		})
		expect(
			within(screen.getByTestId("subscription-plan-plan-anual")).queryByText(
				"Plano atual",
			),
		).not.toBeInTheDocument()
	})

	it("cancela ao fim do período, mostra a data de fim e deixa de oferecer a troca", async () => {
		const state = serveSubscription(makeSubscription())
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () => {
				state.current = makeSubscription({
					state: "cancel_scheduled",
					cancelAtPeriodEnd: true,
				})
				return HttpResponse.json(state.current)
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(
			await screen.findByRole("button", { name: "Cancelar assinatura" }),
		)

		const notice = await screen.findByTestId("subscription-cancellation-notice")
		expect(notice).toHaveTextContent("15/11/2026")
		expect(screen.getByTestId("billing-banner")).toHaveTextContent(
			/cancelamento agendado/i,
		)
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Cancelar assinatura" }),
		).not.toBeInTheDocument()
	})

	it("com cancelamento já agendado ao abrir, mostra a data de fim e não oferece troca", async () => {
		serveSubscription(
			makeSubscription({ state: "cancel_scheduled", cancelAtPeriodEnd: true }),
		)
		renderWithProviders(<SubscriptionPage />)

		const notice = await screen.findByTestId("subscription-cancellation-notice")

		expect(notice).toHaveTextContent("15/11/2026")
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
	})

	it("em 409 na troca mostra o motivo e recarrega a assinatura para o estado real", async () => {
		const state = serveSubscription(makeSubscription())
		server.use(
			http.patch(`${apiBaseUrl}/subscriptions/me/plan`, () => {
				state.current = makeSubscription({
					state: "cancel_scheduled",
					cancelAtPeriodEnd: true,
				})
				return HttpResponse.json({ message: "conflict" }, { status: 409 })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-plan-plan-mensal"))
		await user.click(screen.getByRole("button", { name: "Trocar plano" }))

		const alert = await screen.findByTestId("subscription-error")
		expect(alert).toHaveTextContent(/cancelamento/i)
		expect(alert.textContent ?? "").not.toMatch(/409|conflict/i)
		await screen.findByTestId("subscription-cancellation-notice")
		expect(state.getCalls).toBeGreaterThanOrEqual(2)
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
	})

	it("mostra plano não identificado para assinatura legada e oferece trocar e cancelar", async () => {
		serveSubscription(makeSubscription({ plan: null }))
		renderWithProviders(<SubscriptionPage />)

		const banner = await screen.findByTestId("billing-banner")

		expect(banner).toHaveTextContent(/plano não identificado/i)
		expect(screen.getByRole("button", { name: "Trocar plano" })).toBeEnabled()
		expect(
			screen.getByRole("button", { name: "Cancelar assinatura" }),
		).toBeEnabled()
	})

	it("em 404 no cancelamento mostra a mensagem e volta ao fluxo de assinar", async () => {
		const state = serveSubscription(makeSubscription())
		server.use(
			http.post(`${apiBaseUrl}/subscriptions/me/cancel`, () => {
				state.current = null
				return HttpResponse.json({ message: "no active" }, { status: 404 })
			}),
		)
		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(
			await screen.findByRole("button", { name: "Cancelar assinatura" }),
		)

		const alert = await screen.findByTestId("subscription-error")
		expect(alert).toHaveTextContent("Você não possui assinatura ativa")
		expect(
			await screen.findByRole("button", { name: /assinar plano demo/i }),
		).toBeInTheDocument()
	})

	it("com assinatura vencida mantém o fluxo de assinar, sem pré-seleção nem Plano atual", async () => {
		serveSubscription(
			makeSubscription({ state: "expired", cancelAtPeriodEnd: true }),
		)
		renderWithProviders(<SubscriptionPage />)

		const submit = await screen.findByRole("button", {
			name: /assinar plano demo/i,
		})

		expect(submit).toBeEnabled()
		expect(
			screen.queryByRole("button", { name: "Trocar plano" }),
		).not.toBeInTheDocument()
		expect(screen.queryByText("Plano atual", { selector: "span" })).toBeNull()
		expect(screen.getByTestId("subscription-plan-plan-mensal")).toHaveAttribute(
			"data-selected",
			"true",
		)
	})
})
```

Atualize `assinatura-volt.test.tsx`: adicione, abaixo dos `vi.mock` existentes, um mock que preserva o módulo real e sobrescreve só a consulta (a página passa a depender de `useMySubscription`; sem o mock ela ficaria em loading no primeiro render síncrono dos testes existentes):

```tsx
vi.mock("@/features/subscriptions/api/use-my-subscription", async (importOriginal) => ({
	...(await importOriginal<
		typeof import("@/features/subscriptions/api/use-my-subscription")
	>()),
	useMySubscription: () => ({
		data: null,
		isLoading: false,
		isError: false,
		error: null,
		refetch: vi.fn(),
	}),
}))
```

- **Step 3: Run tests to verify they fail**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/assinatura/page.test.tsx" "src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"`
Expected: FAIL: os testes novos de assinatura falham (por exemplo o plano anual não vem com `data-selected="true"`, não existe o botão "Trocar plano" nem `subscription-cancellation-notice`); os 4 testes antigos de `page.test.tsx` e os 2 de `assinatura-volt.test.tsx` continuam passando.

- **Step 4: Write minimal implementation**

Substitua `apps/frontend/src/app/(authenticated)/assinatura/page.tsx` por:

```tsx
"use client"

import { AlertTriangle, BadgeCheck, Check } from "lucide-react"
import { useId, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
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

interface BillingSummary {
	label: string
	name: string
	priceLabel: string
	note: string | null
}

function describeBilling(
	subscription: MySubscription | null,
	plans: ReadonlyArray<Plan>,
	selectedPlan: Plan | undefined,
): BillingSummary {
	if (!subscription) {
		return {
			label: "Plano selecionado",
			name: selectedPlan?.name ?? "Nenhum plano selecionado",
			priceLabel: selectedPlan?.priceLabel ?? "—",
			note: null,
		}
	}
	const catalogPlan = subscription.plan
		? plans.find((plan) => plan.id === subscription.plan?.id)
		: undefined
	const end = formatDay(subscription.currentPeriodEnd)
	return {
		label: "Plano atual",
		name: subscription.plan?.name ?? "Plano não identificado",
		priceLabel: catalogPlan?.priceLabel ?? "—",
		note:
			subscription.state === "cancel_scheduled"
				? `Cancelamento agendado. Acesso até ${end}`
				: `Próxima cobrança em ${end}`,
	}
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
				className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-primary-strong disabled:opacity-60"
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
					className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-primary-strong disabled:opacity-60"
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
	handleSelectPlan: (plan: Plan) => void
	handleSubscribe: () => Promise<void>
	handleChangePlan: () => Promise<void>
	handleCancel: () => Promise<void>
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

	async function handleCancel() {
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
		handleSelectPlan,
		handleSubscribe,
		handleChangePlan,
		handleCancel,
	}
}

interface SubscriptionPageContentProps {
	plans: ReadonlyArray<Plan>
	subscription: MySubscription | null
}

function SubscriptionPageContent({
	plans,
	subscription,
}: SubscriptionPageContentProps) {
	const flow = useSubscriptionFlow(plans, subscription)
	const canChange =
		flow.selectedPlan !== undefined &&
		flow.selectedPlan.id !== flow.currentPlanId

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

			{flow.mode === "subscribe" ? (
				<SubscribeActions
					isPending={flow.pendingAction === "create"}
					disabled={flow.isPending || !flow.selectedPlan}
					onSubscribe={flow.handleSubscribe}
				/>
			) : null}

			{flow.mode === "manage" ? (
				<ManageActions
					pendingAction={flow.pendingAction}
					disabled={flow.isPending}
					canChange={canChange}
					onChange={flow.handleChangePlan}
					onCancel={flow.handleCancel}
				/>
			) : null}

			{flow.mode === "cancel-scheduled" && subscription ? (
				<CancellationNotice endDate={formatDay(subscription.currentPeriodEnd)} />
			) : null}
		</PageContainer>
	)
}

function activeSubscriptionOf(
	subscription: MySubscription | null | undefined,
): MySubscription | null {
	if (!subscription || subscription.state === "expired") return null
	return subscription
}

export default function SubscriptionPage() {
	const plansQuery = usePlans()
	const subscriptionQuery = useMySubscription()

	if (plansQuery.isLoading || subscriptionQuery.isLoading) {
		return (
			<PageContainer as="section" width="default">
				<Skeleton className="h-10 w-2/3" />
				<Skeleton className="h-64 w-full" />
			</PageContainer>
		)
	}

	if (plansQuery.isError || !plansQuery.data) {
		return (
			<PageContainer as="section" width="default">
				<EmptyState
					title="Não foi possível carregar os planos"
					description={plansQuery.error?.userMessage ?? "Tente novamente."}
					action={
						<Button variant="outline" onClick={() => plansQuery.refetch()}>
							Tentar novamente
						</Button>
					}
				/>
			</PageContainer>
		)
	}

	if (subscriptionQuery.isError) {
		return (
			<PageContainer as="section" width="default">
				<EmptyState
					title="Não foi possível carregar sua assinatura"
					description={
						subscriptionQuery.error?.userMessage ?? "Tente novamente."
					}
					action={
						<Button
							variant="outline"
							onClick={() => subscriptionQuery.refetch()}
						>
							Tentar novamente
						</Button>
					}
				/>
			</PageContainer>
		)
	}

	return (
		<SubscriptionPageContent
			plans={plansQuery.data}
			subscription={activeSubscriptionOf(subscriptionQuery.data)}
		/>
	)
}
```

- **Step 5: Run tests to verify they pass**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/assinatura/page.test.tsx" "src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"`
Expected: PASS, 2 arquivos: os 4 testes antigos de `page.test.tsx`, os 10 novos e os 2 de `assinatura-volt.test.tsx`.

- **Step 6: Commit** *(only when `workflow.auto_commit` is true; otherwise skip and report the files)*

```bash
git add "apps/frontend/src/app/(authenticated)/assinatura"
git commit -m "feat(frontend): show current plan, change plan and cancel on the subscription page"
```

## Critérios de Sucesso

- Com assinatura vigente, o plano contratado abre pré-selecionado e é o único com o selo "Plano atual"; sem assinatura ou com assinatura vencida, o fluxo de assinar continua como hoje (FR-007).
- Com assinatura ativa a tela mostra "Trocar plano" no lugar de "Assinar plano demo" (FR-011) e "Cancelar assinatura"; a troca envia o `priceId` do plano escolhido.
- Com cancelamento agendado a tela mostra a data de fim (dia, fuso do navegador) no banner e no aviso e não oferece troca (FR-010, FR-015); um 409 na troca mostra o motivo em português e recarrega a assinatura.
- Assinatura legada sem plano mostra "plano não identificado" com trocar e cancelar disponíveis (FR-019).
- O banner não usa mais o texto fixo "Próxima cobrança em 30 dias"; usa o fim real do período.
