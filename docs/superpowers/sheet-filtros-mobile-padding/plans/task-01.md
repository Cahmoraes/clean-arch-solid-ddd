# Task 1: Padding lateral consistente no Sheet base

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/sheet-filtros-mobile-padding-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

O componente base `Sheet` (`apps/frontend/src/components/ui/sheet.tsx`) não aplica padding horizontal ao `SheetContent`, enquanto `SheetHeader` e `SheetFooter` usam `p-4` (padding em todos os lados, incluindo horizontal). Isso faz o corpo do bottom sheet de filtros (chips de status + botões "Limpar"/"Aplicar", em `check-in-filter-bar.tsx` e `user-filter-bar.tsx`) ficar colado nas bordas da tela em mobile, enquanto o título "Filtros" acima mantém 16px de respiro.

Esta task corrige o componente base: `SheetContent` ganha `px-4`; `SheetHeader` e `SheetFooter` trocam `p-4` por `py-4` (mantendo o padding vertical, removendo o horizontal duplicado — que passa a vir do `SheetContent` pai). Os dois consumidores não são modificados; herdam o fix automaticamente.

## Arquivos

- Modify: `apps/frontend/src/components/ui/sheet.tsx`
- Create: `apps/frontend/src/components/ui/sheet.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `Sheet` é um componente base no padrão shadcn/ui (wrapper sobre `radix-ui`) — a mudança edita esse componente diretamente.
- `tailwindcss`: toda a mudança é troca de classes utilitárias Tailwind CSS v4 (`p-4` → `py-4`, adição de `px-4`).
- `test-antipatterns`: escrita do novo teste `sheet.test.tsx` (assinatura de comportamento via classe renderizada, não implementação interna).
- `frontend-design`: ajuste de espaçamento/consistência visual em um componente de UI compartilhado.

### Fidelidade Visual

Artefato curado: `../specs/mockups/sheet-filtros-mobile-padding-visual.md`.

Validar após o Step 4 (teste verde): abrir as duas telas reais (`/admin/usuarios` e `/check-ins`) em viewport mobile (≤414px), abrir o painel "Filtros" e comparar o padding lateral do corpo (chips + botões) contra a coluna "Depois (aprovado)" da tabela Antes/Depois do artefato — deve estar em `16px`, igual ao padding do header.

### Nota de compatibilidade (Reach)

`sheet.tsx` é importado por `check-in-filter-bar.tsx` e `user-filter-bar.tsx` (nenhum dos dois em um write-set desta task). A mudança é puramente aditiva/estética — troca de classes CSS em `SheetContent`/`SheetHeader`/`SheetFooter`, sem alteração de props, assinatura exportada ou estrutura DOM — logo não exige alteração nesses 2 consumidores. Confirmar no Step 4 e/ou rodando as suítes desses 2 arquivos (ver `## Critérios de Sucesso`) que nada quebrou.

## Passos

- **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "./sheet"

describe("Sheet", () => {
	test("SheetContent tem padding horizontal e SheetHeader/SheetFooter não duplicam o padding", () => {
		const { container } = render(
			<Sheet open>
				<SheetContent side="bottom">
					<SheetHeader>
						<SheetTitle>Filtros</SheetTitle>
					</SheetHeader>
					<SheetFooter>rodapé</SheetFooter>
				</SheetContent>
			</Sheet>,
		)

		const content = screen.getByRole("dialog")
		expect(content).toHaveClass("px-4")

		const header = container.querySelector('[data-slot="sheet-header"]')
		expect(header).toHaveClass("py-4")
		expect(header).not.toHaveClass("p-4")

		const footer = container.querySelector('[data-slot="sheet-footer"]')
		expect(footer).toHaveClass("py-4")
		expect(footer).not.toHaveClass("p-4")
	})
})
```

Salvar em `apps/frontend/src/components/ui/sheet.test.tsx`.

- **Step 2: Run test to verify it fails**

Run (a partir de `apps/frontend`): `pnpm exec vitest run src/components/ui/sheet.test.tsx`
Expected: FAIL — `content` não tem a classe `px-4` (assert `toHaveClass("px-4")` falha).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/ui/sheet.tsx`, dentro de `SheetContent`, adicionar `px-4` à string de classes base (a mesma string usada para todos os valores de `side`):

```tsx
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					"fixed z-50 flex flex-col gap-4 bg-background px-4 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
					side === "right" &&
						"inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
					side === "left" &&
						"inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
					side === "top" &&
						"inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
					side === "bottom" &&
						"inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
					className,
				)}
				{...props}
			>
```

Em `SheetHeader`, trocar `p-4` por `py-4`:

```tsx
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 py-4", className)}
			{...props}
		/>
	)
}
```

Em `SheetFooter`, trocar `p-4` por `py-4`:

```tsx
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2 py-4", className)}
			{...props}
		/>
	)
}
```

- **Step 4: Run test to verify it passes**

Run (a partir de `apps/frontend`): `pnpm exec vitest run src/components/ui/sheet.test.tsx`
Expected: PASS (1 test file, 1 test).

- **Step 5: Commit** *(sequential execution only — em execução paralela, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/components/ui/sheet.tsx apps/frontend/src/components/ui/sheet.test.tsx
git commit -m "fix: adiciona padding lateral consistente ao Sheet base"
```

## Verificação completa antes do commit

Esta task só toca `apps/frontend`; das 9 configs de teste do monorepo, apenas a suíte frontend é relevante aqui. Rodar, a partir de `apps/frontend`:

```bash
pnpm exec vitest run src/components/ui/sheet.test.tsx
pnpm exec vitest run src/features/check-ins/components/check-in-filter-bar.test.tsx
pnpm exec vitest run src/features/admin/components/user-filter-bar.test.tsx
```

Expected: todos os 3 comandos PASS.

## Critérios de Sucesso

- `SheetContent` renderiza com a classe `px-4` para qualquer valor de `side`.
- `SheetHeader` e `SheetFooter` não duplicam mais o padding horizontal (`p-4` removido, `py-4` presente).
- `sheet.test.tsx` passa.
- Nenhuma mudança em `check-in-filter-bar.tsx` ou `user-filter-bar.tsx` — herdam o fix via `sheet.tsx`.
- `check-in-filter-bar.test.tsx` e `user-filter-bar.test.tsx` continuam passando (nenhuma asserção de classe CSS nesses arquivos hoje).
