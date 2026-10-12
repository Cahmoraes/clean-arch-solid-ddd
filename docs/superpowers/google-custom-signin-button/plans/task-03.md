# Task 3: Componente de ícone do logo G oficial [FR-001]

**Status:** PENDING

**PRD:** `../prd/prd-google-custom-signin-button.md`

**Spec:** `../specs/google-custom-signin-button-design.md`

**Tier:** cheap

## Visão Geral

O logo G oficial multicolorido do Google sai do JSX das telas e vira um componente de `components/ui`, com os quatro caminhos de cor que o tornavam impraticável de repetir inline. As quatro cores literais de marca entram na allowlist da guarda `no-literal-colors`, que hoje proíbe hex em código de produção.

## Arquivos

- Create: `apps/frontend/src/components/ui/google-g-icon.tsx`
- Create: `apps/frontend/src/components/ui/google-g-icon.test.tsx`
- Modify: `apps/frontend/src/test/no-literal-colors.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:**
  - `GoogleGIcon({ className }: { className?: string }): React.JSX.Element` — exportada de `apps/frontend/src/components/ui/google-g-icon.tsx`, renderiza `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">` com os quatro `<path>` de marca e propaga `className` no `<svg>` (task-04 a renderiza dentro do `Button`)

### Skills a invocar

- `shadcn`: o componente vai em `components/ui/` e segue a convenção do diretório — `export function` em vez de `export const`, sem `React.FC`, com `interface` de props nomeada.
- `tailwindcss`: a escala de tamanho do ícone é Tailwind (`h-5 w-5`, escala de 20px do repo); `className` chega ao `<svg>` e não é convertido em token.
- `vercel-react-best-practices`: SVG decorativo com `aria-hidden` + `focusable="false"` para não entrar na ordem de foco, e sem estado interno — o componente é uma constante de markup.

## Passos

- **Step 1: Write the failing test**

  Crie `apps/frontend/src/components/ui/google-g-icon.test.tsx`:

```tsx
import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { GoogleGIcon } from "./google-g-icon"

describe("GoogleGIcon", () => {
	test("renderiza o svg decorativo do logo G oficial", () => {
		const { container } = render(<GoogleGIcon />)

		const svg = container.querySelector("svg")

		expect(svg).not.toBeNull()
		expect(svg).toHaveAttribute("aria-hidden", "true")
		expect(svg).toHaveAttribute("focusable", "false")
		expect(svg).toHaveAttribute("viewBox", "0 0 48 48")
	})

	test("AC-02 contém exatamente os quatro caminhos com as cores de marca do Google", () => {
		const { container } = render(<GoogleGIcon />)

		const paths = Array.from(container.querySelectorAll("path"))

		expect(paths).toHaveLength(4)
		expect(paths.map((path) => path.getAttribute("fill"))).toEqual([
			"#EA4335",
			"#4285F4",
			"#FBBC05",
			"#34A853",
		])
	})

	test("propaga className no svg", () => {
		const { container } = render(<GoogleGIcon className="h-5 w-5 shrink-0" />)

		expect(container.querySelector("svg")).toHaveClass("h-5", "w-5", "shrink-0")
	})
})
```

- **Step 2: Run test to verify it fails**

  Run: `pnpm --filter frontend test src/components/ui/google-g-icon.test.tsx`
  Expected: FAIL — erro de resolução de módulo: `Failed to resolve import "./google-g-icon"`, o arquivo ainda não existe.

- **Step 3: Write minimal implementation**

  Crie `apps/frontend/src/components/ui/google-g-icon.tsx` com os quatro `<path>` do logo G oficial, na ordem vermelho → azul → amarelo → verde do bundle do Google. **Não** declare `corner-shape`, **não** use `rounded-*` (a guarda `src/test/rounded-residue.test.ts` proíbe) e **não** adicione o logo a `components/ui/pixel-icons.tsx` — `pixel-icons.test.tsx` afirma a lista exata de exports e quebraria.

