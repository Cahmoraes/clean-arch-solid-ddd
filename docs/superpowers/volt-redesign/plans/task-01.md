# Task 1: Fundação de tokens VOLT + fontes + tema dark [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007]

**Status:** DONE
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Substitui a camada de design tokens em `globals.css` pelo sistema VOLT (paleta accent verde `#39e58c`, neutros dark/light, tokens dedicados de sidebar, status colors com variantes soft, radii e sombras), carrega as 3 fontes VOLT via `next/font/google`, e muda o tema padrão para `dark`. Atualiza o mock de `next/font/google` para os testes continuarem verdes.

Esta é a fundação consumida por todas as tasks seguintes. Os componentes shadcn já consomem `--color-*` semânticos, então o retheme é transparente para eles.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/test/mocks/next-font-google.ts`
- Test: `apps/frontend/src/app/globals-tokens.test.tsx` (novo)

### Conformidade com as Skills Padrão

- use code-style: kebab-case nos arquivos, tokens semânticos (nunca palette tokens), pareamento `bg-accent` + foreground correto
- use no-workarounds: sem `!important` desnecessário, sem suprimir lint
- use test-antipatterns: testar comportamento real (presença das CSS vars de fonte no `<html>`), sem mockar o que está sob teste

## Passos

- [ ] **Step 1: Escrever o teste que falha (mock de fontes + variáveis aplicadas)**

Crie `apps/frontend/src/app/globals-tokens.test.tsx`:

```tsx
import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"

