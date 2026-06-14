# Task 3: Frontend — Componentes de Planos (`PlanCardHero`, `PlanCardSecondary`, `PlansSectionHero`) [FR-002, FR-003, FR-006, FR-007, FR-016]

**Status:** DONE
**PRD:** `../prd/prd-home-planos-contato.md`
**Spec:** `../specs/home-planos-contato-design.md`
**Depends on:** task-01

## Visão Geral

Criar três componentes RSC para a seção de planos da home pública: `PlanCardHero` (card em destaque com badge "Melhor valor", preço, features e CTA primário), `PlanCardSecondary` (card compacto em linha com CTA outline) e `PlansSectionHero` (orquestrador que recebe `DemoPlan[]` e renderiza os dois cards). Esses componentes são independentes da tela interna `/assinatura`.

O tipo `DemoPlan` vem de `@/features/subscriptions/schemas` — já existente no frontend. Os componentes usam o design system do projeto: Tailwind v4 com tokens semânticos (`bg-card`, `border-border`, `text-foreground`, `bg-accent`, `text-success`, `rounded-[22px]` etc.) e fontes `font-display` (Space Grotesk) e `font-sans` (Inter).

## Arquivos

- Create: `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx`
- Create: `apps/frontend/src/features/subscriptions/components/plan-card-secondary.tsx`
- Create: `apps/frontend/src/features/subscriptions/components/plans-section-hero.tsx`
- Create: `apps/frontend/src/features/subscriptions/components/plan-card-hero.test.tsx`
- Create: `apps/frontend/src/features/subscriptions/components/plan-card-secondary.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: ao depurar problema de tipagem com `DemoPlan`, verificar o import de `@/features/subscriptions/schemas` antes de criar tipos duplicados
- `typescript-advanced`: props tipadas com interfaces explícitas; `ReadonlyArray<DemoPlan>` em `PlansSectionHero`
- `vercel-react-best-practices`: componentes RSC puros (sem `"use client"`, sem hooks); `data-testid` em elementos raiz
- `vercel-composition-patterns`: `PlansSectionHero` recebe `plans` como prop — não faz fetch interno
- `tailwindcss`: usar tokens semânticos do projeto (`bg-card`, `border-border`, `text-accent`, `text-success`, `font-display`, `rounded-[22px]` etc.) — não cores hexadecimais hardcoded
- `shadcn`: usar `cn()` de `@/lib/cn` para classes condicionais
- `super.verification-before-completion`: rodar `pnpm --filter frontend tsc:check`, `pnpm --filter frontend lint:fix` e `pnpm --filter frontend test -- --run` antes de marcar DONE

## Passos

### Step 1: Escrever testes de `PlanCardHero` (falha primeiro)

**Crie** `apps/frontend/src/features/subscriptions/components/plan-card-hero.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { DemoPlan } from "@/features/subscriptions/schemas"
import { PlanCardHero } from "./plan-card-hero"

const planAnual: DemoPlan = {
  id: "premium-anual",
  name: "Premium Anual",
  priceId: "price_demo_yearly",
  priceLabel: "R$ 479,00/ano",
  tagline: "20% de economia comparado ao plano mensal.",
  features: ["Check-ins ilimitados", "Histórico completo", "Suporte prioritário"],
}

describe("PlanCardHero", () => {
  test("exibe nome, preço e tagline do plano", () => {
    render(<PlanCardHero plan={planAnual} />)

    expect(screen.getByText("Premium Anual")).toBeInTheDocument()
    expect(screen.getByText("R$ 479,00/ano")).toBeInTheDocument()
    expect(screen.getByText("20% de economia comparado ao plano mensal.")).toBeInTheDocument()
  })

  test("exibe todas as features com ícone de check", () => {
    render(<PlanCardHero plan={planAnual} />)

    for (const feature of planAnual.features) {
      expect(screen.getByText(feature)).toBeInTheDocument()
    }
  })

  test("exibe badge padrão 'Melhor valor'", () => {
    render(<PlanCardHero plan={planAnual} />)
    expect(screen.getByText("Melhor valor")).toBeInTheDocument()
  })

  test("exibe badge customizado quando badgeLabel é passado", () => {
    render(<PlanCardHero plan={planAnual} badgeLabel="Recomendado" />)
    expect(screen.getByText("Recomendado")).toBeInTheDocument()
  })

  test("CTA aponta para /cadastro", () => {
    render(<PlanCardHero plan={planAnual} />)
    const link = screen.getByRole("link", { name: /assinar agora/i })
    expect(link).toHaveAttribute("href", "/cadastro")
  })
})
```

### Step 2: Rodar teste e confirmar que falha

```bash
pnpm --filter frontend test -- --run plan-card-hero
```

Esperado: FAIL — "Cannot find module './plan-card-hero'".

### Step 3: Criar `PlanCardHero`

**Crie** `apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx`:

```tsx
import { Check } from "lucide-react"
import Link from "next/link"
import type { DemoPlan } from "@/features/subscriptions/schemas"

