# Task 12: Redesign Assinatura (billing-banner, plan-grid) [RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila a tela de Assinatura (`/assinatura`) no vocabulário VOLT: `billing-banner` (plano ativo + próxima cobrança) e `plan-grid` de `plan-card`, com o plano atual em destaque (`plan-active`: ring accent + sombra). Preserva a lógica de seleção por radio group e a mutation `useCreateSubscription` (`DEMO_PLANS`, `useSubscriptionFlow`).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/assinatura/assinatura-volt.test.tsx` (novo)

### Conformidade com as Skills Padrão

- use code-style: tokens semânticos, preservar radio group acessível e handlers
- use test-antipatterns: asserir planos renderizados, mockar a mutation

## Passos

- [ ] **Step 1: Escrever o teste que falha (plan-grid VOLT)**

Crie `apps/frontend/src/app/(authenticated)/assinatura/assinatura-volt.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@/test/render"

vi.mock("@/features/subscriptions/api/use-create-subscription", () => ({
	useCreateSubscription: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

import SubscriptionPage from "./page"

describe("Assinatura VOLT", () => {
	test("exibe o banner de cobrança", () => {
		render(<SubscriptionPage />)
		expect(screen.getByTestId("billing-banner")).toBeInTheDocument()
	})

	test("renderiza a grade de planos", () => {
		render(<SubscriptionPage />)
		expect(screen.getByTestId("plan-grid")).toBeInTheDocument()
	})
})
```

> Ajuste o caminho/nome do mock à API real (`use-create-subscription`).

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "Assinatura VOLT"`
Expected: FAIL — faltam os testids `billing-banner`/`plan-grid`.

- [ ] **Step 3: Reconstruir o `billing-banner`**

Substitua o `DemoBanner` pelo banner VOLT (mantendo o texto/dados existentes):

```tsx
<div
	data-testid="billing-banner"
	className="mb-5 flex flex-wrap items-center justify-between gap-6 rounded-lg border border-border bg-card p-7 shadow-sm"
>
	<div>
		<p className="font-mono text-[10.5px] uppercase tracking-wider text-subtle">Plano atual</p>
		<p className="mt-1 font-display text-xl font-semibold">{currentPlanName}</p>
		<p className="text-sm text-muted-foreground">Próxima cobrança em {nextChargeLabel}</p>
	</div>
	<div className="flex flex-col items-end gap-2">
		<span className="text-[28px] font-bold leading-none tabular font-mono">{currentPlanPrice}</span>
	</div>
</div>
```

- [ ] **Step 4: Reconstruir o `plan-grid` / `plan-card`**

Envolva os planos numa grade responsiva com `data-testid="plan-grid"` e estilize cada `PlanCard` (preservando o `<label>`+radio `sr-only` selecionável). O plano ativo recebe ring accent:

```tsx
<div data-testid="plan-grid" className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-1">
	{DEMO_PLANS.map((plan) => {
		const active = plan.id === selectedPlanId
		return (
			<label
				key={plan.id}
				className={cn(
					"relative flex cursor-pointer flex-col rounded-lg border bg-card p-7 shadow-sm transition-colors",
					active ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]" : "border-border hover:border-border-strong",
				)}
			>
				<input type="radio" name="plan" value={plan.id} className="sr-only" checked={active} onChange={() => selectPlan(plan.id)} />
				{active && (
					<span className="absolute right-[18px] top-[18px] rounded-full bg-accent px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
						Plano atual
					</span>
				)}
				<p className="mb-3.5 font-display text-lg font-bold">{plan.name}</p>
				<div className="flex items-baseline gap-1.5">
					<span className="text-lg font-semibold text-muted-foreground">R$</span>
					<span className="text-[42px] font-bold leading-none tracking-tight tabular font-mono">{plan.price}</span>
					<span className="text-[15px] text-subtle">/mês</span>
				</div>
				<ul className="mt-5 flex flex-1 flex-col gap-3">
					{plan.features.map((feat) => (
						<li key={feat} className="flex items-center gap-2.5 text-sm text-muted-foreground">
							<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
								<Check className="h-3 w-3" aria-hidden="true" />
							</span>
							{feat}
						</li>
					))}
				</ul>
			</label>
		)
	})}
</div>
```

Adicione os imports `import { Check } from "lucide-react"` e `import { cn } from "@/lib/cn"`. Ajuste os campos de `plan` (`price`, `features`, `name`, `id`) ao shape real de `DEMO_PLANS`.

- [ ] **Step 5: Restilar `SubscribeActions`/`Confirmation`/`ErrorAlert`**

Botão de assinar: `className="h-11 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-primary-strong disabled:opacity-60"`. `ErrorAlert` usa `bg-destructive-soft text-destructive` com `role="alert"`. Preserve os handlers e estados de `useSubscriptionFlow`.

- [ ] **Step 6: Rodar o teste, suíte, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "Assinatura VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend test && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/assinatura/page.tsx" "apps/frontend/src/app/(authenticated)/assinatura/assinatura-volt.test.tsx"
git commit -m "feat(volt-redesign): assinatura com billing-banner e plan-grid VOLT"
```

## Critérios de Sucesso

- `billing-banner` com plano ativo e próxima cobrança [RF-020]
- `plan-grid` com 3 planos; plano atual com ring accent
- Seleção por radio group e mutation preservadas
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
