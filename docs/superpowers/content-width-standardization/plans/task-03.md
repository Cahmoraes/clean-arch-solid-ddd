# Task 3: Migrar telas tier `default` (Check-ins, Admin Check-ins, Perfil, Perfil público, Assinatura, Detalhe academia) [RF-012, RF-014, RF-016]

**Status:** PENDING
**PRD:** `../prd/prd-content-width-standardization.md`
**Spec:** `../specs/content-width-standardization-design.md`
**Depends on:** task-01

## Visão Geral

Migrar as 6 telas de lista/detalhe para o tier `default` (`max-w-4xl` = 896px). Remove `mx-auto`, `max-w-*` ad-hoc e padding duplicado. Duas telas usam `<main>` próprio (Perfil e Perfil público) — ao trocar por `PageContainer` (que renderiza `<div>` por padrão) corrige-se o landmark `<main>` aninhado (o shell já provê o `<main>`).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/[userId]/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`

### Conformidade com as Skills Padrão

- use skill `tailwindcss`: remoção de classes redundantes.
- use skill `test-antipatterns`: ao ajustar testes, asserir via heading/`data-testid`, não via `<main>`/`max-w-*` removidos.

## Passos

Em CADA arquivo, adicionar o import no topo (junto aos demais imports):

```tsx
import { PageContainer } from "@/components/layout/page-container"
```

- **Step 1: Check-ins (membro)** — `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`

De (abertura ~L159–162):

```tsx
		<section
			aria-labelledby="checkins-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
```

Para:

```tsx
		<PageContainer as="section" width="default" aria-labelledby="checkins-title">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 2: Admin Check-ins** — `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`

De (abertura ~L145–148):

```tsx
		<section
			aria-label="Check-ins"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
```

Para:

```tsx
		<PageContainer as="section" width="default" aria-label="Check-ins">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 3: Perfil** — `apps/frontend/src/app/(authenticated)/perfil/page.tsx`

De (~L338):

```tsx
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
```

Para:

```tsx
		<PageContainer width="default" className="gap-6">
```

> `className="gap-6"` preserva o `gap-6` original (sobrescreve o `gap-8` padrão). O `<main>` vira `<div>` (default), removendo o landmark aninhado.

Trocar a `</main>` correspondente por `</PageContainer>`.

- **Step 4: Perfil público** — `apps/frontend/src/app/(authenticated)/perfil/[userId]/page.tsx`

De (~L132):

```tsx
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
```

Para:

```tsx
		<PageContainer width="default">
```

> `gap-8` é o padrão; `max-w-4xl` é exatamente o tier `default`. O `<main>` vira `<div>`.

Trocar a `</main>` correspondente por `</PageContainer>`.

- **Step 5: Assinatura** — `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`

De (~L328):

```tsx
		<section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
```

Para:

```tsx
		<PageContainer as="section" width="default">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 6: Detalhe de academia** — `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`

De (abertura ~L200–203):

```tsx
		<section
			aria-labelledby="gym-detail-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
```

Para:

```tsx
		<PageContainer as="section" width="default" aria-labelledby="gym-detail-title">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 7: Rodar os testes das telas migradas**

Run: `pnpm --filter frontend test src/app/\(authenticated\)/check-ins src/app/\(authenticated\)/admin/check-ins src/app/\(authenticated\)/perfil src/app/\(authenticated\)/assinatura src/app/\(authenticated\)/academias`
Expected: PASS.

> Atenção a testes de Perfil/Perfil público que possam asserir `getByRole("main")` — após a migração não há `<main>` no render isolado da página (o `<main>` é do shell). Atualizar essas asserções para usar o heading da página (`getByRole("heading", { name: ... })`) ou `getByTestId("page-container")`. Não reintroduzir `<main>` nem `max-w-*` no código de produção.

- **Step 8: Rodar lint + type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero issues; zero erros de tipo.

- **Step 9: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/check-ins/page.tsx apps/frontend/src/app/\(authenticated\)/admin/check-ins/page.tsx apps/frontend/src/app/\(authenticated\)/perfil/page.tsx apps/frontend/src/app/\(authenticated\)/perfil/\[userId\]/page.tsx apps/frontend/src/app/\(authenticated\)/assinatura/page.tsx apps/frontend/src/app/\(authenticated\)/academias/\[id\]/page.tsx
git commit -m "refactor(frontend): migrate default-tier pages to PageContainer"
```

## Critérios de Sucesso

- As 6 telas usam `PageContainer width="default"` (RF-012).
- Nenhum wrapper raiz contém `mx-auto`, `max-w-*` ou `px-*/py-*` ad-hoc (RF-014, RF-016).
- `gap-6` preservado em Perfil; `aria-labelledby`/`aria-label` preservados onde existiam.
- `<main>` aninhado eliminado em Perfil e Perfil público.
- Testes das telas, lint e tsc passando.
