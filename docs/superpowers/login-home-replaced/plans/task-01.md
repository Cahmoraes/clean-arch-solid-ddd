# Task 1: Tema Pôr do sol (tokens, provider, variantes dark e chart) [FR-001, FR-003, FR-004]

**Status:** DONE

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Cria o terceiro tema global "Pôr do sol" como uma classe CSS própria (`.sunset`), com o mesmo conjunto de tokens do tema escuro atual, e amplia os seletores que hoje dependem só de `.dark` (variante `dark`, scanlines) para aceitarem as duas classes. Declara o novo tema no `ThemeProvider` e no `THEMES` do `chart.tsx`, para que o app inteiro (não só login/home) responda à escolha do usuário.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/components/ui/chart.tsx`
- Test: `apps/frontend/src/test/sunset-theme.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** classe CSS `.sunset` em `globals.css` com todos os `--color-*` de `.dark`; tema `"sunset"` válido no `next-themes` (`ThemeProvider` com `themes={["light", "dark", "sunset"]}`); `THEMES` de `chart.tsx` com a chave `sunset: ".sunset"` — consumidos por task-02 (ThemeToggle), task-05 (cena sunset), task-09 (home) e task-10 (e2e).

### Skills a invocar

- `tailwindcss`: tokens `--color-*` em `@theme`/`.dark`/`.sunset` e `@utility crt-scanlines` são Tailwind v4 puro.
- `wcag-audit-patterns`: cada par texto/fundo do tema `sunset` precisa cumprir contraste AA (4.5:1 texto, 3:1 UI) — FR-003.
- `no-workarounds`: ajustar os hex do `.sunset` até o contraste real, não relaxar o limiar do teste.
- `test-antipatterns`: o teste de paridade/contraste lê `globals.css`/`layout.tsx` como texto — não deve depender de renderizar componentes que não existem ainda.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/frontend/src/test/sunset-theme.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css")
const LAYOUT_PATH = join(process.cwd(), "src/app/layout.tsx")

function readGlobalsCss(): string {
	return readFileSync(GLOBALS_CSS_PATH, "utf-8")
}

function readLayout(): string {
	return readFileSync(LAYOUT_PATH, "utf-8")
}

function extractBlock(css: string, escapedSelector: string): string {
	const pattern = new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "s")
	return css.match(pattern)?.[1] ?? ""
}

function extractColorTokenNames(block: string): string[] {
	return Array.from(block.matchAll(/--color-([a-z0-9-]+)\s*:/g), (m) => m[1])
}

