# Task 6: Frontend — Composição da Home Page + Responsividade [FR-001, FR-004, FR-005, FR-007, FR-008, FR-016, FR-017, FR-018]

**Status:** DONE
**PRD:** `../prd/prd-home-planos-contato.md`
**Spec:** `../specs/home-planos-contato-design.md`
**Depends on:** task-03, task-05

## Visão Geral

Modificar `apps/frontend/src/app/(public)/page.tsx` para:
1. Buscar planos via `fetch` com ISR (`next: { revalidate: 3600 }`) — RSC sem loading state visível.
2. Usar `DEMO_PLANS` do frontend como fallback quando o endpoint falha (try/catch).
3. Renderizar `<PlansSectionHero plans={plans} />` abaixo das features existentes.
4. Renderizar `<ContactSection />` abaixo dos planos.
5. Garantir responsividade global: sem scroll horizontal em viewport ≥ 320px; seções usam `max-w-xl` com padding horizontal via container pai.

O arquivo atual (`page.tsx`) já existe — será modificado preservando o hero e as feature cards existentes.

## Arquivos

- Modify: `apps/frontend/src/app/(public)/page.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: ao depurar erro de tipagem no fetch RSC, usar `as unknown as DemoPlan[]` com validação em runtime se necessário — nunca suprimir com `// @ts-ignore`
- `typescript-advanced`: `fetchPlans` tipada como `async function fetchPlans(): Promise<ReadonlyArray<DemoPlan>>`; `page.tsx` passa para `async function LandingPage()`
- `vercel-react-best-practices`: manter `page.tsx` como RSC puro (`async`); não adicionar `"use client"` — `ContactSection` encapsula o Client Component interno
- `vercel-composition-patterns`: `LandingPage` compõe `PlansSectionHero` e `ContactSection` como props-down — não faz nada além de buscar dados e compor
- `tailwindcss`: garantir que `max-w-6xl` no container pai e `max-w-xl` nas seções de planos/contato não causem overflow em mobile; testar com `w-screen overflow-x-auto` temporário se necessário

## Passos

### Step 1: Ler o arquivo atual antes de modificar

```bash
cat apps/frontend/src/app/\(public\)/page.tsx
```

Confirmar que o arquivo contém o hero e as feature cards existentes — estes serão preservados.

### Step 2: Escrever o novo conteúdo de `page.tsx`

**Modifique** `apps/frontend/src/app/(public)/page.tsx` para o seguinte conteúdo:

```tsx
import Link from "next/link"
import { ContactSection } from "@/features/contact/components/contact-section"
import { DEMO_PLANS, type DemoPlan } from "@/features/subscriptions/schemas"
import { PlansSectionHero } from "@/features/subscriptions/components/plans-section-hero"

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3333"

async function fetchPlans(): Promise<ReadonlyArray<DemoPlan>> {
  try {
    const res = await fetch(`${API_URL}/plans`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return DEMO_PLANS
    return (await res.json()) as ReadonlyArray<DemoPlan>
  } catch {
    return DEMO_PLANS
  }
}

export default async function LandingPage() {
  const plans = await fetchPlans()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:py-24">
      <section className="flex flex-col gap-10">
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
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
            className="rounded-md bg-accent px-6 py-3 text-base font-semibold text-accent-foreground"
          >
            Começar agora
          </Link>
          <Link
            href="/login"
            data-testid="cta-login"
            className="rounded-md border border-border px-6 py-3 text-base font-semibold text-foreground"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">
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
              Histórico de visitas
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Acompanhe sua frequência em tempo real.
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

### Step 3: Verificar tipos

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros de TypeScript. Se houver erro em `fetchPlans` sobre o tipo de retorno do `fetch`, verificar se `DemoPlan` está exportado corretamente de `@/features/subscriptions/schemas`.

### Step 4: Verificar lint

```bash
pnpm --filter frontend lint:fix
```

Esperado: zero issues do Biome.

### Step 5: Rodar os testes de unidade

```bash
pnpm --filter frontend test -- --run
```

Esperado: todos os testes passam (incluindo os de `PlanCardHero`, `PlanCardSecondary`, `ContactForm` e `useSendContact` criados nas tasks anteriores).

### Step 6: Rodar o build de produção

```bash
pnpm --filter frontend build
```

Esperado: build completo sem erros. Confirmar que `page.tsx` é gerada como página estática/ISR (deve aparecer como `○` ou `●` no output do build, não como `λ` dinâmico puro).

### Step 7: Verificação visual de responsividade (manual)

Suba o servidor de desenvolvimento:

```bash
pnpm --filter frontend dev
```

Abra `http://localhost:3000` no navegador e verifique:

1. **Desktop (≥ 768px):** seção de planos com `PlanCardHero` em cima e `PlanCardSecondary` embaixo; seção de contato com 2 colunas (info à esquerda, form à direita).
2. **Mobile (< 768px):** redimensione o navegador para 375px de largura — verificar que não há scroll horizontal, cards de planos empilhados, contato em coluna única.
3. **Viewport mínimo (320px):** redimensionar para 320px — sem scroll horizontal.

Se houver overflow horizontal em algum breakpoint, identificar o elemento causador com DevTools → "Elements" → selecionar elemento → verificar `overflow-x`.

### Step 8: Commit

```bash
git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd add \
  apps/frontend/src/app/\(public\)/page.tsx

git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd commit -m "feat(home): adiciona seções de planos e contato à home pública com RSC + ISR"
```

## Critérios de Sucesso

- `page.tsx` é `async` RSC que busca `GET /plans` com `revalidate: 3600` (FR-001, FR-004)
- Em caso de falha no fetch, usa `DEMO_PLANS` como fallback sem expor erro ao usuário (FR-005)
- Seção de planos renderizada abaixo das features existentes com CTA em `/cadastro` (FR-007)
- Seção de contato renderizada abaixo dos planos (FR-008)
- Sem scroll horizontal em viewport ≥ 320px (FR-018)
- Cards de planos em `flex-col` (empilhados em mobile) vindos do `PlansSectionHero` (FR-016)
- Contato em `md:grid-cols-2` (2 colunas em desktop, 1 em mobile) via `ContactSection` (FR-017)
- `pnpm --filter frontend tsc:check`, `lint:fix`, `test -- --run` e `build` passam sem erros
