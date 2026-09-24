# Task 7: Scanlines de CRT e caret de terminal [FR-009, FR-010, FR-011, FR-016]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-01, task-04

## Visão Geral

Esta task adiciona a textura de scanlines de CRT (linhas horizontais estáticas atrás do conteúdo, só no tema escuro) às quatro superfícies de destaque — PixelScene, hero do dashboard, cards de KPI e sidebar — e o caret em bloco ciano nos campos de texto. Uma guarda automatizada garante que `crt-scanlines` não vaze para nenhuma outra superfície.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/src/components/ui/pixel-scene.tsx`
- Modify: `apps/frontend/src/components/ui/stat-card.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/kpi-cards.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/app/globals-tokens.test.tsx`
- Create: `apps/frontend/src/test/crt-scanlines-scope.test.ts`

## Interfaces

- **Consome:** `--color-accent` (ciano) já existente em `globals.css` (não produzido por nenhuma task desta feature); `@utility focus-ring-duplo` e o bloco `@supports (corner-shape: bevel)` da task-01 (não alterados, só coexistem no mesmo arquivo); classes de tipografia `font-display` já aplicadas em `StatCard` pela task-04 (o valor e o badge delta do `StatCard` continuam como a task-04 deixou; esta task só adiciona a prop `className` ao componente, sem tocar tipografia).
- **Produz:** utilitário `@utility crt-scanlines` e regra `.dark .crt-scanlines::before` em `globals.css`; regras `input, textarea { caret-color: ... }` e `@supports (caret-shape: block) { input, textarea { caret-shape: block; } }` em `@layer base`; prop `className?: string` em `StatCard` (repassada ao root via `cn`), consumida por `kpi-cards.tsx` para aplicar `className="crt-scanlines"`. Nenhuma task posterior depende destes símbolos.

### Skills a invocar

- `tailwindcss`: escrever o utilitário `@utility crt-scanlines` e a integração com `@custom-variant dark` já existente no arquivo.
- `wcag-audit-patterns`: confirmar que a scanline fica atrás do texto (não entra no cálculo de contraste) e que o caret em bloco não prejudica a legibilidade do valor digitado.
- `test-antipatterns`: a guarda nova deve comparar a lista real de arquivos que usam `crt-scanlines`, sem hardcodar `true`/passar trivialmente.
- `playwright-cli`: conferência manual nos dois temas (escuro com scanline, claro sem).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-retro-shapes-visual.md` (bloco CSS `.crt-scanlines`/`.dark .crt-scanlines::before` é o norte literal).
- **Fonte de design original:** nenhuma; decidido no companion visual do brainstorming (2026-09-24).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? Caso não, seguir o mockup curado.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `playwright-cli` e `claude-in-chrome` (screenshot no navegador); não há visual regression automatizado neste ambiente.
- **Decisões visuais já tomadas (não refazer):** `repeating-linear-gradient(to bottom, rgb(0 0 0 / .22) 0 1px, transparent 1px 3px)`; scanline só sob `.dark`; caret em bloco na cor de acento (`--color-accent`); scanline sem animação, `z-index: -1`, `pointer-events: none`.

## Passos

- **Step 1: Review Focus: "Tema claro → nenhuma scanline visível nas 4 superfícies" — Write the failing test**

```tsx
test("crt-scanlines só desenha o ::before sob .dark, sem animação e atrás do conteúdo", () => {
	expect(css).toContain("@utility crt-scanlines")
	const start = css.indexOf(".dark .crt-scanlines::before")
	expect(start).toBeGreaterThan(-1)
	let depth = 0
	let end = start
	for (let i = css.indexOf("{", start); i < css.length; i++) {
		if (css[i] === "{") depth++
		if (css[i] === "}") depth--
		if (depth === 0) {
			end = i
			break
		}
	}
	const rule = css.slice(start, end + 1)
	expect(rule).toContain("z-index: -1")
	expect(rule).toContain("pointer-events: none")
	expect(rule).not.toMatch(/animation/)
	expect(css).not.toMatch(/^\.crt-scanlines::before/m)
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: FAIL — `css.indexOf(".dark .crt-scanlines::before")` retorna `-1` porque o utilitário ainda não existe.

- **Step 3: Write minimal implementation — crt-scanlines em globals.css**

```css
@utility crt-scanlines {
	position: relative;
	isolation: isolate;
}
.dark .crt-scanlines::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: -1;
	pointer-events: none;
	background: repeating-linear-gradient(
		to bottom,
		rgb(0 0 0 / 0.22) 0 1px,
		transparent 1px 3px
	);
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: PASS.

- **Step 5: Write the failing test — caret de terminal**

