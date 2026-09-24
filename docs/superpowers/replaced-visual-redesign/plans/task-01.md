# Task 1: Tokens Noite neon nos temas escuro e claro [FR-001, FR-002, FR-006, FR-007]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** N/A

## Visão Geral

Troca os valores dos tokens semânticos de `globals.css` para a direção "Noite neon": escuro azul-petróleo com magenta como cor primária e ciano como acento secundário, e claro "dia de neblina" com acentos escurecidos. Os nomes dos tokens não mudam, então todos os componentes herdam a nova aparência. Sincroniza também `apps/frontend/DESIGN.md`, que documenta os tokens VOLT verdes atuais.

Mapeamento adotado (as demais tarefas dependem dele): `--color-primary` é o magenta (ação primária, `Button variant="primary"`), `--color-accent` é o ciano (foco, seleção, rótulos, pílulas). A barra lateral é escura nos dois temas.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/DESIGN.md`
- Modify (test): `apps/frontend/src/app/globals-tokens.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:** tokens CSS em `apps/frontend/src/app/globals.css`, usados pelas tarefas seguintes por utilitários Tailwind (`bg-primary`, `text-accent`, `border-accent`, `bg-accent/10`, `bg-success-soft`, `hover:shadow-glow` ...):
  - Cores (nomes inalterados, valores novos): `--color-background`, `--color-foreground`, `--color-card`, `--color-card-foreground`, `--color-popover`, `--color-popover-foreground`, `--color-primary` (magenta), `--color-primary-strong`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-highlight-foreground`, `--color-subtle`, `--color-accent` (ciano), `--color-accent-foreground`, `--color-surface`, `--color-surface-2`, `--color-surface-3`, `--color-selected-tint`, `--color-success`, `--color-warning`, `--color-destructive`, `--color-destructive-foreground`, `--color-border`, `--color-border-strong`, `--color-input`, `--color-ring`, `--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-muted`, `--color-sidebar-border`, `--color-sidebar-active`, `--color-sidebar-active-foreground`; soft (só em `@theme`): `--color-success-soft`, `--color-warning-soft`, `--color-destructive-soft`.
  - Novo: `--shadow-glow` (anel ciano de 1px mais brilho suave, só em bordas e formas), utilitário `shadow-glow`.
  - Mantidos: `--font-display`, `--font-sans`, `--font-mono`, `--radius-*`, `--shadow-sm|md|pop`, `@utility focus-ring-duplo`, `.route-fade`, `.volt-bar`, `.shimmer`.

### Conformidade com as Skills Padrão

- `tailwindcss`: tokens em `@theme` do Tailwind v4 e override `.dark`; utilitário `shadow-glow` nasce de `--shadow-glow`.
- `shadcn`: os componentes shadcn continuam lendo os mesmos nomes semânticos (`--color-*`).
- `test-antipatterns`: o teste lê o arquivo real de tokens e afirma valores, sem mock.
- `no-workarounds`: nenhum valor duplicado em componente; a correção é sempre no token.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-visual.md` (tabela "Tokens aplicados", norte visual dos dois temas)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? A spec registra "nenhuma"; só reabrir a pergunta se o usuário citar uma.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** dark com fundo `#0a1424`, superfícies `#0d1b2e` e `#101f36`, texto `#dbe9f7`, magenta `#ff3ea5` com texto escuro, ciano `#3ee0ff`; claro `#f3f6fa` com magenta `#cc0077` e ciano `#00708a`; sidebar `#0b1626` nos dois temas; glow só em bordas e formas, nunca em texto; fontes inalteradas

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual` acima. Não há fonte de design original nem ferramenta de design-to-code; construir a partir do mockup e conferir no navegador com `playwright-cli` no fim do lote. Se o usuário informar uma fonte, usá-la antes de mexer nos valores.

- **Step 1: Write the failing test**

Substituir `apps/frontend/src/app/globals-tokens.test.tsx` por (mantém os dois testes de fonte existentes e acrescenta os de tokens):

```tsx
import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { describe, expect, test } from "vitest"

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")
const designDoc = readFileSync(
	new URL("../../DESIGN.md", import.meta.url),
	"utf8",
)