test("o bloco .sunset declara todo token --color-* que o bloco .dark declara", () => {
	const css = readGlobalsCss()
	const darkBlock = extractBlock(css, "\\.dark")
	const sunsetBlock = extractBlock(css, "\\.sunset")
	const darkTokens = extractColorTokenNames(darkBlock)
	const missing = darkTokens.filter(
		(name) => !sunsetBlock.includes(`--color-${name}:`),
	)
	expect(darkTokens.length).toBeGreaterThan(0)
	expect(missing).toEqual([])
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: FAIL — `sunsetBlock` é `""` (o seletor `.sunset` não existe em `globals.css`), então `missing` contém todos os nomes de `darkTokens` e `expect(missing).toEqual([])` falha.

- **Step 3: Write minimal implementation**

Adicionar em `apps/frontend/src/app/globals.css`, logo após o bloco `.dark { ... }` (linhas 109-146), a classe `.sunset` com todos os mesmos nomes de token (valores de partida do mockup, ajustados no Step 6):

```css
.sunset {
	color-scheme: dark;
	--color-background: #170b10;
	--color-foreground: #fbeee2;
	--color-card: #221019;
	--color-card-foreground: #fbeee2;
	--color-popover: #221019;
	--color-popover-foreground: #fbeee2;
	--color-primary: #ffb454;
	--color-primary-strong: #f5a03c;
	--color-primary-foreground: #2a1204;
	--color-secondary: #2c1420;
	--color-secondary-foreground: #fbeee2;
	--color-muted: #2c1420;
	--color-muted-foreground: #c49a8a;
	--color-highlight-foreground: #f0d6c4;
	--color-subtle: #a8806f;
	--color-accent: #ff5e7a;
	--color-accent-foreground: #170b10;
	--color-surface: #221019;
	--color-surface-2: #2c1420;
	--color-selected-tint: #2c1420;
	--color-surface-3: #3d1d27;
	--color-success: #4fd18b;
	--color-success-soft: #4fd18b;
	--color-warning: #ffd166;
	--color-warning-soft: #ffd166;
	--color-destructive: #ff6b5a;
	--color-destructive-foreground: #170b10;
	--color-destructive-soft: #ff6b5a;
	--color-border: #3d1d27;
	--color-border-strong: #7a4452;
	--color-input: #3d1d27;
	--color-ring: #ff5e7a;
	--color-sidebar: #140a0e;
	--color-sidebar-foreground: #fbeee2;
	--color-sidebar-muted: #b8917f;
	--color-sidebar-border: #3d1d27;
	--color-sidebar-active: #ff5e7a;
	--color-sidebar-active-foreground: #170b10;
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: PASS — todo `--color-*` de `.dark` está presente em `.sunset`.

- **Step 5: Write the failing test**

```ts
const TEXT_CONTRAST_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["foreground", "background"],
	["card-foreground", "card"],
	["muted-foreground", "background"],
	["primary-foreground", "primary"],
	["accent-foreground", "accent"],
]

function extractColorTokenValue(block: string, name: string): string | null {
	const pattern = new RegExp(`--color-${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})`)
	return block.match(pattern)?.[1] ?? null
}

function hexToRgb(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.slice(1, 7), 16)
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function channelLuminance(channel: number): number {
	const c = channel / 255
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(rgb: [number, number, number]): number {
	const [r, g, b] = rgb
	return (
		0.2126 * channelLuminance(r) +
		0.7152 * channelLuminance(g) +
		0.0722 * channelLuminance(b)
	)
}

function contrastRatio(hexA: string, hexB: string): number {
	const lumA = relativeLuminance(hexToRgb(hexA))
	const lumB = relativeLuminance(hexToRgb(hexB))
	const lighter = Math.max(lumA, lumB)
	const darker = Math.min(lumA, lumB)
	return (lighter + 0.05) / (darker + 0.05)
}

test("os pares texto/fundo do tema sunset cumprem contraste AA (>= 4.5:1)", () => {
	const css = readGlobalsCss()
	const sunsetBlock = extractBlock(css, "\\.sunset")
	for (const [fg, bg] of TEXT_CONTRAST_PAIRS) {
		const fgHex = extractColorTokenValue(sunsetBlock, fg)
		const bgHex = extractColorTokenValue(sunsetBlock, bg)
		expect(fgHex, `token --color-${fg} ausente`).not.toBeNull()
		expect(bgHex, `token --color-${bg} ausente`).not.toBeNull()
		if (fgHex && bgHex) {
			expect(
				contrastRatio(fgHex, bgHex),
				`contraste ${fg}/${bg}`,
			).toBeGreaterThanOrEqual(4.5)
		}
	}
})

test("border-strong do sunset cumpre contraste de UI (>= 3:1) contra o background", () => {
	const css = readGlobalsCss()
	const sunsetBlock = extractBlock(css, "\\.sunset")
	const borderHex = extractColorTokenValue(sunsetBlock, "border-strong")
	const bgHex = extractColorTokenValue(sunsetBlock, "background")
	expect(borderHex).not.toBeNull()
	expect(bgHex).not.toBeNull()
	if (borderHex && bgHex) {
		expect(contrastRatio(borderHex, bgHex)).toBeGreaterThanOrEqual(3)
	}
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: FAIL ou PASS dependendo dos hex de partida do Step 3 (copiados do mockup, não verificados por contraste). Antes de seguir, calcule manualmente `contrastRatio` para cada par da tabela `TEXT_CONTRAST_PAIRS` e para `border-strong`/`background` usando a fórmula WCAG (luminância relativa) — este cálculo é o gap que só rodar o teste fecha, então trate-o como parte do Step 7: qualquer par abaixo do limiar exige ajustar o hex correspondente no `.sunset` (mantendo a intenção "quente" do tema).

- **Step 7: Write minimal implementation**

Ajustar em `globals.css`, dentro do bloco `.sunset` já criado, os hex que não atingirem o limiar (por exemplo, escurecer `--color-muted-foreground` ou clarear `--color-background` marginalmente até `muted-foreground`/`background` alcançar 4.5:1; escurecer `--color-primary-foreground`/`--color-accent-foreground` se `primary`/`accent` forem claros demais para o texto invertido). Manter os demais tokens do Step 3 inalterados.

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: PASS — os dois testes de contraste passam para todos os pares.

- **Step 9: Write the failing test**

```ts
test("a variante dark e o seletor de scanlines aceitam .sunset além de .dark", () => {
	const css = readGlobalsCss()
	expect(css).toContain("@custom-variant dark (&:is(.dark *, .sunset *));")
	expect(css).toContain(
		".dark .crt-scanlines::before, .sunset .crt-scanlines::before",
	)
})
```

- **Step 10: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: FAIL — a linha 12 de `globals.css` ainda é `@custom-variant dark (&:is(.dark *));` e o seletor de scanlines (linha 160) ainda é só `.dark .crt-scanlines::before`.

- **Step 11: Write minimal implementation**

Em `globals.css`:

```css
@custom-variant dark (&:is(.dark *, .sunset *));
```

E no bloco de scanlines (linhas 156-165):

```css
.dark .crt-scanlines::before,
.sunset .crt-scanlines::before {
	content: "";
	position: absolute;
	inset: 0;
	z-index: -1;
	pointer-events: none;
	background: repeating-linear-gradient(
		/* manter o gradiente já existente nas linhas 161-164 */
	);
}
```

- **Step 12: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: PASS.

- **Step 13: Review Focus: Trocar de Pôr do sol para Neon ou Neblina remove a classe `.sunset` do `<html>` (sem mistura de tokens) — Write the failing test**

```ts
test("o ThemeProvider declara os três temas, então o next-themes remove .sunset ao trocar de tema (sem mistura de tokens)", () => {
	const layout = readLayout()
	expect(layout).toContain('themes={["light", "dark", "sunset"]}')
})
```

- **Step 14: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: FAIL — `layout.tsx` hoje declara `<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>` sem a prop `themes`, então `layout.tsx` não contém a substring esperada.

- **Step 15: Write minimal implementation**

Em `apps/frontend/src/app/layout.tsx`:

```tsx
<ThemeProvider
	attribute="class"
	defaultTheme="dark"
	themes={["light", "dark", "sunset"]}
	disableTransitionOnChange
>
```

- **Step 16: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/sunset-theme.test.ts`
Expected: PASS — com `themes` declarado, o `next-themes` faz `classList.remove(...themes)` antes de `classList.add(value)`, então trocar de `sunset` para `dark`/`light` remove `.sunset` sem misturar tokens (D1).

- **Step 17: Adicionar `sunset` ao `THEMES` de `chart.tsx` (sem teste de runtime dedicado)**

```ts
// apps/frontend/src/components/ui/chart.tsx
const THEMES = { light: "", dark: ".dark", sunset: ".sunset" } as const
```

Não existe asserção de runtime para este passo: a garantia de que nenhum `ChartConfig` fica sem cor para `sunset` vem do tipo `Record<keyof typeof THEMES, string>` em `theme: Record<keyof typeof THEMES, string>`, verificado pelo `tsc` (D1, "Conformidade"), fora do escopo dos passos de teste desta task.

- **Step 18: Commit**

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/app/layout.tsx apps/frontend/src/components/ui/chart.tsx apps/frontend/src/test/sunset-theme.test.ts
git commit -m "feat(theme): adiciona tema Pôr do sol (.sunset) global"
```

## Critérios de Sucesso

- `.sunset` declara todos os `--color-*` presentes em `.dark` (FR-003).
- Os pares texto/fundo listados e `border-strong`/`background` do `.sunset` cumprem AA (FR-003).
- `@custom-variant dark` e o seletor de scanlines aceitam `.dark` e `.sunset` (FR-003).
- `ThemeProvider` declara `themes={["light", "dark", "sunset"]}`, então trocar de tema nunca mistura classes (FR-001, FR-004).
- `chart.tsx` tem `sunset: ".sunset"` em `THEMES`.
