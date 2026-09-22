# Task 12: Frontend — remover `DEMO_PLANS` e conectar `/assinatura` e a home a `GET /plans` [FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-08, task-09

## Visão Geral

`GET /plans` já retorna dados reais do banco (task-08), preservando o contrato `{ id, name,
priceId, priceLabel, tagline, features[] }[]`. Esta task remove a última fonte de planos
hardcoded do frontend (`DemoPlan`/`DEMO_PLANS` em `features/subscriptions/schemas/index.ts`) e
conecta `/assinatura` (autenticada) e a home pública a essa rota (FR-010, FR-011). O fluxo de
`useCreateSubscription`/`DEMO_PAYMENT_METHOD_ID` **não muda** — só a origem do array de planos
passa de um literal para a API. `PlansSectionHero` trocava o plano em destaque por um filtro
acoplado ao slug fixo `"premium-anual"`; como planos agora são cadastráveis pelo admin (tasks
4-11), esse filtro é substituído por um critério que não depende de nenhum id fixo — o plano de
maior preço (ordenação desc por `priceLabel`), o mesmo comportamento visual de hoje (o anual
sempre custava mais que o mensal) sem depender do slug.

## Arquivos

- Create: `apps/frontend/src/features/subscriptions/api/use-plans.ts` *(sem teste dedicado —
  coberto indiretamente por `assinatura/page.test.tsx`, que exercita loading/erro/sucesso de
  `usePlans` através da página)*
- Modify: `apps/frontend/src/features/subscriptions/schemas/index.ts`
- Modify: `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx`
- Modify: `apps/frontend/src/features/subscriptions/components/plan-card-hero.test.tsx`
- Modify: `apps/frontend/src/features/subscriptions/components/plan-card-secondary.tsx`
- Modify: `apps/frontend/src/features/subscriptions/components/plan-card-secondary.test.tsx`
- Modify: `apps/frontend/src/features/subscriptions/components/plans-section-hero.tsx`
- Create: `apps/frontend/src/features/subscriptions/components/plans-section-hero.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/assinatura-volt.test.tsx`
- Modify: `apps/frontend/src/app/(public)/page.tsx`
- Modify: `apps/frontend/src/app/(public)/page.test.tsx`

## Interfaces

- **Consome:** `GET /plans` retornando `{ id, name, priceId, priceLabel, tagline, features[] }[]`
  a partir do banco (task-08); handler MSW permanente `GET /plans` (task-09,
  `test/msw/handlers.ts`); `api` de `@/lib/api`, `ApiError`/`mapStatusToMessage` de
  `@/lib/errors` (padrão já usado em `features/gyms/api/index.ts`).
- **Produz:** `type Plan = paths["/plans"]["get"]["responses"][200]["content"]
  ["application/json"][number]`, `usePlans(): UseQueryResult<Plan[], ApiError>`
  (`apps/frontend/src/features/subscriptions/api/use-plans.ts`) — usado tanto por
  `/assinatura` (client-side) quanto reexportado como tipo para a home (RSC, que continua
  buscando via `fetch` direto, não via TanStack Query).

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: novo hook `usePlans` para `/assinatura`.
- `vercel-react-best-practices`: estados de loading/erro na página `/assinatura` antes inexistentes
  (dados eram síncronos); RSC da home mantém fetch direto sem client-side waterfall.

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/frontend/src/features/subscriptions/components/plans-section-hero.test.tsx — não existia
// teste dedicado para este componente antes desta task
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { PlansSectionHero } from "./plans-section-hero"

const PLAN_A: Plan = {
	id: "plan-recem-criado",
	name: "Plano A",
	priceId: "price_a",
	priceLabel: "R$ 30,00/mês",
	tagline: "Tagline A.",
	features: ["Feature A"],
}

const PLAN_B: Plan = {
	id: "plan-mais-caro",
	name: "Plano B",
	priceId: "price_b",
	priceLabel: "R$ 300,00/ano",
	tagline: "Tagline B.",
	features: ["Feature B"],
}