```tsx
interface GoogleGIconProps {
	className?: string
}

export function GoogleGIcon({ className }: GoogleGIconProps) {
	return (
		<svg
			viewBox="0 0 48 48"
			aria-hidden="true"
			focusable="false"
			className={className}
		>
			<path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			/>
			<path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			/>
			<path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			/>
			<path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			/>
		</svg>
	)
}
```

- **Step 4: Run test to verify it passes**

  Run: `pnpm --filter frontend test src/components/ui/google-g-icon.test.tsx`
  Expected: PASS — 3 testes passaram, 0 falharam.

- **Step 5: Run test to verify it fails**

  A guarda `src/test/no-literal-colors.test.ts` já existe e já varre `src/**/*.tsx`; o arquivo criado no passo 3 é o que a faz falhar. Rode-a **antes** de tocar na allowlist:

  Run: `pnpm --filter frontend test src/test/no-literal-colors.test.ts`
  Expected: FAIL — a asserção `expect(violations).toEqual([])` recebe uma lista com uma entrada por `fill="#…"` do arquivo novo, no formato `["components/ui/google-g-icon.tsx:NN", …]` (4 entradas, uma por path).

- **Step 6: Write minimal implementation**

  Em `apps/frontend/src/test/no-literal-colors.test.ts`, acrescente o caminho novo à `ALLOWED_LITERAL_FILES` **e** atualize o comentário de cabeçalho, que hoje só cita o globo e o Recharts:

```ts
// Exceções justificadas: WebGL do globo, seletores de saída do Recharts e o
// logo G oficial (asset de marca do Google — as 4 cores não são tokens do tema).
const ALLOWED_LITERAL_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-constants.ts",
	"components/ui/chart.tsx",
	"components/ui/google-g-icon.tsx",
]
```

- **Step 7: Run test to verify it passes**

  Run: `pnpm --filter frontend test src/test/no-literal-colors.test.ts`
  Expected: PASS — 2 testes passaram, 0 falharam; o segundo ("cada exceção da lista existe e ainda precisa da exceção") confirma que `components/ui/google-g-icon.tsx` existe e ainda contém literais, então a exceção continua necessária.

- **Step 8: Commit**

```bash
git add apps/frontend/src/components/ui/google-g-icon.tsx \
  apps/frontend/src/components/ui/google-g-icon.test.tsx \
  apps/frontend/src/test/no-literal-colors.test.ts
git commit -m "feat(ui): componente com o logo G oficial do Google"
```

## Critérios de Sucesso

- `GoogleGIcon` renderiza um `<svg viewBox="0 0 48 48">` com exatamente 4 `<path>` e os `fill` `#EA4335`, `#4285F4`, `#FBBC05`, `#34A853`, na ordem vermelho → azul → amarelo → verde
- O svg carrega `aria-hidden="true"` e `focusable="false"`, e o `className` recebido chega ao elemento svg
- `components/ui/google-g-icon.tsx` está na allowlist de `ALLOWED_LITERAL_FILES` com o comentário dizendo que é asset oficial do Google e não token do tema
- O logo **não** foi adicionado a `components/ui/pixel-icons.tsx` nem a `scripts/generate-pixel-icons.mjs` — `pixel-icons.test.tsx` continua verde
- O arquivo não declara `corner-shape` nem usa nenhuma classe `rounded-*`, `h-3.5`, `h-4.5` ou `size-` — a guarda `src/test/rounded-residue.test.ts` e a escala de ícones do repo continuam válidas
- Nenhum outro arquivo de `src/` ganhou cor literal: `no-literal-colors.test.ts` reporta zero violações
- Nenhum item da lista de Foco de Revisão do plano pertence a esta task: as duas linhas de code já consumido e de env ausente são de task-01, o corpo antigo em `400` e o grant de 300 s com recusa de reuso são de task-02, e o ciclo de loading sem `code` é de task-04
- AC-02 [unit]: WHEN o botão é renderizado THEN usa `Button` do design system com `variant="outline"`, `font-display` e o logo G oficial