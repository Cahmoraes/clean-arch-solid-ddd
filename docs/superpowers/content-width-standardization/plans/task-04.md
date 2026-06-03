# Task 4: Migrar telas tier `narrow` (Cadastrar academia, Trocar senha) [RF-013, RF-014]

**Status:** PENDING
**PRD:** `../prd/prd-content-width-standardization.md`
**Spec:** `../specs/content-width-standardization-design.md`
**Depends on:** task-01

## Visão Geral

Migrar as telas de formulário para o tier `narrow` (`max-w-2xl` = 672px), alinhadas à esquerda. `Cadastrar academia` já usava `max-w-2xl` (mesma largura — só remove `mx-auto`/padding duplicado). `Trocar senha` tem 3 ramos de renderização (estados loading/erro/form), todos com o mesmo wrapper `max-w-md` → passam a `narrow`.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx`

### Conformidade com as Skills Padrão

- use skill `tailwindcss`: remoção de classes redundantes.
- use skill `test-antipatterns`: ajustar testes via heading/`data-testid`, não via `max-w-*` removido.

## Passos

Em CADA arquivo, adicionar o import no topo:

```tsx
import { PageContainer } from "@/components/layout/page-container"
```

- **Step 1: Cadastrar academia** — `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`

De (abertura ~L65–68):

```tsx
		<section
			aria-labelledby="nova-academia-title"
			className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
```

Para:

```tsx
		<PageContainer as="section" width="narrow" aria-labelledby="nova-academia-title">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 2: Trocar senha — ramo 1** — `apps/frontend/src/app/(authenticated)/perfil/senha/page.tsx` (~L244)

De:

```tsx
		<section className="mx-auto flex w-full max-w-md flex-col gap-8">
```

Para:

```tsx
		<PageContainer as="section" width="narrow">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 3: Trocar senha — ramo 2** — mesmo arquivo (~L269)

De:

```tsx
		<section className="mx-auto flex w-full max-w-md flex-col gap-8">
```

Para:

```tsx
		<PageContainer as="section" width="narrow">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

- **Step 4: Trocar senha — ramo 3** — mesmo arquivo (~L314)

De:

```tsx
		<section className="mx-auto flex w-full max-w-md flex-col gap-8">
```

Para:

```tsx
		<PageContainer as="section" width="narrow">
```

Trocar a `</section>` correspondente por `</PageContainer>`.

> Os 3 ramos têm wrapper idêntico; substitua cada `<section ...>`/`</section>` raiz de cada ramo de retorno. Confirme com `grep -n "max-w-md" apps/frontend/src/app/\(authenticated\)/perfil/senha/page.tsx` → deve retornar **zero** ocorrências após a edição.

- **Step 5: Rodar os testes das telas migradas**

Run: `pnpm --filter frontend test src/app/\(authenticated\)/admin/academias/nova src/app/\(authenticated\)/perfil/senha`
Expected: PASS.

> Se algum teste asserir `max-w-md`/`max-w-2xl` ou o `<section>` removido, atualizar para o heading ou `getByTestId("page-container")`. Não reintroduzir `max-w-*` no código de produção.

- **Step 6: Rodar lint + type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero issues; zero erros de tipo.

- **Step 7: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/admin/academias/nova/page.tsx apps/frontend/src/app/\(authenticated\)/perfil/senha/page.tsx
git commit -m "refactor(frontend): migrate narrow-tier form pages to PageContainer"
```

## Critérios de Sucesso

- Cadastrar academia e os 3 ramos de Trocar senha usam `PageContainer width="narrow"` (RF-013).
- Nenhum wrapper raiz contém `mx-auto`, `max-w-*` ou `px-*/py-*` ad-hoc (RF-014); `grep max-w-md` e `grep max-w-2xl` nos arquivos retornam zero.
- `aria-labelledby="nova-academia-title"` preservado.
- Testes das telas, lint e tsc passando.
