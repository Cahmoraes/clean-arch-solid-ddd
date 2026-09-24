# Task 4: Trocar cores literais por tokens semânticos [FR-004]

**Status:** DONE

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Remove as cores literais (hex e `rgba`) que restaram em componentes e passa a usar tokens semânticos, para que o retema chegue a esses pontos e o app não dependa mais do verde antigo. Um teste de varredura sobre `src` falha se aparecer qualquer literal novo fora de uma lista curta de exceções justificadas. O globo 3D do clima fica de fora porque o WebGL precisa de valores de cor literais.

Justificativa das exceções da varredura: `features/weather/components/weather-globe.tsx` e `weather-globe-constants.ts` alimentam o `react-globe.gl` (Three.js), que não lê variáveis CSS; `components/ui/chart.tsx` contém seletores de atributo de saída do Recharts (`[stroke='#ccc']`, `[stroke='#fff']`) que casam com cores da biblioteca, não cores aplicadas pelo app.

## Arquivos

- Create: `apps/frontend/src/test/source-files.ts`
- Create: `apps/frontend/src/test/no-literal-colors.test.ts`
- Create: `apps/frontend/src/features/dashboard/components/status-donut-card.test.tsx`
- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/operating-hours-summary.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/status-donut-card.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`

## Interfaces

- **Consome:** tokens de `apps/frontend/src/app/globals.css` (task-01), por utilitários `bg-background`, `border-border`, `bg-accent/10`, `text-success`, `text-destructive`, `bg-success-soft`, `bg-destructive-soft`, `text-subtle`, `bg-surface-2`, `hover:shadow-glow`, e por `var(--color-success)`, `var(--color-warning)`, `var(--color-destructive)`, `var(--color-muted)` em atributos SVG.
- **Produz:**
  - `apps/frontend/src/test/source-files.ts`: `export interface SourceFile { path: string; content: string }` e `export function listSourceFiles(extensions: ReadonlyArray<string>): SourceFile[]` (arquivos de produção de `src`, sem testes, sem `src/test/` e sem `.d.ts`; `path` relativo a `src` com `/`). Reusado pelas tarefas 15 e 18.
  - Contrato do teste de varredura: lista `ALLOWED_LITERAL_FILES` com os três caminhos acima.

### Conformidade com as Skills Padrão

- `tailwindcss`: substituição de valores arbitrários por utilitários de token; `shadow-glow` vem de `--shadow-glow`.
- `shadcn`: cores de status via tokens semânticos (`success`, `warning`, `destructive`).
- `test-antipatterns`: a varredura lê arquivos reais e o teste do donut renderiza o componente; nenhum mock do que se testa.
- `no-workarounds`: nenhuma exceção nova na lista sem justificativa; a lista não é ampliada para fazer passar.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/test/source-files.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export interface SourceFile {
	path: string
	content: string
}

const SRC_ROOT = fileURLToPath(new URL("..", import.meta.url))

function isProductionSource(
	relativePath: string,
	extensions: ReadonlyArray<string>,
): boolean {
	if (relativePath.startsWith("test/")) return false
	if (/\.test\.[a-z]+$/.test(relativePath)) return false
	if (relativePath.endsWith(".d.ts")) return false
	return extensions.some((extension) => relativePath.endsWith(extension))
}

function walk(directory: string, relativeBase: string): string[] {
	const found: string[] = []
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const relative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name
		if (entry.isDirectory()) {
			found.push(...walk(`${directory}${entry.name}/`, relative))
		} else {
			found.push(relative)
		}
	}
	return found
}

export function listSourceFiles(
	extensions: ReadonlyArray<string>,
): SourceFile[] {
	return walk(SRC_ROOT, "")
		.filter((relative) => isProductionSource(relative, extensions))
		.map((relative) => ({
			path: relative,
			content: readFileSync(`${SRC_ROOT}${relative}`, "utf8"),
		}))
}
```

Criar `apps/frontend/src/test/no-literal-colors.test.ts`:

