# Task 2: Migrar telas tier `wide` (Dashboard, Academias, Admin Usuários) [RF-011, RF-014, RF-016]

**Status:** DONE
**PRD:** `../prd/prd-content-width-standardization.md`
**Spec:** `../specs/content-width-standardization-design.md`
**Depends on:** task-01

## Visão Geral

Migrar as 3 telas data-dense para o tier `wide` usando `PageContainer`. Remove `mx-auto`, `max-w-*` ad-hoc e o padding horizontal/vertical duplicado (`px-* py-*`) dos wrappers — a borda esquerda passa a ser a do shell (`px-8`) e o conteúdo preenche o frame.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/inicio/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- use skill `tailwindcss`: remoção de classes utilitárias redundantes.
- use skill `test-antipatterns`: ao corrigir testes quebrados, asserir comportamento (heading/`data-testid`), não estrutura interna removida.

## Passos

- **Step 1: Dashboard — envolver `DashboardPage` em `PageContainer width="wide"`**

Substituir TODO o conteúdo de `apps/frontend/src/app/(authenticated)/inicio/page.tsx`:

De:

```tsx
import { DashboardPage } from "@/features/dashboard/components/dashboard-page"

export default function InicioDashboardPage() {
	return <DashboardPage />
}
```

Para:

```tsx
import { PageContainer } from "@/components/layout/page-container"
import { DashboardPage } from "@/features/dashboard/components/dashboard-page"

export default function InicioDashboardPage() {
	return (
		<PageContainer width="wide">
			<DashboardPage />
		</PageContainer>
	)
}
```

- **Step 2: Academias — trocar o wrapper `<section>` por `PageContainer width="wide"`**

Em `apps/frontend/src/app/(authenticated)/academias/page.tsx`, adicionar o import no topo (junto aos demais imports):

```tsx
import { PageContainer } from "@/components/layout/page-container"
```

Substituir a abertura do wrapper (atualmente em ~L45–48):

De:

```tsx
		<section
			aria-labelledby="academias-title"
			className="mx-auto flex w-full max-w-6xl flex-col px-4 py-10 sm:px-6"
		>
```

Para:

```tsx
		<PageContainer
			as="section"
			width="wide"
			aria-labelledby="academias-title"
			className="gap-0"
		>
```

> `className="gap-0"` preserva o espaçamento original (este wrapper não usava `gap`).

E substituir a tag de fechamento correspondente `</section>` por `</PageContainer>` (é a `</section>` que fecha esse wrapper raiz do retorno do componente).

- **Step 3: Admin Usuários — trocar o wrapper `<section>` por `PageContainer width="wide"`**

Em `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, adicionar o import:

```tsx
import { PageContainer } from "@/components/layout/page-container"
```

Substituir a abertura do wrapper (atualmente em ~L323–326):

De:

```tsx
		<section
			data-testid="admin-users-page"
			className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
```

Para:

```tsx
		<PageContainer
			as="section"
			width="wide"
			data-testid="admin-users-page"
		>
```

> `gap-8` é o padrão do `PageContainer`, então não precisa ser repassado. `data-testid="admin-users-page"` é preservado.

E substituir a `</section>` correspondente por `</PageContainer>`.

- **Step 4: Rodar os testes das telas migradas**

Run: `pnpm --filter frontend test src/app/\(authenticated\)/academias/page.test.tsx src/app/\(authenticated\)/admin/usuarios/page.test.tsx`
Expected: PASS.

> Se algum teste falhar por asserir o wrapper removido (ex: classe `max-w-6xl` ou um `<section>` específico), atualizar a asserção para usar o heading da página (`getByRole("heading", ...)`) ou o `data-testid` preservado (`admin-users-page`). Não reintroduzir `max-w-*` no código de produção.

- **Step 5: Rodar lint + type-check + build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero issues; zero erros de tipo.

- **Step 6: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/inicio/page.tsx apps/frontend/src/app/\(authenticated\)/academias/page.tsx apps/frontend/src/app/\(authenticated\)/admin/usuarios/page.tsx
git commit -m "refactor(frontend): migrate wide-tier pages to PageContainer"
```

## Critérios de Sucesso

- Dashboard, Academias e Admin Usuários usam `PageContainer width="wide"` (RF-011).
- Nenhum dos 3 wrappers raiz contém `mx-auto`, `max-w-*` ou `px-*/py-*` ad-hoc (RF-014, RF-016).
- Atributos preservados: `aria-labelledby="academias-title"`, `data-testid="admin-users-page"`.
- Testes das telas, lint e tsc passando.