describe("PlansSectionHero", () => {
	test("destaca o plano de maior preço, mesmo sendo o primeiro id na lista (não depende de slug fixo)", () => {
		render(<PlansSectionHero plans={[PLAN_A, PLAN_B]} />)

		expect(screen.getByTestId(`plan-card-hero-${PLAN_B.id}`)).toBeInTheDocument()
		expect(
			screen.getByTestId(`plan-card-secondary-${PLAN_A.id}`),
		).toBeInTheDocument()
	})

	test("retorna null quando a lista de planos está vazia", () => {
		const { container } = render(<PlansSectionHero plans={[]} />)

		expect(container).toBeEmptyDOMElement()
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/subscriptions/components/plans-section-hero.test.tsx`
Expected: FAIL — `Cannot find module '@/features/subscriptions/api/use-plans'`; mesmo assumindo o
tipo `Plan` existente, o teste falha porque `PlansSectionHero` ainda usa `p.id === "premium-anual"`
para escolher o destaque — com os ids `plan-recem-criado`/`plan-mais-caro` da massa de teste, o
destaque seria `plans[0]` (`PLAN_A`), não o de maior preço (`PLAN_B`)

- **Step 2: Write minimal implementation**

```typescript
// apps/frontend/src/features/subscriptions/api/use-plans.ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type Plan =
	paths["/plans"]["get"]["responses"][200]["content"]["application/json"][number]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
	if (error instanceof ApiError) return error
	const message =
		error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
	return new ApiError(fallbackStatus, "network_error", message)
}

export const PLANS_QUERY_KEY = ["plans"] as const

async function fetchPlans(): Promise<Plan[]> {
	const { data, error } = await api.GET("/plans")
	if (error || !data) throw toApiError(error)
	return data
}

export function usePlans(): UseQueryResult<Plan[], ApiError> {
	return useQuery<Plan[], ApiError>({
		queryKey: PLANS_QUERY_KEY,
		queryFn: fetchPlans,
	})
}
```

```typescript
// apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx — arquivo inteiro
import { Check } from "lucide-react"
import Link from "next/link"
import type { Plan } from "@/features/subscriptions/api/use-plans"

interface PlanCardHeroProps {
	plan: Plan
	badgeLabel?: string
}

export function PlanCardHero({
	plan,
	badgeLabel = "Melhor valor",
}: PlanCardHeroProps) {
	return (
		<div
			data-testid={`plan-card-hero-${plan.id}`}
			className="relative overflow-hidden rounded-[22px] border border-accent/20 bg-card p-8 sm:p-10"
		>
			<div
				aria-hidden
				className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl"
			/>
			<span className="mb-4 inline-block rounded-full bg-accent px-3 py-1 font-display text-xs font-black uppercase tracking-widest text-accent-foreground">
				{badgeLabel}
			</span>
			<h3 className="mb-1 font-display text-xl font-bold text-foreground">
				{plan.name}
			</h3>
			<p className="mb-1 font-display text-3xl font-bold text-foreground">
				{plan.priceLabel}
			</p>
			<p className="mb-6 text-sm text-muted-foreground">{plan.tagline}</p>
			<ul className="mb-8 flex flex-col gap-3" aria-label="Benefícios do plano">
				{plan.features.map((feature) => (
					<li
						key={feature}
						className="flex items-center gap-2.5 text-sm text-muted-foreground"
					>
						<span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20">
							<Check className="h-3 w-3 text-success" aria-hidden />
						</span>
						{feature}
					</li>
				))}
			</ul>
			<Link
				href="/cadastro"
				className="block w-full rounded-md bg-accent py-3 text-center font-display text-sm font-bold text-accent-foreground transition-colors hover:bg-primary-strong"
			>
				Assinar agora
			</Link>
		</div>
	)
}
```

```typescript
// apps/frontend/src/features/subscriptions/components/plan-card-secondary.tsx — arquivo inteiro
import Link from "next/link"
import type { Plan } from "@/features/subscriptions/api/use-plans"

interface PlanCardSecondaryProps {
	plan: Plan
}

export function PlanCardSecondary({ plan }: PlanCardSecondaryProps) {
	return (
		<div
			data-testid={`plan-card-secondary-${plan.id}`}
			className="flex items-center justify-between gap-4 rounded-[14px] border border-border bg-card px-6 py-5"
		>
			<div className="min-w-0">
				<p className="font-display text-sm font-semibold text-foreground">
					{plan.name}
				</p>
				<p className="font-display text-xl font-bold text-foreground">
					{plan.priceLabel}
				</p>
				<p className="text-xs text-muted-foreground">{plan.tagline}</p>
			</div>
			<Link
				href="/cadastro"
				className="shrink-0 rounded-md border border-border px-5 py-2.5 font-display text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
			>
				Assinar
			</Link>
		</div>
	)
}
```

```typescript
// apps/frontend/src/features/subscriptions/components/plans-section-hero.tsx — arquivo inteiro
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { PlanCardHero } from "./plan-card-hero"
import { PlanCardSecondary } from "./plan-card-secondary"

interface PlansSectionHeroProps {
	plans: ReadonlyArray<Plan>
}

function parsePriceLabelToCents(priceLabel: string): number {
	const match = priceLabel.match(/[\d.,]+/)
	if (!match) return 0
	const normalized = match[0].replace(/\./g, "").replace(",", ".")
	return Math.round(Number.parseFloat(normalized) * 100)
}

export function PlansSectionHero({ plans }: PlansSectionHeroProps) {
	// Destaque = maior preço da lista (ordenação desc), sem depender de um id
	// fixo como "premium-anual" — planos agora são cadastráveis pelo admin.
	const featuredPlan = [...plans].sort(
		(a, b) =>
			parsePriceLabelToCents(b.priceLabel) - parsePriceLabelToCents(a.priceLabel),
	)[0]
	if (!featuredPlan) return null
	const otherPlans = plans.filter((plan) => plan.id !== featuredPlan.id)
	return (
		<section
			aria-labelledby="plans-heading"
			className="mx-auto w-full max-w-xl"
		>
			<h2
				id="plans-heading"
				className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground"
			>
				Escolha seu plano
			</h2>
			<p className="mb-8 text-base text-muted-foreground">
				Acesso a centenas de academias em todo o Brasil.
			</p>
			<div className="flex flex-col gap-4">
				<PlanCardHero plan={featuredPlan} />
				{otherPlans.map((plan) => (
					<PlanCardSecondary key={plan.id} plan={plan} />
				))}
			</div>
		</section>
	)
}
```

```typescript
// apps/frontend/src/features/subscriptions/components/plan-card-hero.test.tsx — trocar apenas o import e o tipo da massa de teste
import type { Plan } from "@/features/subscriptions/api/use-plans"
// ...
const planAnual: Plan = {
	id: "premium-anual",
	name: "Premium Anual",
	priceId: "price_demo_yearly",
	priceLabel: "R$ 479,00/ano",
	tagline: "20% de economia comparado ao plano mensal.",
	features: [
		"Check-ins ilimitados",
		"Histórico completo",
		"Suporte prioritário",
	],
}
// resto do arquivo inalterado
```

```typescript
// apps/frontend/src/features/subscriptions/components/plan-card-secondary.test.tsx — trocar apenas o import e o tipo da massa de teste
import type { Plan } from "@/features/subscriptions/api/use-plans"
// ...
const planMensal: Plan = {
	id: "premium-mensal",
	name: "Premium Mensal",
	priceId: "price_demo_monthly",
	priceLabel: "R$ 49,90/mês",
	tagline: "Sem fidelidade",
	features: ["Check-ins ilimitados"],
}
// resto do arquivo inalterado
```

Run (from `apps/frontend`): `npx vitest run src/features/subscriptions/components/plans-section-hero.test.tsx src/features/subscriptions/components/plan-card-hero.test.tsx src/features/subscriptions/components/plan-card-secondary.test.tsx`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apps/frontend/src/app/(public)/page.test.tsx — arquivo inteiro
import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { SERVER_API_URL } from "@/lib/server-api-url"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import LandingPage from "./page"

const apiBaseUrl = SERVER_API_URL

const STUB_PLANS: Plan[] = [
	{
		id: "plan-mensal",
		name: "Premium Mensal",
		priceId: "price_demo_monthly",
		priceLabel: "R$ 49,90/mês",
		tagline: "Tagline mensal.",
		features: ["Check-ins ilimitados"],
	},
	{
		id: "plan-anual",
		name: "Premium Anual",
		priceId: "price_demo_yearly",
		priceLabel: "R$ 479,00/ano",
		tagline: "Tagline anual.",
		features: ["Tudo do mensal"],
	},
]

describe("Landing pública (RSC)", () => {
	test("renderiza CTAs de cadastro e login", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
		renderWithProviders(await LandingPage())
		const signup = screen.getByTestId("cta-signup")
		const login = screen.getByTestId("cta-login")
		expect(signup).toHaveAttribute("href", "/cadastro")
		expect(login).toHaveAttribute("href", "/login")
	})

	test("renderiza título principal e descrição", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
		renderWithProviders(await LandingPage())
		expect(
			screen.getByRole("heading", { level: 1, name: /acesso a academias/i }),
		).toBeInTheDocument()
		expect(screen.getByText(/encontre academias próximas/i)).toBeInTheDocument()
	})

	test("quando GET /plans falha, a seção de planos não é renderizada (sem fallback local)", async () => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)
		renderWithProviders(await LandingPage())
		expect(screen.queryByText("Escolha seu plano")).not.toBeInTheDocument()
	})
})
```

Run (from `apps/frontend`): `npx vitest run "src/app/(public)/page.test.tsx"`
Expected: FAIL — `LandingPage` ainda importa `DEMO_PLANS` de `@/features/subscriptions/schemas`
e usa esse array como fallback; o teste de falha da API espera nenhuma seção de planos, mas a
implementação atual renderiza "Escolha seu plano" com o fallback estático

- **Step 4: Write minimal implementation**

```tsx
// apps/frontend/src/app/(public)/page.tsx — arquivo inteiro
import Link from "next/link"

import { ContactSection } from "@/features/contact/components/contact-section"
import type { Plan } from "@/features/subscriptions/api/use-plans"
import { PlansSectionHero } from "@/features/subscriptions/components/plans-section-hero"
import { SERVER_API_URL } from "@/lib/server-api-url"

async function fetchPlans(): Promise<ReadonlyArray<Plan>> {
	try {
		const res = await fetch(`${SERVER_API_URL}/plans`, {
			next: { revalidate: 3600 },
		})
		if (!res.ok) return []
		return (await res.json()) as ReadonlyArray<Plan>
	} catch {
		return []
	}
}

/**
 * Landing pública — RSC. Apresenta o produto e direciona para
 * cadastro/login. Sem dependência do auth-store (cliente).
 */
export default async function LandingPage() {
	const plans = await fetchPlans()

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:py-24">
			<section
				aria-labelledby="hero-title"
				className="flex flex-col items-start gap-8"
			>
				<span className="rounded-full border border-border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
					Demo monocromática
				</span>
				<h1
					id="hero-title"
					className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl"
				>
					Acesso a academias,
					<br />
					sem fricção.
				</h1>
				<p className="max-w-2xl text-lg text-muted-foreground">
					Encontre academias próximas, faça check-in e acompanhe sua frequência
					em uma interface despida do supérfluo. Inspirado em Ollama: puro,
					silencioso, focado.
				</p>
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
					<Link
						href="/cadastro"
						data-testid="cta-signup"
						className="inline-flex items-center justify-center rounded-md border border-primary bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
					>
						Criar conta
					</Link>
					<Link
						href="/login"
						data-testid="cta-login"
						className="inline-flex items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-base font-medium text-card-foreground hover:bg-accent hover:text-accent-foreground"
					>
						Entrar
					</Link>
				</div>
			</section>

			<section aria-labelledby="features-title" className="flex flex-col gap-8">
				<h2
					id="features-title"
					className="font-display text-3xl font-medium tracking-tight text-foreground"
				>
					Pensado para o essencial.
				</h2>
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<li className="rounded-[12px] border border-border bg-card p-6">
						<h3 className="font-display text-xl font-medium text-foreground">
							Check-in em segundos
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Encontre a academia, confirme presença, siga seu treino.
						</p>
					</li>
					<li className="rounded-[12px] border border-border bg-card p-6">
						<h3 className="font-display text-xl font-medium text-foreground">
							Histórico transparente
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Veja sua frequência, métricas e evolução em um único lugar.
						</p>
					</li>
					<li className="rounded-[12px] border border-border bg-card p-6">
						<h3 className="font-display text-xl font-medium text-foreground">
							Administração simples
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Operadores validam check-ins e cadastram academias rapidamente.
						</p>
					</li>
				</ul>
			</section>

			<PlansSectionHero plans={plans} />

			<ContactSection />
		</div>
	)
}
```

Run (from `apps/frontend`): `npx vitest run "src/app/(public)/page.test.tsx"`
Expected: PASS

- **Step 5: Write the failing test**

```typescript
// apps/frontend/src/app/(authenticated)/assinatura/page.test.tsx — arquivo inteiro
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import SubscriptionPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const STUB_PLANS = [
	{
		id: "plan-mensal",
		name: "Premium Mensal",
		priceId: "price_demo_monthly",
		priceLabel: "R$ 49,90/mês",
		tagline: "Tagline mensal.",
		features: ["Check-ins ilimitados"],
	},
	{
		id: "plan-anual",
		name: "Premium Anual",
		priceId: "price_demo_yearly",
		priceLabel: "R$ 479,00/ano",
		tagline: "Tagline anual.",
		features: ["Tudo do mensal"],
	},
]

describe("SubscriptionPage", () => {
	beforeEach(() => {
		server.use(
			http.get(`${apiBaseUrl}/plans`, () => HttpResponse.json(STUB_PLANS)),
		)
	})

	it("exibe aviso de demonstração visível sem interação", async () => {
		renderWithProviders(<SubscriptionPage />)

		const banners = await screen.findAllByTestId("subscription-demo-banner")
		expect(banners.length).toBeGreaterThan(0)
		for (const banner of banners) {
			expect(within(banner).getByText(/sem cobrança real/i)).toBeInTheDocument()
		}
	})

	it("envia priceId do plano selecionado e exibe confirmação com id retornado", async () => {
		const captured: {
			body: { priceId: string; paymentMethodId: string } | null
		} = { body: null }
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, async ({ request }) => {
				captured.body = (await request.json()) as {
					priceId: string
					paymentMethodId: string
				}
				return HttpResponse.json(
					{ subscriptionId: "sub_demo_xyz", status: "active" },
					{ status: 201 },
				)
			}),
		)

		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-plan-plan-anual"))
		await user.click(screen.getByTestId("subscription-submit"))

		await waitFor(() => {
			expect(captured.body?.priceId).toBe("price_demo_yearly")
		})
		expect(captured.body?.paymentMethodId).toBe("pm_demo_card_visa")

		const confirmation = await screen.findByTestId("subscription-confirmation")
		expect(
			within(confirmation).getByTestId("subscription-confirmation-id"),
		).toHaveTextContent("sub_demo_xyz")
		expect(
			within(confirmation).getByTestId("subscription-confirmation-status"),
		).toHaveTextContent("active")
	})

	it("mostra estado de loading no botão durante a chamada", async () => {
		const resolveRef: { fn: (() => void) | null } = { fn: null }
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, async () => {
				await new Promise<void>((resolve) => {
					resolveRef.fn = resolve
				})
				return HttpResponse.json(
					{ subscriptionId: "sub_demo_loading", status: "active" },
					{ status: 201 },
				)
			}),
		)

		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-submit"))

		const button = screen.getByTestId("subscription-submit")
		await waitFor(() => {
			expect(button).toBeDisabled()
			expect(button).toHaveTextContent(/processando/i)
			expect(button).toHaveAttribute("aria-busy", "true")
		})

		resolveRef.fn?.()
		await screen.findByTestId("subscription-confirmation")
	})

	it("exibe mensagem amigável quando o backend falha", async () => {
		server.use(
			http.post(`${apiBaseUrl}/subscriptions`, () =>
				HttpResponse.json({ message: "boom" }, { status: 500 }),
			),
		)

		const user = userEvent.setup()
		renderWithProviders(<SubscriptionPage />)

		await user.click(await screen.findByTestId("subscription-submit"))

		const alert = await screen.findByTestId("subscription-error")
		expect(alert.textContent).toMatch(/erro interno|tente novamente/i)
		expect(alert.textContent ?? "").not.toMatch(/500|stack/i)
	})
})
```

Run (from `apps/frontend`): `npx vitest run "src/app/(authenticated)/assinatura/page.test.tsx"`
Expected: FAIL — `SubscriptionPage` ainda usa `DEMO_PLANS` de forma síncrona, não busca `/plans`;
`subscription-plan-plan-anual` não existe (o testid atual é `subscription-plan-premium-anual`, de
`DEMO_PLANS`), então `findByTestId` estoura timeout

- **Step 6: Write minimal implementation**

```tsx
// apps/frontend/src/app/(authenticated)/assinatura/page.tsx — arquivo inteiro
"use client"

import { AlertTriangle, BadgeCheck, Check } from "lucide-react"
import { useId, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useCreateSubscription } from "@/features/subscriptions/api/use-create-subscription"
import { type Plan, usePlans } from "@/features/subscriptions/api/use-plans"
import {
	type CreateSubscriptionResponse,
	DEMO_PAYMENT_METHOD_ID,
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
	plan: Plan | undefined
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
	plan: Plan
	selected: boolean
	disabled: boolean
	onSelect: (plan: Plan) => void
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
	disabled: boolean
	groupName: string
	onSelect: (plan: Plan) => void
}

function PlansList({
	plans,
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
			{plans.map((plan) => (
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
	selectedPlan: Plan | undefined
	selectedPlanId: string
	isPending: boolean
	errorMessage: string | null
	data: ReturnType<typeof useCreateSubscription>["data"]
	handleSelectPlan: (plan: Plan) => void
	handleSubscribe: () => Promise<void>
}

function useSubscriptionFlow(plans: ReadonlyArray<Plan>): UseSubscriptionFlow {
	const groupName = useId()
	const [selectedPlanId, setSelectedPlanId] = useState<string>(
		plans[0]?.id ?? "",
	)
	const { mutateAsync, isPending, error, data, reset } = useCreateSubscription()
	const selectedPlan =
		plans.find((plan) => plan.id === selectedPlanId) ?? plans[0]

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

	function handleSelectPlan(plan: Plan) {
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

interface SubscriptionPageContentProps {
	plans: ReadonlyArray<Plan>
}

function SubscriptionPageContent({ plans }: SubscriptionPageContentProps) {
	const flow = useSubscriptionFlow(plans)

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
				plans={plans}
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

export default function SubscriptionPage() {
	const plansQuery = usePlans()

	if (plansQuery.isLoading) {
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
					description={
						plansQuery.error?.userMessage ?? "Tente novamente."
					}
					action={
						<Button variant="outline" onClick={() => plansQuery.refetch()}>
							Tentar novamente
						</Button>
					}
				/>
			</PageContainer>
		)
	}

	return <SubscriptionPageContent plans={plansQuery.data} />
}
```

`assinatura-volt.test.tsx` renders `<SubscriptionPage />` directly and asserts `billing-banner`/
`plan-grid` are present **synchronously** — it already mocks `useCreateSubscription` but not
`usePlans`, so with the rewrite above it would render the loading skeleton (no `usePlans` mock ⇒
real MSW round-trip) instead of the content. Update it to mock `usePlans` the same way it already
mocks `useCreateSubscription`, so the page renders its loaded content on the first render:

```typescript
// apps/frontend/src/app/(authenticated)/assinatura/assinatura-volt.test.tsx — arquivo inteiro
import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("@/features/subscriptions/api/use-create-subscription", () => ({
	useCreateSubscription: () => ({
		mutateAsync: vi.fn(),
		isPending: false,
		error: null,
		data: undefined,
		reset: vi.fn(),
	}),
}))

vi.mock("@/features/subscriptions/api/use-plans", () => ({
	usePlans: () => ({
		data: [
			{
				id: "plan-mensal",
				name: "Premium Mensal",
				priceId: "price_demo_monthly",
				priceLabel: "R$ 49,90/mês",
				tagline: "Tagline mensal.",
				features: ["Check-ins ilimitados"],
			},
		],
		isLoading: false,
		isError: false,
		error: null,
		refetch: vi.fn(),
	}),
}))

import SubscriptionPage from "./page"

describe("Assinatura VOLT", () => {
	test("exibe o banner de cobranca", () => {
		renderWithProviders(<SubscriptionPage />)
		expect(screen.getByTestId("billing-banner")).toBeInTheDocument()
	})

	test("renderiza a grade de planos", () => {
		renderWithProviders(<SubscriptionPage />)
		expect(screen.getByTestId("plan-grid")).toBeInTheDocument()
	})
})
```

Run (from `apps/frontend`): `npx vitest run "src/app/(authenticated)/assinatura/page.test.tsx"`
Expected: PASS

Run (from `apps/frontend`): `npx vitest run "src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"`
Expected: PASS

- **Step 7: Write minimal implementation** *(remoção final de `DemoPlan`/`DEMO_PLANS` — sem teste
  dedicado; nenhum arquivo do frontend importa mais esses símbolos depois dos Steps 1-6)*

```typescript
// apps/frontend/src/features/subscriptions/schemas/index.ts — arquivo inteiro
import { z } from "zod"

export const createSubscriptionSchema = z.object({
	priceId: z.string().min(1, "Selecione um plano."),
	paymentMethodId: z.string().min(1, "Informe um método de pagamento."),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

export const createSubscriptionResponseSchema = z.object({
	subscriptionId: z.string().min(1),
	status: z.string().min(1),
})

export type CreateSubscriptionResponse = z.infer<
	typeof createSubscriptionResponseSchema
>

export const DEMO_PAYMENT_METHOD_ID = "pm_demo_card_visa" as const
```

- **Step 8: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/frontend/src/features/subscriptions/api/use-plans.ts \
  apps/frontend/src/features/subscriptions/schemas/index.ts \
  apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx \
  apps/frontend/src/features/subscriptions/components/plan-card-hero.test.tsx \
  apps/frontend/src/features/subscriptions/components/plan-card-secondary.tsx \
  apps/frontend/src/features/subscriptions/components/plan-card-secondary.test.tsx \
  apps/frontend/src/features/subscriptions/components/plans-section-hero.tsx \
  apps/frontend/src/features/subscriptions/components/plans-section-hero.test.tsx \
  apps/frontend/src/app/\(authenticated\)/assinatura/page.tsx \
  apps/frontend/src/app/\(authenticated\)/assinatura/page.test.tsx \
  apps/frontend/src/app/\(authenticated\)/assinatura/assinatura-volt.test.tsx \
  apps/frontend/src/app/\(public\)/page.tsx \
  apps/frontend/src/app/\(public\)/page.test.tsx
git commit -m "refactor(subscriptions): connect /assinatura and home to GET /plans, remove DEMO_PLANS"
```

## Critérios de Sucesso

- Nenhum arquivo do frontend importa `DemoPlan`/`DEMO_PLANS` — ambos deixam de existir em
  `features/subscriptions/schemas/index.ts` (FR-010, FR-011).
- `/assinatura` busca planos via `GET /plans` (loading/erro tratados antes do formulário) e
  preserva o fluxo de `useCreateSubscription` inalterado (`priceId`/`DEMO_PAYMENT_METHOD_ID`).
- A home (`(public)/page.tsx`) busca planos via `fetch` direto a `GET /plans`; em falha, retorna
  lista vazia — sem duplicar dados de planos localmente.
- `PlansSectionHero` escolhe o plano em destaque pelo maior preço da lista recebida, nunca por um
  id fixo como `"premium-anual"`.