```ts
import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

// Exceções justificadas (ver task-04): WebGL do globo e seletores de saída do Recharts.
const ALLOWED_LITERAL_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-constants.ts",
	"components/ui/chart.tsx",
]

const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/

function offendingLines(content: string): number[] {
	return content
		.split("\n")
		.flatMap((line, index) => (LITERAL_COLOR.test(line) ? [index + 1] : []))
}

const files = listSourceFiles([".ts", ".tsx"])

describe("Cores literais em código de produção", () => {
	test("nenhum arquivo fora da lista de exceções contém hex ou rgb(a) literal", () => {
		const violations = files
			.filter((file) => !ALLOWED_LITERAL_FILES.includes(file.path))
			.flatMap((file) =>
				offendingLines(file.content).map((line) => `${file.path}:${line}`),
			)
		expect(violations).toEqual([])
	})

	test("cada exceção da lista existe e ainda precisa da exceção", () => {
		for (const allowed of ALLOWED_LITERAL_FILES) {
			const file = files.find((candidate) => candidate.path === allowed)
			expect(file, `${allowed} não existe mais`).toBeDefined()
			expect(
				offendingLines(file?.content ?? "").length,
				`${allowed} não tem mais literal: remova da lista`,
			).toBeGreaterThan(0)
		}
	})
})
```

Criar `apps/frontend/src/features/dashboard/components/status-donut-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { StatusDonutCard } from "./status-donut-card"

const distribution = { validated: 6, pending: 3, rejected: 1 }

describe("StatusDonutCard", () => {
	test("colore o anel com os tokens de status: verde, âmbar e vermelho", () => {
		const { container } = render(
			<StatusDonutCard distribution={distribution} />,
		)
		expect(
			container.querySelector('circle[stroke="var(--color-success)"]'),
		).toBeInTheDocument()
		expect(
			container.querySelector('circle[stroke="var(--color-warning)"]'),
		).toBeInTheDocument()
		expect(
			container.querySelector('circle[stroke="var(--color-destructive)"]'),
		).toBeInTheDocument()
	})

	test("a legenda mostra Validado, Pendente e Rejeitado com as contagens e as mesmas cores", () => {
		const { container } = render(
			<StatusDonutCard distribution={distribution} />,
		)
		expect(screen.getByText("Validado")).toBeInTheDocument()
		expect(screen.getByText("Pendente")).toBeInTheDocument()
		expect(screen.getByText("Rejeitado")).toBeInTheDocument()
		const dots = Array.from(
			container.querySelectorAll("li > span[aria-hidden='true']"),
		).map((dot) => dot.getAttribute("style") ?? "")
		expect(dots).toHaveLength(3)
		expect(dots[0]).toContain("var(--color-success)")
		expect(dots[1]).toContain("var(--color-warning)")
		expect(dots[2]).toContain("var(--color-destructive)")
	})

	test("a trilha do anel usa o token muted, não uma variável inexistente", () => {
		const { container } = render(
			<StatusDonutCard distribution={distribution} />,
		)
		expect(
			container.querySelector('circle[stroke="var(--color-muted)"]'),
		).toBeInTheDocument()
	})
})
```

Acrescentar dentro do `describe("GymCard VOLT", ...)` de `apps/frontend/src/features/gyms/components/gym-card.test.tsx`, depois do último teste:

```tsx
	test("o realce de hover do cartão vem do token de glow, sem cor literal", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByTestId("gym-card-wrapper")).toHaveClass(
			"hover:shadow-glow",
		)
	})
```

Antes de editar, confirmar que nenhum teste existente depende das classes literais que serão removidas:

Run: `grep -n "#0a7a3a\|#b42318\|#ecece6\|#fcfcf9\|rgba(57\|#0a0a0a" apps/frontend/src/features/gyms/components/operating-hours-summary.test.tsx "apps/frontend/src/app/(public)/login/page.test.tsx" apps/frontend/src/app/\(public\)/login/login-volt.test.tsx`
Expected: nenhuma linha (se houver, atualizar essas asserções no passo 3 para as classes de token).

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/test/no-literal-colors.test.ts src/features/dashboard/components/status-donut-card.test.tsx src/features/gyms/components/gym-card.test.tsx`
Expected: FAIL. `nenhum arquivo fora da lista...` lista `app/(public)/login/page.tsx:84`, `features/gyms/components/gym-card.tsx:19`, `:25`, as linhas de `operating-hours-summary.tsx` e de `status-donut-card.tsx`; o teste do donut falha por `circle[stroke="var(--color-success)"]` ausente; o de `gym-card` falha por `hover:shadow-glow` ausente.

- **Step 3: Write minimal implementation**

3a. `apps/frontend/src/app/(public)/login/page.tsx`: na linha do `<aside ...>`, trocar `dark:bg-[#0a0a0a]` por `dark:bg-background` (o restante da linha permanece).

3b. `apps/frontend/src/features/gyms/components/gym-card.tsx`: em `cardMotionVariants`, remover as chaves `boxShadow` de `rest` e `hover`, ficando:

```tsx
const cardMotionVariants = {
	rest: { y: 0, scale: 1 },
	hover: { y: -3, scale: 1.015 },
}
```

e trocar a classe do `motion.div` de `"relative flex h-full flex-col rounded-lg"` por `"relative flex h-full flex-col rounded-lg transition-shadow duration-300 hover:shadow-glow"`.

3c. `apps/frontend/src/features/gyms/components/operating-hours-summary.tsx`, substituir literais por tokens:

- `border-[#ecece6] border-b last:border-0` por `border-border border-b last:border-0`
- `bg-[rgba(57,229,140,.10)]` por `bg-accent/10`
- `text-[#0a7a3a]` (as três ocorrências, inclusive no badge) por `text-success`
- `text-[#b0b0a6] italic` por `text-subtle italic`
- `bg-[#fcfcf9]` por `bg-surface-2`
- `text-[#b42318]` (as duas ocorrências) por `text-destructive`
- `border-[#b6e8c8] bg-[#e6f9ee] text-[#0a7a3a]` por `border-success/30 bg-success-soft text-success`
- `border-[#ffd0cc] bg-[#fff1f0] text-[#b42318]` por `border-destructive/30 bg-destructive-soft text-destructive`

3d. `apps/frontend/src/features/dashboard/components/status-donut-card.tsx`: criar a constante e usá-la nos dois lugares que repetiam os hex.

```tsx
const STATUS_COLORS = {
	validated: "var(--color-success)",
	pending: "var(--color-warning)",
	rejected: "var(--color-destructive)",
} as const
```

Em `buildSegments`, usar `color: STATUS_COLORS.validated`, `STATUS_COLORS.pending` e `STATUS_COLORS.rejected`. Na legenda, trocar o array literal por:

```tsx
{[
	{ label: "Validado", count: distribution.validated, color: STATUS_COLORS.validated },
	{ label: "Pendente", count: distribution.pending, color: STATUS_COLORS.pending },
	{ label: "Rejeitado", count: distribution.rejected, color: STATUS_COLORS.rejected },
].map(({ label, count, color }) => (
```

e trocar `stroke="hsl(var(--muted))"` (variável que não existe nos tokens hex) por `stroke="var(--color-muted)"`.

3e. Globo 3D: não alterar `weather-globe.tsx` nem `weather-globe-constants.ts` (justificativa no topo desta tarefa).

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/test/no-literal-colors.test.ts src/features/dashboard/components/status-donut-card.test.tsx src/features/gyms/components/gym-card.test.tsx src/features/gyms/components/operating-hours-summary.test.tsx src/features/dashboard/components/dashboard-page.test.tsx`
Expected: PASS

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/test/source-files.ts apps/frontend/src/test/no-literal-colors.test.ts apps/frontend/src/features/dashboard/components/status-donut-card.tsx apps/frontend/src/features/dashboard/components/status-donut-card.test.tsx apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-card.test.tsx apps/frontend/src/features/gyms/components/operating-hours-summary.tsx "apps/frontend/src/app/(public)/login/page.tsx"
git commit -m "refactor(frontend): trocar cores literais por tokens semânticos"
```

## Critérios de Sucesso

- Nenhum arquivo de produção de `src` fora das três exceções justificadas contém hex ou `rgb(a)` literal (FR-004).
- O donut de status usa `success`, `warning` e `destructive` para Validado, Pendente e Rejeitado (semântica verde, âmbar, vermelho preservada).
- O hover do card de academia usa `hover:shadow-glow`, sem `rgba` literal.
- O teste de varredura falha se a lista de exceções ficar desatualizada (arquivo sem literal ou inexistente).