```tsx
test("input e textarea têm caret na cor de acento, em bloco quando suportado", () => {
	const baseLayer = css.slice(css.indexOf("@layer base"))
	expect(baseLayer).toMatch(/input,\s*textarea\s*\{[^}]*caret-color:\s*var\(--color-accent\);/)
	expect(baseLayer).toContain("@supports (caret-shape: block)")
	expect(baseLayer).toMatch(/@supports \(caret-shape: block\)\s*\{\s*input,\s*textarea\s*\{\s*caret-shape:\s*block;/)
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: FAIL — `@layer base` não tem regra para `input`/`textarea` hoje (confirmado no digest: "Nenhuma regra para input/textarea").

- **Step 7: Write minimal implementation — caret em globals.css**

Dentro de `@layer base` (após a regra de `*:focus-visible`):

```css
input,
textarea {
	caret-color: var(--color-accent);
}
@supports (caret-shape: block) {
	input,
	textarea {
		caret-shape: block;
	}
}
```

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: PASS.

- **Step 9: Write the failing test — guarda de escopo de crt-scanlines**

```ts
import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

describe("crt-scanlines só aparece nas 4 superfícies de destaque", () => {
	test("nenhum outro arquivo .tsx usa a classe crt-scanlines", () => {
		const SCANLINE_SURFACES = [
			"components/layout/authenticated-shell.tsx",
			"components/ui/pixel-scene.tsx",
			"features/dashboard/components/kpi-cards.tsx",
			"features/dashboard/components/profile-hero-card.tsx",
		]
		const users = listSourceFiles([".tsx"])
			.filter((file) => !file.path.includes(".test."))
			.filter((file) => /crt-scanlines/.test(file.content))
			.map((file) => file.path)
			.sort()
		expect(users).toEqual(SCANLINE_SURFACES)
	})
})
```

- **Step 10: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/crt-scanlines-scope.test.ts`
Expected: FAIL — `users` está vazio (nenhum arquivo usa `crt-scanlines` ainda), diferente de `SCANLINE_SURFACES`.

- **Step 11: Write minimal implementation — aplicar crt-scanlines nas 4 superfícies**

`components/ui/pixel-scene.tsx`: adicionar `crt-scanlines` à classe do elemento raiz do componente.

`components/layout/authenticated-shell.tsx` (l.177): trocar `"flex flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground max-[860px]:px-3"` por `"crt-scanlines flex flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 text-sidebar-foreground max-[860px]:px-3"` no `<aside>`.

`features/dashboard/components/profile-hero-card.tsx` (l.143): adicionar `crt-scanlines` à classe raiz `"relative isolate flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:flex-wrap md:items-center"`, mantendo `isolate` (a scanline usa `isolation: isolate` no próprio utilitário, e a cena em `<PixelScene>` já usa `-z-10`; conferir no Step 13 que a scanline fica atrás do texto e não esconde a cena).

`components/ui/stat-card.tsx`: adicionar a prop `className?: string` à assinatura do componente e repassá-la ao elemento raiz via `cn(...)`, ex.:

```tsx
interface StatCardProps {
	label: string
	value: string
	className?: string
	// ...demais props existentes
}

export function StatCard({ label, value, className, /* ... */ }: StatCardProps) {
	return (
		<div className={cn("rounded-lg border border-border bg-card p-[22px] shadow-sm", className)}>
			{/* ... */}
		</div>
	)
}
```

`features/dashboard/components/kpi-cards.tsx`: ao renderizar `StatCard`, passar `className="crt-scanlines"`.

- **Step 12: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/crt-scanlines-scope.test.ts`
Expected: PASS.

- **Step 13: Conferência manual nos dois temas (obrigatória antes de concluir)**

1. Rodar `pnpm --filter frontend dev`.
2. Usando a skill `playwright-cli` (ou `claude-in-chrome`), abrir o dashboard autenticado no Chrome no tema escuro (padrão da aplicação); capturar screenshot do hero, dos cards de KPI e da sidebar.
3. Alternar para o tema claro (toggle de tema da aplicação); capturar novamente os mesmos três screenshots.
4. Critério de aprovação: no tema escuro, a scanline aparece atrás do texto (texto legível, scanline não sobre as letras) nas 4 superfícies; no tema claro, nenhuma scanline é visível em nenhuma das 4 superfícies. A cena `PixelScene` continua visível sob a scanline no hero (a scanline não a esconde).
5. Se a scanline cobrir o texto, aparecer no tema claro, ou esconder a `PixelScene`: parar, marcar `BLOCKED` e reportar antes de prosseguir para a task-08.

- **Step 14: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/components/ui/pixel-scene.tsx apps/frontend/src/components/ui/stat-card.tsx apps/frontend/src/features/dashboard/components/profile-hero-card.tsx apps/frontend/src/features/dashboard/components/kpi-cards.tsx apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/app/globals-tokens.test.tsx apps/frontend/src/test/crt-scanlines-scope.test.ts
git commit -m "feat(frontend): scanlines de CRT restritas a 4 superfícies e caret em bloco"
```

## Critérios de Sucesso

- `crt-scanlines` só desenha o `::before` sob `.dark`, sem `animation`, com `z-index: -1` e `pointer-events: none` (FR-009, FR-010).
- `crt-scanlines` aparece, como classe, apenas em `pixel-scene.tsx`, `profile-hero-card.tsx`, `kpi-cards.tsx` e `authenticated-shell.tsx` (FR-016).
- `input`/`textarea` têm `caret-color: var(--color-accent)` e `caret-shape: block` sob `@supports` (FR-011).
- Conferência manual nos dois temas aprovada, ou task marcada `BLOCKED`.