describe("Fontes VOLT (mock next/font/google)", () => {
	test("expõe as três variáveis de fonte VOLT", () => {
		const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
		const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
		const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

		expect(inter.variable).toBe("--font-inter")
		expect(grotesk.variable).toBe("--font-space-grotesk")
		expect(mono.variable).toBe("--font-jetbrains-mono")
	})

	test("aplica as três variáveis de fonte juntas em um elemento", () => {
		const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
		const { container } = render(<div className={grotesk.variable}>volt</div>)
		expect(container.firstChild).toHaveClass("--font-space-grotesk")
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "Fontes VOLT"`
Expected: FAIL — `Space_Grotesk is not a function` / `JetBrains_Mono is not exported` (o mock atual só exporta `Inter`).

- [ ] **Step 3: Atualizar o mock de `next/font/google`**

Substitua o conteúdo de `apps/frontend/src/test/mocks/next-font-google.ts` por:

```ts
interface FontOptions {
	subsets?: string[]
	variable?: string
	display?: string
	weight?: string | string[]
}

interface FontResult {
	variable: string
	className: string
	style: { fontFamily: string }
}

function makeFontMock(fallbackVar: string) {
	return (options: FontOptions = {}): FontResult => {
		const variable = options.variable ?? fallbackVar
		return {
			variable,
			className: variable.replace(/^--font-/, "font-"),
			style: { fontFamily: variable },
		}
	}
}

export const Inter = makeFontMock("--font-inter")
export const Space_Grotesk = makeFontMock("--font-space-grotesk")
export const JetBrains_Mono = makeFontMock("--font-jetbrains-mono")
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "Fontes VOLT"`
Expected: PASS (2 testes).

- [ ] **Step 5: Substituir o conteúdo de `globals.css` pelos tokens VOLT**

Substitua TODO o conteúdo de `apps/frontend/src/app/globals.css` por:

```css
@import "tailwindcss";

/*
 * VOLT — design tokens (Tailwind v4 @theme)
 * Accent verde-esmeralda #39e58c. Dark é o tema padrão (classe .dark via next-themes).
 * Nomes semânticos --color-* consumidos pelos componentes shadcn + tokens estendidos
 * (surface-*, border-strong, primary-strong, success/warning + soft, sidebar-*).
 */
@custom-variant dark (&:is(.dark *));

@theme {
	/* Fontes — carregadas via next/font/google em layout.tsx */
	--font-display: var(--font-space-grotesk), system-ui, sans-serif;
	--font-sans: var(--font-inter), system-ui, sans-serif;
	--font-mono: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace;

	/* Cores semânticas — LIGHT */
	--color-background: #f1f1ec;
	--color-foreground: #111110;
	--color-card: #ffffff;
	--color-card-foreground: #111110;
	--color-popover: #ffffff;
	--color-popover-foreground: #111110;

	--color-primary: #39e58c;
	--color-primary-strong: #22c976;
	--color-primary-foreground: #0a0a0a;

	--color-secondary: #f7f7f3;
	--color-secondary-foreground: #111110;
	--color-muted: #f7f7f3;
	--color-muted-foreground: #57574f;
	--color-subtle: #8a8a80;
	--color-accent: #39e58c;
	--color-accent-foreground: #0a0a0a;

	--color-surface: #ffffff;
	--color-surface-2: #f7f7f3;
	--color-surface-3: #efefe9;

	--color-success: #2fcf80;
	--color-success-soft: rgba(47, 207, 128, 0.14);
	--color-warning: #ffb443;
	--color-warning-soft: rgba(255, 180, 67, 0.16);
	--color-destructive: #ff5a4d;
	--color-destructive-foreground: #ffffff;
	--color-destructive-soft: rgba(255, 90, 77, 0.14);

	--color-border: #e4e4dc;
	--color-border-strong: #d3d3c9;
	--color-input: #e4e4dc;
	--color-ring: #39e58c;

	--color-sidebar: #111110;
	--color-sidebar-foreground: #f3f3ee;
	--color-sidebar-muted: #8d8d84;
	--color-sidebar-border: #262622;
	--color-sidebar-active: #ffffff;
	--color-sidebar-active-foreground: #111110;

	/* Radius */
	--radius-sm: 8px;
	--radius-md: 14px;
	--radius-lg: 22px;
	--radius-full: 9999px;

	/* Sombras */
	--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
	--shadow-md: 0 10px 30px -12px rgba(0, 0, 0, 0.18);
	--shadow-pop: 0 24px 60px -20px rgba(0, 0, 0, 0.35);
}

/* DARK (tema padrão) */
.dark {
	color-scheme: dark;
	--color-background: #080808;
	--color-foreground: #f6f6f4;
	--color-card: #161616;
	--color-card-foreground: #f6f6f4;
	--color-popover: #161616;
	--color-popover-foreground: #f6f6f4;

	--color-primary: #39e58c;
	--color-primary-strong: #22c976;
	--color-primary-foreground: #0a0a0a;

	--color-secondary: #1d1d1d;
	--color-secondary-foreground: #f6f6f4;
	--color-muted: #1d1d1d;
	--color-muted-foreground: #a3a39c;
	--color-subtle: #6f6f68;
	--color-accent: #39e58c;
	--color-accent-foreground: #0a0a0a;

	--color-surface: #161616;
	--color-surface-2: #1d1d1d;
	--color-surface-3: #242424;

	--color-success: #2fcf80;
	--color-warning: #ffb443;
	--color-destructive: #ff5a4d;
	--color-destructive-foreground: #0a0a0a;

	--color-border: #2a2a2a;
	--color-border-strong: #3a3a3a;
	--color-input: #2a2a2a;
	--color-ring: #39e58c;

	--color-sidebar: #0f0f0f;
	--color-sidebar-foreground: #f3f3ee;
	--color-sidebar-muted: #79796f;
	--color-sidebar-border: #232323;
	--color-sidebar-active: #39e58c;
	--color-sidebar-active-foreground: #0a0a0a;
}

@layer base {
	*,
	*::before,
	*::after {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	html {
		height: 100%;
		color-scheme: light;
	}

	body {
		min-height: 100%;
		background-color: var(--color-background);
		color: var(--color-foreground);
		font-family: var(--font-sans);
		font-size: 15px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		font-family: var(--font-display);
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.05;
		color: var(--color-foreground);
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	button,
	[role="button"] {
		cursor: pointer;
	}

	::placeholder {
		color: var(--color-subtle);
	}

	::selection {
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	*:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-ring) 55%, transparent);
		outline-offset: 2px;
	}
}

/* Numerais tabulares para mono */
.font-mono,
.tabular {
	font-feature-settings: "tnum" 1;
}
```

- [ ] **Step 6: Carregar as 3 fontes e mudar o tema padrão em `layout.tsx`**

Em `apps/frontend/src/app/layout.tsx`, substitua o import de fonte e a configuração:

```tsx
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"
```

Substitua a definição `const inter = Inter({...})` por:

```tsx
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
})

const spaceGrotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-space-grotesk",
	display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	display: "swap",
})
```

Atualize a tag `<html>` para aplicar as três variáveis:

```tsx
<html
	lang="pt-BR"
	suppressHydrationWarning
	className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
>
```

E mude o `defaultTheme` do `ThemeProvider` de `"light"` para `"dark"`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
```

- [ ] **Step 7: Rodar tsc, lint, testes e build completos**

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero issues.

Run: `pnpm --filter frontend test`
Expected: toda a suíte PASS (inclui o novo `globals-tokens.test.tsx`).

Run: `pnpm --filter frontend build`
Expected: build OK.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/app/layout.tsx apps/frontend/src/test/mocks/next-font-google.ts apps/frontend/src/app/globals-tokens.test.tsx
git commit -m "feat(volt-redesign): tokens VOLT, fontes Space Grotesk/Inter/JetBrains Mono e tema dark padrão"
```

## Critérios de Sucesso

- `globals.css` contém os tokens VOLT (accent `#39e58c`, neutros dark/light, sidebar-*, success/warning + soft) [RF-001, RF-003]
- Tema padrão é `dark`; light segue disponível via toggle [RF-002]
- Foreground sobre accent é `#0a0a0a` (nunca branco) [RF-004]
- Accent/raio/densidade são fixos no `globals.css` (sem painel runtime) [RF-005]
- As três fontes são carregadas e expostas como CSS vars [RF-006, RF-007]
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
