# Task 2: VT323 como fonte de display [FR-005, FR-006, FR-007, FR-008, FR-017]

**Status:** DONE

**PRD:** `../prd/prd-replaced-retro-shapes.md`

**Spec:** `../specs/replaced-retro-shapes-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Esta task troca a fonte de display de Space Grotesk para VT323 (bitmap de terminal), com fallback monoespaçado quando a fonte não carrega. `--font-sans` (Inter) e `--font-mono` (JetBrains Mono) não mudam. É a base tipográfica que as tasks 4 e 6 usam para aplicar `font-display` a títulos, rótulos, botões e badges.

## Arquivos

- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/app/globals.css`
- Test: `apps/frontend/src/app/globals-tokens.test.tsx`

## Interfaces

- **Consome:** o `globals.css` já modificado pela task-01 (tokens `--radius-*` em `0px` no `@theme` e bloco `@supports (corner-shape: bevel)` logo após); esta task edita o mesmo arquivo preservando esse bloco intacto e só toca as linhas 16-19 do `@theme` (`--font-display`, `--font-sans`, `--font-mono`) e a regra `h1..h6`.
- **Produz:** variável CSS `--font-vt323` (declarada por `next/font/google` em `layout.tsx`, aplicada na `<html>`); token `--font-display: var(--font-vt323), ui-monospace, SFMono-Regular, Menlo, monospace;` em `globals.css`. A partir desta task, a classe utilitária `font-display` do Tailwind (já existente, sem mudança de nome) passa a renderizar em VT323 peso 400 — consumida pelas tasks 4 e 6 (`Eyebrow`, `CardTitle`, `DialogTitle`, `SheetTitle`, `PageHeader`, `Button`, `StatCard`, badges, rótulo de seção da sidebar, e os elementos de features/páginas que trocam `font-mono` por `font-display`).

### Skills a invocar

- `tailwindcss`: confirmar que a troca do valor de `--font-display` no `@theme` é suficiente para a classe `font-display` refletir a nova fonte, sem exigir mudança nas classes dos componentes.
- `vercel-react-best-practices`: aplicar `next/font/google` corretamente (subset, `display: "swap"`, fallback), evitando layout shift e carregamento bloqueante.
- `test-antipatterns`: manter os testes de `globals-tokens.test.tsx` asserindo o CSS real, sem mockar o conteúdo do arquivo.
- `no-workarounds`: se o Biome ou o TypeScript reclamarem da importação de `VT323`, resolver a causa raiz (ex.: versão do `next/font/google` que exporta `VT323`), nunca usar `any`/supressão.

## Passos

- **Step 1: Write the failing test**

```tsx
test("--font-display referencia VT323 com fallback monoespaçado, e --font-space-grotesk não existe mais no CSS", () => {
	expect(lightBlock).toMatch(/--font-display:\s*var\(--font-vt323\),\s*ui-monospace,\s*SFMono-Regular,\s*Menlo,\s*monospace;/)
	expect(lightBlock).toContain("--font-sans:")
	expect(lightBlock).toContain("var(--font-inter)")
	expect(css).not.toContain("--font-space-grotesk")
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: FAIL — `--font-display` ainda referencia `var(--font-space-grotesk)`.

- **Step 3: Write minimal implementation (globals.css)**

Nas linhas 16-19 do `@theme`, trocar:

```css
--font-display: var(--font-vt323), ui-monospace, SFMono-Regular, Menlo, monospace;
--font-sans: var(--font-inter), system-ui, sans-serif;
--font-mono:
	var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
```

Na regra `h1, h2, h3, h4, h5, h6` (`@layer base`, linhas 169-180 atuais), ajustar peso e tracking para a nova fonte:

```css
h1, h2, h3, h4, h5, h6 {
	font-family: var(--font-display);
	font-weight: 400;
	letter-spacing: 0.02em;
	line-height: 1.1;
	color: var(--color-foreground);
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: PASS.

- **Step 5: Write the failing test — layout.tsx carrega VT323**

`rg -l "layout" src/app --glob '*.test.tsx'` não encontra teste existente de `layout.tsx` neste projeto (verificar antes de escrever; se algum teste padrão existir, seguir o mesmo padrão em vez do abaixo). Como não há teste de `layout.tsx`, este passo cobre a implementação diretamente pelo teste de CSS do Step 1 (que já falha até `--font-vt323` existir como variável consumida) — nenhum teste adicional de `layout.tsx` é necessário nesta task.

- **Step 6: Write minimal implementation (layout.tsx)**

```tsx
import { Inter, JetBrains_Mono, VT323 } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const vt323 = VT323({
	weight: "400",
	subsets: ["latin"],
	variable: "--font-vt323",
	display: "swap",
})
const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	display: "swap",
})
```

```tsx
<html
	lang="pt-BR"
	suppressHydrationWarning
	className={`${inter.variable} ${vt323.variable} ${jetbrainsMono.variable}`}
>
```

Remover a importação e o uso de `Space_Grotesk`/`spaceGrotesk` por completo.

- **Step 7: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/app/globals-tokens.test.tsx`
Expected: PASS — os 14 testes de `globals-tokens.test.tsx` (12 originais + 2 novos da task-01 + 1 novo desta task) passam. `next/font/google` é mockado no Vitest (alias em `vitest.config.ts`), então o import de `VT323` não quebra a suíte.

- **Step 8: Commit** *(somente se `workflow.auto_commit` estiver ativo no prompt do implementador; caso contrário, pular este passo e reportar os arquivos alterados)*

```bash
git add apps/frontend/src/app/layout.tsx apps/frontend/src/app/globals.css apps/frontend/src/app/globals-tokens.test.tsx
git commit -m "feat(frontend): VT323 como fonte de display com fallback monoespaçado"
```

## Critérios de Sucesso

- `--font-display` referencia `var(--font-vt323)` com fallback `ui-monospace, SFMono-Regular, Menlo, monospace` (FR-005, FR-008, FR-017).
- `--font-sans` continua Inter; nenhuma referência a `--font-space-grotesk` resta em `globals.css` ou `layout.tsx` (FR-007).
- `layout.tsx` carrega `VT323` com `weight: "400"` e aplica a variável `--font-vt323` na `<html>` (FR-005).
- `h1..h6` usam `font-weight: 400` (VT323 não tem peso bold) (FR-005).