const REQUIRED_COLOR_TOKENS = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-strong",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"highlight-foreground",
	"subtle",
	"accent",
	"accent-foreground",
	"surface",
	"surface-2",
	"surface-3",
	"selected-tint",
	"success",
	"warning",
	"destructive",
	"destructive-foreground",
	"border",
	"border-strong",
	"input",
	"ring",
	"sidebar",
	"sidebar-foreground",
	"sidebar-muted",
	"sidebar-border",
	"sidebar-active",
	"sidebar-active-foreground",
] as const

function blockOf(selectorSource: string): string {
	const body = css.match(new RegExp(`${selectorSource}\\s*\\{([^}]*)\\}`))?.[1]
	if (body === undefined) {
		throw new Error(`Bloco ${selectorSource} não encontrado em globals.css`)
	}
	return body
}

function tokenOf(block: string, name: string): string | undefined {
	return block.match(new RegExp(`--color-${name}:\\s*([^;]+);`))?.[1]?.trim()
}

const lightBlock = blockOf("@theme")
const darkBlock = blockOf("\\.dark")

describe("Fontes VOLT (mock next/font/google)", () => {
	test("expõe as três variáveis de fonte VOLT", () => {
		const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
		const grotesk = Space_Grotesk({
			subsets: ["latin"],
			variable: "--font-space-grotesk",
		})
		const mono = JetBrains_Mono({
			subsets: ["latin"],
			variable: "--font-jetbrains-mono",
		})
		expect(inter.variable).toBe("--font-inter")
		expect(grotesk.variable).toBe("--font-space-grotesk")
		expect(mono.variable).toBe("--font-jetbrains-mono")
	})
	test("aplica as três variáveis de fonte juntas em um elemento", () => {
		const grotesk = Space_Grotesk({
			subsets: ["latin"],
			variable: "--font-space-grotesk",
		})
		const { container } = render(<div className={grotesk.variable}>volt</div>)
		expect(container.firstChild).toHaveClass("--font-space-grotesk")
	})
})

describe("Tokens Noite neon (globals.css)", () => {
	test("define todos os tokens de cor obrigatórios no tema claro", () => {
		for (const name of REQUIRED_COLOR_TOKENS) {
			expect(tokenOf(lightBlock, name), `claro: --color-${name}`).toBeDefined()
		}
	})

	test("define todos os tokens de cor obrigatórios no tema escuro", () => {
		for (const name of REQUIRED_COLOR_TOKENS) {
			expect(tokenOf(darkBlock, name), `escuro: --color-${name}`).toBeDefined()
		}
	})

	test("tema escuro: fundo azul-petróleo, primary magenta, acento ciano e texto off-white frio", () => {
		expect(tokenOf(darkBlock, "background")).toBe("#0a1424")
		expect(tokenOf(darkBlock, "primary")).toBe("#ff3ea5")
		expect(tokenOf(darkBlock, "primary-foreground")).toBe("#0a1424")
		expect(tokenOf(darkBlock, "accent")).toBe("#3ee0ff")
		expect(tokenOf(darkBlock, "foreground")).toBe("#dbe9f7")
	})

	test("tema claro dia de neblina: fundo frio claro com magenta e ciano escurecidos", () => {
		expect(tokenOf(lightBlock, "background")).toBe("#f3f6fa")
		expect(tokenOf(lightBlock, "primary")).toBe("#cc0077")
		expect(tokenOf(lightBlock, "accent")).toBe("#00708a")
	})

	test("a barra lateral é escura nos dois temas", () => {
		expect(tokenOf(lightBlock, "sidebar")).toBe("#0b1626")
		expect(tokenOf(darkBlock, "sidebar")).toBe("#0b1626")
	})

	test("nenhum text-shadow: glow nunca em texto", () => {
		expect(css).not.toContain("text-shadow")
	})

	test("glow existe só como sombra de forma (--shadow-glow)", () => {
		expect(lightBlock).toContain("--shadow-glow:")
	})

	test("mantém o anel de foco duplo e as três fontes", () => {
		expect(css).toContain("@utility focus-ring-duplo")
		expect(lightBlock).toContain("--font-display:")
		expect(lightBlock).toContain("--font-sans:")
		expect(lightBlock).toContain("--font-mono:")
	})

	test("não restou o verde VOLT antigo em globals.css", () => {
		expect(css).not.toContain("#39e58c")
		expect(css).not.toContain("verde-esmeralda")
	})
})

