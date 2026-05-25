# Task 1: Tokens base — globals.css + Inter Variable em layout.tsx

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Substituir toda a camada de tokens CSS em `globals.css`: paleta cromática indigo/violet/teal, dark mode adaptado, escala gradual de border-radius, 3 níveis de sombra, e tipografia Inter Variable. Carregar Inter Variable via `next/font/google` em `layout.tsx`.

Esta tarefa é a fundação de todas as outras — sem ela, os tokens semânticos usados nos componentes não correspondem ao novo design.

## Arquivos

- Modify: `apps/frontend/src/app/layout.tsx`
- Modify: `apps/frontend/src/app/globals.css`

### Conformidade com as Skills Padrão

- tailwindcss: Tailwind v4 usa `@theme` em vez de `tailwind.config.ts` — tokens são CSS custom properties
- react: `next/font/google` injeta a fonte como CSS variable no elemento `html`

## Passos

- [ ] **Step 1: Adicionar Inter Variable em layout.tsx**

Substituir o conteúdo de `apps/frontend/src/app/layout.tsx`:

```typescript
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import type { ReactNode } from "react"
import { ThemeToggleFAB } from "@/components/ui/theme-toggle-fab"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
import { WebVitalsReporter } from "./web-vitals"
import "./globals.css"

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
})

export const metadata: Metadata = {
	title: "GymPass-like",
	description: "Plataforma de acesso a academias",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode
}>) {
	return (
		<html lang="pt-BR" suppressHydrationWarning className={inter.variable}>
			<body className="font-sans antialiased bg-background text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					disableTransitionOnChange
				>
					<WebVitalsReporter />
					<Providers>{children}</Providers>
					<Toaster />
					<ThemeToggleFAB />
				</ThemeProvider>
			</body>
		</html>
	)
}
```

- [ ] **Step 2: Substituir globals.css com a nova paleta e tokens**

Substituir o conteúdo completo de `apps/frontend/src/app/globals.css`:

```css
@import "tailwindcss";

/*
 * Design tokens — see apps/frontend/DESIGN.md
 *
 * Chromatic palette: indigo navy / violet / teal.
 * Graduated radius: xs 4px → full 9999px.
 * Shadow levels: flat | sm (1px) | md (8px).
 * Dark mode: .dark selector with indigo-deep surface.
 */

@theme {
	/* Font — Inter Variable loaded via next/font/google */
	--font-inter: var(--font-inter), system-ui, sans-serif;
	--font-display: var(--font-inter), system-ui, sans-serif;
	--font-sans: var(--font-inter), system-ui, sans-serif;
	--font-mono:
		ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
		"Courier New";

	/* Semantic color tokens — light mode */
	--color-background: #ffffff;
	--color-foreground: #292827;
	--color-card: #fafaf8;
	--color-card-foreground: #292827;
	--color-popover: #ffffff;
	--color-popover-foreground: #292827;
	--color-primary: #1b1938;
	--color-primary-foreground: #ffffff;
	--color-secondary: #f0edf8;
	--color-secondary-foreground: #1b1938;
	--color-muted: #f5f3f0;
	--color-muted-foreground: #73706d;
	--color-accent: #c9b4fa;
	--color-accent-foreground: #1b1938;
	--color-destructive: #dc2626;
	--color-destructive-foreground: #ffffff;
	--color-border: #e8e4dd;
	--color-input: #e8e4dd;
	--color-ring: #1b1938;
	--color-teal: #155555;

	/* Border radius — graduated scale */
	--radius-xs: 4px;
	--radius-sm: 6px;
	--radius-md: 8px;
	--radius-lg: 12px;
	--radius-xl: 16px;
	--radius-full: 9999px;

	/* Shadows */
	--shadow-none: 0 0 #0000;
	--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
	--shadow-md: 0 8px 24px rgba(0, 0, 0, 0.12);
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
		line-height: 0.96;
	}

	a {
		color: inherit;
		text-decoration: none;
	}

	::placeholder {
		color: var(--color-muted-foreground);
	}

	*:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--color-ring) 50%, transparent);
		outline-offset: 2px;
	}
}

.dark {
	color-scheme: dark;
	--color-background: #0e0c1f;
	--color-foreground: #f5f3f0;
	--color-card: #1b1938;
	--color-card-foreground: #f5f3f0;
	--color-popover: #1b1938;
	--color-popover-foreground: #f5f3f0;
	--color-primary: #c9b4fa;
	--color-primary-foreground: #0e0c1f;
	--color-secondary: #262240;
	--color-secondary-foreground: #c9b4fa;
	--color-muted: #262240;
	--color-muted-foreground: #9a8fc4;
	--color-accent: #c9b4fa;
	--color-accent-foreground: #0e0c1f;
	--color-destructive: #f87171;
	--color-destructive-foreground: #0e0c1f;
	--color-border: #2e2a4a;
	--color-input: #2e2a4a;
	--color-ring: #c9b4fa;
	--color-teal: #0e3030;
}
```

- [ ] **Step 3: Verificar tipos e lint**

```bash
cd apps/frontend
pnpm tsc:check
pnpm lint:fix
```

Esperado: zero erros de TypeScript, zero issues do Biome.

- [ ] **Step 4: Executar testes e build**

```bash
pnpm --filter frontend test
pnpm --filter frontend build
```

Esperado: todos os testes passam, build sem erros. Se algum teste referenciar `--color-silver` ou `--color-pure-black` diretamente nos snapshots, atualize as asserções para os novos tokens.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/layout.tsx apps/frontend/src/app/globals.css
git commit -m "feat(frontend): migrar tokens base para paleta cromática indigo/violet e Inter Variable"
```

## Critérios de Sucesso

- `pnpm --filter frontend tsc:check` passa com zero erros
- `pnpm --filter frontend lint:fix` passa com zero issues
- `pnpm --filter frontend test` passa
- `pnpm --filter frontend build` compila sem erros
- `globals.css` não contém mais `--color-pure-white`, `--color-pure-black`, `--color-silver`, `--color-ring-blue`, `--radius-container`, `--radius-pill`
- `layout.tsx` carrega Inter Variable via `next/font/google`
