# Task 2: Rebranding GymPass → VOLT (marca, metadados, internos) [RF-008, RF-009, RF-010]

**Status:** PENDING
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Substitui todas as referências de marca visíveis "GymPass" por "VOLT" e atualiza os metadados da página. A marca textual aparece em 5 pontos de runtime. O wordmark visual com o ícone de raio será introduzido como componente na Task 3; aqui trocamos o texto e os metadados, garantindo via teste que a marca antiga não aparece mais.

## Arquivos

- Modify: `apps/frontend/src/app/layout.tsx` (metadata title/description)
- Modify: `apps/frontend/src/components/layout/public-shell.tsx` (header linha ~26, footer linha ~50)
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx` (sidebar linha ~107, header mobile linha ~275)
- Test: `apps/frontend/src/components/layout/public-shell.test.tsx` (novo ou estendido)

### Conformidade com as Skills Padrão

- use code-style: preservar tipagens e estrutura existentes
- use test-antipatterns: asserir texto renderizado real, não implementação

## Passos

- [ ] **Step 1: Escrever o teste que falha (marca VOLT no public-shell)**

Crie `apps/frontend/src/components/layout/public-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PublicShell } from "./public-shell"

describe("PublicShell — marca VOLT", () => {
	test("exibe o wordmark VOLT no header", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		const marks = screen.getAllByText("VOLT")
		expect(marks.length).toBeGreaterThanOrEqual(1)
	})

	test("não exibe mais a marca antiga GymPass", () => {
		render(
			<PublicShell>
				<p>conteúdo</p>
			</PublicShell>,
		)
		expect(screen.queryByText(/GymPass/i)).not.toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "PublicShell — marca VOLT"`
Expected: FAIL — encontra "GymPass" e não encontra "VOLT".

- [ ] **Step 3: Atualizar metadados em `layout.tsx`**

Em `apps/frontend/src/app/layout.tsx`, substitua o bloco `metadata`:

```tsx
export const metadata: Metadata = {
	title: "VOLT — Plataforma de acesso a academias",
	description: "VOLT — treine onde você estiver. Acesso a academias e check-ins.",
}
```

- [ ] **Step 4: Atualizar a marca no `public-shell.tsx`**

No header, troque o texto do `<Link href="/">` de `GymPass` para `VOLT`:

```tsx
<Link
	href="/"
	aria-label="Página inicial VOLT"
	className="font-display text-xl font-semibold tracking-tight text-primary-foreground dark:text-card-foreground"
>
	VOLT
</Link>
```

No footer, troque a linha de copyright:

```tsx
<span>© {new Date().getFullYear()} VOLT</span>
```

- [ ] **Step 5: Atualizar a marca no `authenticated-shell.tsx`**

No `SidebarContent` (link `/inicio`), troque `GymPass` por `VOLT`:

```tsx
<Link
	href="/inicio"
	onClick={onNavigate}
	className="font-display text-lg font-semibold tracking-tight text-primary-foreground dark:text-card-foreground"
>
	VOLT
</Link>
```

No header mobile, troque `GymPass` por `VOLT`:

```tsx
<Link
	href="/inicio"
	className="ml-3 font-display text-lg font-semibold tracking-tight"
>
	VOLT
</Link>
```

- [ ] **Step 6: Atualizar comentário de aviso interno do Google provider (referência interna)**

Em `apps/frontend/src/app/providers.tsx`, troque o prefixo do warning para refletir a marca (referência interna em comentário/log):

```tsx
console.warn(
	"[VOLT][GoogleOAuthProvider] NEXT_PUBLIC_GOOGLE_CLIENT_ID não está definido. O login com Google estará desabilitado.",
)
```

- [ ] **Step 7: Garantir que nenhuma referência "GymPass" sobrou no runtime**

Run: `grep -rin "gympass" apps/frontend/src`
Expected: nenhum resultado (saída vazia).

- [ ] **Step 8: Rodar o teste, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "PublicShell — marca VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/app/layout.tsx apps/frontend/src/app/providers.tsx apps/frontend/src/components/layout/public-shell.tsx apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/public-shell.test.tsx
git commit -m "feat(volt-redesign): rebranding GymPass para VOLT em marca, metadados e internos"
```

## Critérios de Sucesso

- Toda referência visível "GymPass" substituída por "VOLT" [RF-008]
- Metadados (`title`/`description`) refletem VOLT [RF-009]
- Referências internas (warning do provider) renomeadas; workspace `frontend` intacto [RF-010]
- `grep -rin "gympass" apps/frontend/src` retorna vazio
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
