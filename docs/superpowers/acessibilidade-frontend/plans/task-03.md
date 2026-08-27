# Task 3: `PaginationLink` — `href` obrigatório + ícones decorativos ocultos [FR-007, FR-010]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`apps/frontend/src/components/ui/pagination.tsx` tem dois problemas de acessibilidade: (1) os ícones `ChevronLeft`/`ChevronRight` dentro de `PaginationPrevious`/`PaginationNext` não têm `aria-hidden`, então leitores de tela podem tentar descrevê-los apesar do `<a>` pai já ter `aria-label` ("Go to previous/next page"); (2) `PaginationLinkProps` herda `href` como opcional de `AnchorHTMLAttributes`, permitindo (em tese) um `<a>` sem `href` — um link sem `href` não entra na ordem de tabulação nem tem `role="link"` para a Accessibility Tree, quebrando navegação por teclado. A task oculta os dois ícones de leitores de tela e torna `href` obrigatório no tipo.

Verificação de consumidores: `PaginationLink` (e, por composição, `PaginationPrevious`/`PaginationNext`) é usado em `apps/frontend/src/components/ui/numbered-pagination.tsx` (linhas 57-61, 65-72, 75-79) **sem** passar `href` — o componente usa apenas `onClick` com `event.preventDefault()` para navegação client-side (paginação sem mudança de URL). Tornar `href` obrigatório no tipo quebra esses 3 call sites no `tsc:check`; portanto esta task também adiciona `href="#"` a esses 3 usos em `numbered-pagination.tsx` (mesmo padrão já usado em `pagination.test.tsx`, que passa `href="#"` para `PaginationPrevious`/`PaginationNext"), preservando o comportamento atual (nenhuma navegação real ocorre, `onClick` já intercepta com `preventDefault()`) e evitando link vazio.

## Arquivos

- Modify: `apps/frontend/src/components/ui/pagination.tsx`
- Modify: `apps/frontend/src/components/ui/numbered-pagination.tsx`
- Test: Modify `apps/frontend/src/components/ui/pagination.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `PaginationLink`/`PaginationPrevious`/`PaginationNext` são primitivas shadcn/ui compostas sobre `buttonVariants` — a mudança de tipo e o `aria-hidden` nos ícones devem seguir o padrão de composição já usado no arquivo.
- `typescript-advanced`: tornar `href` obrigatório exige compor `Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }` em `PaginationLinkProps` sem quebrar a interseção com `Pick<ButtonProps, "size">`.
- `vercel-composition-patterns`: `PaginationPrevious`/`PaginationNext` reexportam `ComponentProps<typeof PaginationLink>` — a mudança de tipo em `PaginationLink` se propaga automaticamente para os dois, validar que a composição continua coerente.
- `wcag-audit-patterns`: ícone decorativo redundante ao `aria-label` do elemento pai deve ser `aria-hidden="true"` (critério 1.1.1/4.1.2); link sem `href` não é focável nem tem `role="link"` (critério 2.1.1/4.1.2) — padrão central desta task.
- `test-antipatterns`: os novos testes devem validar o contrato observável (`aria-hidden` no SVG renderizado, `href` refletido no DOM), não reimplementar a lógica do componente.

## Passos

- **Step 1: Write the failing test**

Adicione as duas novas asserções abaixo aos describes existentes de `apps/frontend/src/components/ui/pagination.test.tsx` (uma dentro de `describe("PaginationPrevious", ...)`, outra dentro de `describe("PaginationNext", ...)`, como novo `test(...)` ao final de cada bloco, antes do `})` de fechamento):

```tsx
test("oculta o ícone decorativo de leitores de tela e preserva o href", () => {
	render(<PaginationPrevious href="/page/1" />)
	const link = screen.getByRole("link", { name: "Go to previous page" })
	expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
	expect(link).toHaveAttribute("href", "/page/1")
})
```

```tsx
test("oculta o ícone decorativo de leitores de tela e preserva o href", () => {
	render(<PaginationNext href="/page/2" />)
	const link = screen.getByRole("link", { name: "Go to next page" })
	expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
	expect(link).toHaveAttribute("href", "/page/2")
})
```

A asserção `toHaveAttribute("href", ...)` já passa hoje (o `<a>` sempre repassou `href` via spread de `props`) — ela documenta o contrato de navegação, não é a que falha. A asserção que falha hoje é `toHaveAttribute("aria-hidden", "true")` no `<svg>`, porque `ChevronLeft`/`ChevronRight` não têm esse atributo ainda. A mudança de tipo de `href` (obrigatório) não tem teste Vitest próprio nesta task: é um contrato TypeScript, verificado pela checagem de tipos da barreira de integração, não por um `Run:` desta task.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pagination.test.tsx`
Expected: FAIL — as 2 novas asserções de `aria-hidden` falham com `expected null to have attribute "aria-hidden"` (a asserção de `href` em cada teste passa isoladamente, mas o teste falha no todo pela asserção de `aria-hidden`); os 4 testes pré-existentes continuam passando.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/ui/pagination.tsx`, adicione `aria-hidden="true"` aos dois ícones (linhas 81 e 97) e torne `href` obrigatório no tipo (linhas 44-47):

```tsx
type PaginationLinkProps = {
	isActive?: boolean
} & Pick<ButtonProps, "size"> &
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }
```

```tsx
function PaginationPrevious({
	className,
	...props
}: ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			size="icon"
			className={cn("", className)}
			{...props}
		>
			<ChevronLeft className="h-4 w-4" aria-hidden="true" />
		</PaginationLink>
	)
}

function PaginationNext({
	className,
	...props
}: ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			size="icon"
			className={cn("", className)}
			{...props}
		>
			<ChevronRight className="h-4 w-4" aria-hidden="true" />
		</PaginationLink>
	)
}
```

No mesmo diff, atualize `apps/frontend/src/components/ui/numbered-pagination.tsx` para satisfazer o novo tipo `href: string` nos 3 usos afetados (paginação client-side, sem navegação real — `onClick` já intercepta com `preventDefault()`):

```tsx
<PaginationPrevious
	href="#"
	data-testid={`${testIdPrefix}-prev`}
	aria-disabled={page <= 1}
	onClick={handlePrev}
/>
```

```tsx
<PaginationLink
	href="#"
	data-testid={`${testIdPrefix}-page-${p}`}
	isActive={p === page}
	onClick={(event) => handleSelect(event, p)}
>
	{p}
</PaginationLink>
```

```tsx
<PaginationNext
	href="#"
	data-testid={`${testIdPrefix}-next`}
	aria-disabled={page >= totalPages}
	onClick={handleNext}
/>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pagination.test.tsx`
Expected: PASS — 6 testes passando (`Test Files 1 passed`, `Tests 6 passed`).

- **Step 5: Commit** *(execução paralela — se seu prompt indicar que você é um de vários implementadores em uma wave compartilhada, pule este passo e apenas reporte os arquivos alterados; o orquestrador comita na barreira de integração.)*

```bash
git add apps/frontend/src/components/ui/pagination.tsx apps/frontend/src/components/ui/pagination.test.tsx apps/frontend/src/components/ui/numbered-pagination.tsx
git commit -m "fix(a11y): oculta icones decorativos e torna href obrigatorio em PaginationLink"
```

## Critérios de Sucesso

- `ChevronLeft` (em `PaginationPrevious`) e `ChevronRight` (em `PaginationNext`) têm `aria-hidden="true"`, verificável via `link.querySelector("svg")` (FR-007).
- `PaginationLinkProps` exige `href: string` no tipo — a checagem de tipos da barreira de integração falha se qualquer JSX que renderiza `PaginationLink`/`PaginationPrevious`/`PaginationNext` omitir `href` (FR-010).
- `numbered-pagination.tsx` compila com o novo tipo (3 call sites com `href="#"` explícito) e seus 8 testes existentes continuam passando sem alteração de comportamento.