describe("DESIGN.md sincronizado com os tokens", () => {
	test("documenta os valores novos e não o verde antigo", () => {
		for (const hex of [
			"#0a1424",
			"#ff3ea5",
			"#3ee0ff",
			"#f3f6fa",
			"#cc0077",
			"#00708a",
		]) {
			expect(designDoc).toContain(hex)
		}
		expect(designDoc).not.toContain("#39e58c")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/app/globals-tokens.test.tsx`
Expected: FAIL. Os testes de fonte passam; "tema escuro: fundo azul-petróleo..." falha com `expected '#080808' to be '#0a1424'`, o de `--shadow-glow` falha por ausência e o de DESIGN.md falha por não conter `#0a1424`.

- **Step 3: Write minimal implementation**

3a. Em `apps/frontend/src/app/globals.css`, trocar o comentário de cabeçalho (sem escrever o seletor `.dark` seguido de chave nele):

```css
/*
 * VOLT — design tokens "Noite neon" (Tailwind v4 @theme)
 * Escuro (padrão, classe dark via next-themes): azul-petróleo, primary magenta, acento ciano.
 * Claro "dia de neblina": fundo frio claro, acentos escurecidos para passar AA.
 * primary = ação primária (magenta); accent = foco, seleção e rótulos (ciano).
 * Glow só em bordas e formas (--shadow-glow), nunca em texto.
 * Nomes semânticos --color-* consumidos pelos componentes shadcn + tokens estendidos
 * (surface-*, border-strong, primary-strong, success/warning + soft, sidebar-*).
 */
```

3b. Substituir todo o bloco de cores `LIGHT` dentro de `@theme` (da linha `/* Cores semânticas — LIGHT */` até `--color-sidebar-active-foreground`) por:

```css
	/* Cores semânticas — LIGHT (dia de neblina) */
	--color-background: #f3f6fa;
	--color-foreground: #0a1424;
	--color-card: #ffffff;
	--color-card-foreground: #0a1424;
	--color-popover: #ffffff;
	--color-popover-foreground: #0a1424;

	--color-primary: #cc0077;
	--color-primary-strong: #a8005f;
	--color-primary-foreground: #ffffff;

	--color-secondary: #e8eef5;
	--color-secondary-foreground: #0a1424;
	--color-muted: #e8eef5;
	--color-muted-foreground: #4a5f78;
	--color-highlight-foreground: #33485f;
	--color-subtle: #5d7189;
	--color-accent: #00708a;
	--color-accent-foreground: #ffffff;

	--color-surface: #ffffff;
	--color-surface-2: #e8eef5;
	--color-selected-tint: #e3f1f6;
	--color-surface-3: #dbe4ee;

	--color-success: #0d7a45;
	--color-success-soft: rgba(47, 207, 128, 0.14);
	--color-warning: #9a5b00;
	--color-warning-soft: rgba(255, 180, 67, 0.16);
	--color-destructive: #c4281c;
	--color-destructive-foreground: #ffffff;
	--color-destructive-soft: rgba(255, 90, 77, 0.14);

	--color-border: #d5dfea;
	--color-border-strong: #6f849b;
	--color-input: #d5dfea;
	--color-ring: #00708a;

	--color-sidebar: #0b1626;
	--color-sidebar-foreground: #dbe9f7;
	--color-sidebar-muted: #8aa3bd;
	--color-sidebar-border: #16304d;
	--color-sidebar-active: #3ee0ff;
	--color-sidebar-active-foreground: #0a1424;
```

3c. Em `@theme`, acrescentar depois de `--shadow-pop`:

```css
	--shadow-glow:
		0 0 0 1px var(--color-accent),
		0 0 14px -2px color-mix(in srgb, var(--color-accent) 45%, transparent);
```

3d. Substituir o bloco do tema escuro (o seletor `.dark` com chave) por:

```css
.dark {
	color-scheme: dark;
	--color-background: #0a1424;
	--color-foreground: #dbe9f7;
	--color-card: #0d1b2e;
	--color-card-foreground: #dbe9f7;
	--color-popover: #0d1b2e;
	--color-popover-foreground: #dbe9f7;

	--color-primary: #ff3ea5;
	--color-primary-strong: #e0288f;
	--color-primary-foreground: #0a1424;

	--color-secondary: #101f36;
	--color-secondary-foreground: #dbe9f7;
	--color-muted: #101f36;
	--color-muted-foreground: #9db4cc;
	/* Token dedicado para e-mail em destaque sobre o card selecionado (contraste, tarefa 2),
	   sem alterar --color-muted-foreground global. */
	--color-highlight-foreground: #c4d6e8;
	--color-subtle: #6f88a3;
	--color-accent: #3ee0ff;
	--color-accent-foreground: #0a1424;

	--color-surface: #0d1b2e;
	--color-surface-2: #101f36;
	--color-selected-tint: #101f36;
	--color-surface-3: #152a47;

	--color-success: #2fcf80;
	--color-warning: #ffb443;
	--color-destructive: #ff5a4d;
	--color-destructive-foreground: #0a1424;

	--color-border: #16304d;
	--color-border-strong: #4a6d94;
	--color-input: #16304d;
	--color-ring: #3ee0ff;

	--color-sidebar: #0b1626;
	--color-sidebar-foreground: #dbe9f7;
	--color-sidebar-muted: #8aa3bd;
	--color-sidebar-border: #16304d;
	--color-sidebar-active: #3ee0ff;
	--color-sidebar-active-foreground: #0a1424;
}
```

Não alterar `focus-ring-duplo`, `*:focus-visible`, `.route-fade`, `.volt-bar`, `.shimmer` nem as fontes.

3e. Abrir `apps/frontend/DESIGN.md`, localizar a seção que lista paleta e tokens VOLT (busca por `#39e58c`) e reescrevê-la com esta tabela e estas frases, removendo qualquer menção ao verde-esmeralda:

```markdown
| Token | Escuro | Claro |
|---|---|---|
| background | `#0a1424` | `#f3f6fa` |
| foreground | `#dbe9f7` | `#0a1424` |
| card / surface | `#0d1b2e` | `#ffffff` |
| surface-2 / muted | `#101f36` | `#e8eef5` |
| surface-3 | `#152a47` | `#dbe4ee` |
| primary (magenta, ação primária) | `#ff3ea5` (texto `#0a1424`) | `#cc0077` (texto `#ffffff`) |
| accent (ciano, foco e seleção) | `#3ee0ff` (texto `#0a1424`) | `#00708a` (texto `#ffffff`) |
| border / border-strong | `#16304d` / `#4a6d94` | `#d5dfea` / `#6f849b` |
| sidebar (escura nos dois temas) | `#0b1626` | `#0b1626` |

Regras: glow só em bordas e formas (`--shadow-glow`), nunca em texto; status usa verde, âmbar e vermelho semânticos, sem neon; texto >= 4.5:1 e componentes >= 3:1 nos dois temas.
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/app/globals-tokens.test.tsx`
Expected: PASS

- **Step 5: Run the coupled token tests to verify they still pass**

Run: `pnpm --filter frontend test src/app/layout.test.tsx src/app/motion.test.tsx src/components/ui/stat-card.test.tsx src/components/ui/status-badge.test.tsx`
Expected: PASS (só afirmam nomes de classe e estrutura, não valores de cor)

- **Step 6: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/app/globals-tokens.test.tsx apps/frontend/DESIGN.md
git commit -m "feat(frontend): tokens Noite neon nos temas escuro e claro"
```

## Critérios de Sucesso

- Tema escuro padrão usa fundo azul-petróleo, magenta como `--color-primary`, ciano como `--color-accent` e texto off-white frio (FR-001).
- Tema claro "dia de neblina" usa fundo frio claro e acentos escurecidos, e a alternância entre temas segue funcionando (FR-002).
- `globals.css` não tem `text-shadow`; o glow existe só como `--shadow-glow` (FR-006).
- `focus-ring-duplo` e o anel de foco global permanecem intactos (FR-007).
- Os nomes de token e as fontes não mudaram; `DESIGN.md` documenta os valores novos.
