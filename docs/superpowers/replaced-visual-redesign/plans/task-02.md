# Task 2: Contraste calculado dos tokens nos dois temas [FR-005]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Cria um teste que calcula a razão de contraste WCAG a partir dos valores reais de `globals.css` e falha quando um par de texto ou de componente fica abaixo do mínimo, nos dois temas. Os números da pesquisa mostram que magenta e ciano puros falham no claro; por isso o teste é o guarda dos acentos escurecidos definidos na tarefa 1. Se algum par falhar, esta tarefa corrige o token em `globals.css`.

## Arquivos

- Create: `apps/frontend/src/app/contrast-tokens.test.tsx`
- Modify (só se um par falhar): `apps/frontend/src/app/globals.css`

## Interfaces

- **Consome:** tokens `--color-*` de `apps/frontend/src/app/globals.css` (task-01): blocos `@theme` (claro) e o seletor `.dark` (escuro), valores em hexadecimal de 6 dígitos.
- **Produz:** N/A (nenhum símbolo novo em código de produção; o teste é o guarda de FR-005 e o valor dos tokens pode ser ajustado aqui).

### Conformidade com as Skills Padrão

- `tailwindcss`: os tokens vivem em `@theme` e no override escuro; o teste lê os dois blocos.
- `shadcn`: os pares cobrem os nomes que os componentes shadcn usam (`foreground/background`, `primary-foreground/primary`, `card-foreground/card`).
- `wcag-audit-patterns`: mínimos 4.5:1 para texto e 3:1 para componentes e bordas (WCAG 1.4.3 e 1.4.11), sem contar glow.
- `test-antipatterns`: sem mock; leitura do arquivo real e cálculo puro.
- `no-workarounds`: par que falha é corrigido no token, nunca removido do teste ou relaxado.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/app/contrast-tokens.test.tsx`:

```tsx
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")

type Tokens = Record<string, string>

function blockOf(selectorSource: string): string {
	const body = css.match(new RegExp(`${selectorSource}\\s*\\{([^}]*)\\}`))?.[1]
	if (body === undefined) {
		throw new Error(`Bloco ${selectorSource} não encontrado em globals.css`)
	}
	return body
}

function parseColorTokens(block: string): Tokens {
	const tokens: Tokens = {}
	for (const match of block.matchAll(
		/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g,
	)) {
		const [, name, value] = match
		if (name && value) tokens[name] = value
	}
	return tokens
}

const light = parseColorTokens(blockOf("@theme"))
const dark = { ...light, ...parseColorTokens(blockOf("\\.dark")) }

function channel(hex: string, start: number): number {
	const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
	const color = hex.replace("#", "")
	return (
		0.2126 * channel(color, 0) +
		0.7152 * channel(color, 2) +
		0.0722 * channel(color, 4)
	)
}

function contrastRatio(foreground: string, background: string): number {
	const a = luminance(foreground)
	const b = luminance(background)
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["foreground", "background"],
	["muted-foreground", "background"],
	["muted-foreground", "muted"],
	["subtle", "background"],
	["card-foreground", "card"],
	["primary-foreground", "primary"],
	["accent-foreground", "accent"],
	["destructive-foreground", "destructive"],
	["sidebar-foreground", "sidebar"],
	["sidebar-muted", "sidebar"],
	["sidebar-active-foreground", "sidebar-active"],
	["success", "background"],
	["warning", "background"],
	["destructive", "background"],
	["primary", "background"],
	["accent", "background"],
]

const COMPONENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
	["primary", "background"],
	["ring", "background"],
	["border-strong", "background"],
]

const THEMES: ReadonlyArray<readonly [string, Tokens]> = [
	["claro", light],
	["escuro", dark],
]

function valueOf(tokens: Tokens, name: string): string {
	const value = tokens[name]
	if (value === undefined) throw new Error(`Token --color-${name} ausente`)
	return value
}

describe("Contraste WCAG dos tokens (calculado a partir de globals.css)", () => {
	test("calcula a razão conhecida: preto sobre branco é 21:1", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
	})

	test("reproduz os números da pesquisa: magenta escuro sobre azul-petróleo", () => {
		expect(contrastRatio("#ff3ea5", "#0a1424")).toBeGreaterThan(5.6)
	})

	for (const [themeName, tokens] of THEMES) {
		test(`tema ${themeName}: pares de texto têm pelo menos 4.5:1`, () => {
			const failures = TEXT_PAIRS.map(([fg, bg]) => ({
				pair: `${fg} sobre ${bg}`,
				ratio: contrastRatio(valueOf(tokens, fg), valueOf(tokens, bg)),
			})).filter(({ ratio }) => ratio < 4.5)
			expect(failures).toEqual([])
		})

		test(`tema ${themeName}: componentes e bordas relevantes têm pelo menos 3:1`, () => {
			const failures = COMPONENT_PAIRS.map(([fg, bg]) => ({
				pair: `${fg} sobre ${bg}`,
				ratio: contrastRatio(valueOf(tokens, fg), valueOf(tokens, bg)),
			})).filter(({ ratio }) => ratio < 3)
			expect(failures).toEqual([])
		})
	}
})
```

- **Step 2: Run test to verify it fails or exposes a token to fix**

Run: `pnpm --filter frontend test src/app/contrast-tokens.test.tsx`
Expected: os dois primeiros testes (razão 21:1 e magenta sobre azul-petróleo) passam. Os testes por tema passam com os valores da tarefa 1, que foram calculados a priori. Se algum par ficar abaixo do mínimo, o `expect(failures).toEqual([])` falha listando `{ pair, ratio }`; o valor exato só a execução revela, por isso o passo 3 descreve a correção condicional.

- **Step 3: Write minimal implementation**

Só se o passo 2 listar falhas: ajustar em `apps/frontend/src/app/globals.css` o token do par listado, no bloco do tema que falhou, escurecendo (claro) ou clareando (escuro) até a razão passar, mantendo o matiz (magenta perto de `#cc0077`, ciano perto de `#00708a` no claro). Não relaxar limites nem remover pares do teste. Se nada falhar, nenhuma mudança de código neste passo.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/app/contrast-tokens.test.tsx src/app/globals-tokens.test.tsx`
Expected: PASS (o teste de tokens da tarefa 1 continua válido; se um valor exato asserido lá foi ajustado neste passo, atualizar o valor esperado nele e em `apps/frontend/DESIGN.md`)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/app/contrast-tokens.test.tsx apps/frontend/src/app/globals.css apps/frontend/DESIGN.md apps/frontend/src/app/globals-tokens.test.tsx
git commit -m "test(frontend): contraste WCAG calculado dos tokens nos dois temas"
```

## Critérios de Sucesso

- O teste calcula a luminância relativa WCAG a partir dos hex de `globals.css` e cobre os dois temas (FR-005).
- Pares de texto (foreground, muted-foreground, primary-foreground, card-foreground, sidebar-foreground, sidebar-active-foreground e cores de status) têm razão >= 4.5:1 em ambos os temas.
- `primary`, `ring` e `border-strong` sobre o fundo têm razão >= 3:1 em ambos os temas.
- Nenhum limite foi relaxado; qualquer correção ficou no token.