interface PlanCardHeroProps {
  plan: DemoPlan
  badgeLabel?: string
}

export function PlanCardHero({ plan, badgeLabel = "Melhor valor" }: PlanCardHeroProps) {
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

### Step 4: Rodar o teste de `PlanCardHero` e confirmar que passa

```bash
pnpm --filter frontend test -- --run plan-card-hero
```

Esperado: PASS — todos os 5 testes passam.

### Step 5: Escrever testes de `PlanCardSecondary` (falha primeiro)

**Crie** `apps/frontend/src/features/subscriptions/components/plan-card-secondary.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { DemoPlan } from "@/features/subscriptions/schemas"
import { PlanCardSecondary } from "./plan-card-secondary"

const planMensal: DemoPlan = {
  id: "premium-mensal",
  name: "Premium Mensal",
  priceId: "price_demo_monthly",
  priceLabel: "R$ 49,90/mês",
  tagline: "Sem fidelidade",
  features: ["Check-ins ilimitados"],
}

describe("PlanCardSecondary", () => {
  test("exibe nome e preço do plano", () => {
    render(<PlanCardSecondary plan={planMensal} />)

    expect(screen.getByText("Premium Mensal")).toBeInTheDocument()
    expect(screen.getByText("R$ 49,90/mês")).toBeInTheDocument()
  })

  test("exibe tagline do plano", () => {
    render(<PlanCardSecondary plan={planMensal} />)
    expect(screen.getByText("Sem fidelidade")).toBeInTheDocument()
  })

  test("CTA aponta para /cadastro", () => {
    render(<PlanCardSecondary plan={planMensal} />)
    const link = screen.getByRole("link", { name: /assinar/i })
    expect(link).toHaveAttribute("href", "/cadastro")
  })
})
```

### Step 6: Rodar teste e confirmar que falha

```bash
pnpm --filter frontend test -- --run plan-card-secondary
```

Esperado: FAIL — "Cannot find module './plan-card-secondary'".

### Step 7: Criar `PlanCardSecondary`

**Crie** `apps/frontend/src/features/subscriptions/components/plan-card-secondary.tsx`:

```tsx
import Link from "next/link"
import type { DemoPlan } from "@/features/subscriptions/schemas"

interface PlanCardSecondaryProps {
  plan: DemoPlan
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

### Step 8: Rodar o teste de `PlanCardSecondary` e confirmar que passa

```bash
pnpm --filter frontend test -- --run plan-card-secondary
```

Esperado: PASS — todos os 3 testes passam.

### Step 9: Criar `PlansSectionHero`

Não há testes separados para `PlansSectionHero` — é um componente de composição simples testado implicitamente pela home (task-06). **Crie** `apps/frontend/src/features/subscriptions/components/plans-section-hero.tsx`:

```tsx
import type { DemoPlan } from "@/features/subscriptions/schemas"
import { PlanCardHero } from "./plan-card-hero"
import { PlanCardSecondary } from "./plan-card-secondary"

interface PlansSectionHeroProps {
  plans: ReadonlyArray<DemoPlan>
}

export function PlansSectionHero({ plans }: PlansSectionHeroProps) {
  const featuredPlan = plans.find((p) => p.id === "premium-anual") ?? plans[0]
  const otherPlans = plans.filter((p) => p.id !== featuredPlan?.id)

  if (!featuredPlan) return null

  return (
    <section aria-labelledby="plans-heading" className="mx-auto w-full max-w-xl">
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

### Step 10: Verificar lint e tipos

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero issues.

### Step 11: Commit

```bash
git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd add \
  apps/frontend/src/features/subscriptions/components/plan-card-hero.tsx \
  apps/frontend/src/features/subscriptions/components/plan-card-hero.test.tsx \
  apps/frontend/src/features/subscriptions/components/plan-card-secondary.tsx \
  apps/frontend/src/features/subscriptions/components/plan-card-secondary.test.tsx \
  apps/frontend/src/features/subscriptions/components/plans-section-hero.tsx

git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd commit -m "feat(home): adiciona componentes PlanCardHero, PlanCardSecondary e PlansSectionHero"
```

## Critérios de Sucesso

- `PlanCardHero` exibe badge "Melhor valor" (padrão), nome, preço, tagline, features com check e CTA `href="/cadastro"` (FR-002, FR-006, FR-007)
- `PlanCardSecondary` exibe nome, preço, tagline e CTA outline `href="/cadastro"` (FR-003, FR-006, FR-007)
- `PlansSectionHero` renderiza plano anual como hero e demais como secundários; retorna `null` se `plans` for vazio
- Layout usa `flex-col gap-4` — empilhado verticalmente no mobile por padrão (FR-016)
- `pnpm --filter frontend lint:fix` e `tsc:check` passam sem erros
- Todos os testes passam
