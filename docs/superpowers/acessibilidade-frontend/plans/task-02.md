# Task 2: `CardTitle` — heading semântico por padrão com prop `as` [FR-009]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`CardTitle` (`apps/frontend/src/components/ui/card.tsx`) hoje sempre renderiza um `<div>` para o título do card, quebrando a hierarquia semântica de headings da página — leitores de tela não conseguem navegar por `h1`-`h6` para localizar títulos de card. A task adiciona uma prop `as` que escolhe o elemento de heading (`h1` a `h6`) renderizado, com `h3` como default (preserva o comportamento visual atual, já que a classe `"leading-none font-semibold"` não depende de um elemento específico). Não há consumidores externos de `CardTitle` hoje (confirmado por grep), então a mudança de assinatura não quebra nenhum call site existente.

## Arquivos

- Modify: `apps/frontend/src/components/ui/card.tsx`
- Test: Create `apps/frontend/src/components/ui/card.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `CardTitle` é parte de um componente shadcn/ui (`card.tsx`) — a mudança de assinatura precisa seguir o padrão de composição de primitivas shadcn (spread de `props`, `data-slot`, `cn()` para className).
- `vercel-composition-patterns`: a prop `as` é um padrão de polimorfismo de componente (component-as-prop) — decidir a forma do tipo e do render sem introduzir boolean-prop proliferation.
- `vercel-react-best-practices`: garantir que a troca de elemento renderizado não introduza re-render desnecessário nem quebre a passagem de `ref`/props padrão de um Server/Client Component React 19.
- `typescript-advanced`: o tipo `CardTitleProps` precisa compor `React.ComponentProps<"div">` com uma união literal `"h1"|"h2"|"h3"|"h4"|"h5"|"h6"` sem colisão de propriedades (`Omit`).
- `test-antipatterns`: o teste novo deve validar o contrato observável (papel de heading e nível via `getByRole`), não detalhes de implementação como a string de classe CSS.

## Passos

- **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { CardTitle } from "./card"

describe("CardTitle", () => {
	test("renderiza como heading de nível 3 por padrão", () => {
		render(<CardTitle>Texto do card</CardTitle>)
		expect(
			screen.getByRole("heading", { level: 3, name: "Texto do card" }),
		).toBeInTheDocument()
	})

	test("renderiza como heading de nível 2 quando as='h2'", () => {
		render(<CardTitle as="h2">Texto do card</CardTitle>)
		expect(
			screen.getByRole("heading", { level: 2, name: "Texto do card" }),
		).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/card.test.tsx`
Expected: FAIL — 2 testes falhando, ambos com `TestingLibraryElementError: Unable to find an accessible element with the role "heading"` (hoje `CardTitle` renderiza `<div data-slot="card-title">`, sem papel de heading).

- **Step 3: Write minimal implementation**

```tsx
type CardTitleProps = {
	as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
} & Omit<React.ComponentProps<"div">, "as">

function CardTitle({ as, className, ...props }: CardTitleProps) {
	const Comp = as ?? "h3"
	return (
		<Comp
			data-slot="card-title"
			className={cn("leading-none font-semibold", className)}
			{...props}
		/>
	)
}
```

Essa função substitui a `CardTitle` atual em `apps/frontend/src/components/ui/card.tsx` (linhas 31-39):

```tsx
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-title"
			className={cn("leading-none font-semibold", className)}
			{...props}
		/>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/card.test.tsx`
Expected: PASS — 2 testes passando (`Test Files 1 passed`, `Tests 2 passed`).

- **Step 5: Commit** *(execução paralela — se seu prompt indicar que você é um de vários implementadores em uma wave compartilhada, pule este passo e apenas reporte os arquivos alterados; o orquestrador comita na barreira de integração.)*

```bash
git add apps/frontend/src/components/ui/card.tsx apps/frontend/src/components/ui/card.test.tsx
git commit -m "feat(a11y): CardTitle renderiza heading semântico via prop as"
```

## Critérios de Sucesso

- `CardTitle` sem prop `as` renderiza `<h3>` e é localizável via `getByRole("heading", { level: 3 })` (FR-009).
- `CardTitle` com `as="h2"` (ou qualquer `h1`-`h6`) renderiza o elemento correspondente, localizável via `getByRole("heading", { level: N })` (FR-009).
- Nenhum consumidor existente de `CardTitle` é afetado (zero consumidores externos hoje, confirmado por grep antes da task).
