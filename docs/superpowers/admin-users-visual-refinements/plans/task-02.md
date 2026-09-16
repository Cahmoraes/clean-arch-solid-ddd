# Task 2: Cor de seleção destaque vs. marcado + contraste do e-mail [FR-003, FR-004, FR-005]

**Status:** PENDING
**PRD:** `../prd/prd-admin-users-visual-refinements.md`
**Spec:** `../specs/admin-users-visual-refinements-design.md`
**Tier:** standard
**Depends on:** task-01 (mesmo arquivo `user-row.tsx`, para evitar sobreposição de edição)

## Visão Geral

`UserRow` mescla hoje `isSelected` (destaque, aberto no painel) e `checked` (marcado via
checkbox de seleção em massa) num único booleano `isHighlighted`, aplicando a mesma cor
verde aos dois. Esta task separa os dois estados: destaque continua `border-accent
bg-accent/40`; "apenas marcado" passa a usar um novo token neutro
`--color-selected-tint` (adicionado a `globals.css`, light e dark, com o mesmo valor de
`--color-surface-2`). O e-mail sobe de `text-subtle` para `text-muted-foreground`
somente quando o card está em destaque.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: novo token `--color-selected-tint` no bloco `@theme` (Tailwind v4, sem `tailwind.config`) e as classes `bg-selected-tint`/`text-muted-foreground` derivadas dele.
- `wcag-audit-patterns`: a distinção destaque/marcado não pode depender só da checkbox — o contraste do e-mail sobre o verde do destaque também é um requisito de legibilidade (WCAG 1.4.1/1.4.3 na prática).
- `test-antipatterns`: testar as três classes de fundo (normal, destaque, marcado) e a cor do e-mail via o DOM renderizado, não via snapshot de string de classe inteira (evita teste frágil a reordenação de classes irrelevantes).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-users-visual-refinements-visual.md`, seções "2. Cor de seleção — destaque vs. apenas marcado" e "3. Contraste do e-mail sobre o destaque verde".
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion.
- **Confirmar com o usuário:** nenhuma fonte de design adicional foi mencionada — confirmar que continua assim antes de implementar.
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou regressão visual conectada neste ambiente — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** destaque mantém `bg-accent/40`/`border-accent`; marcado usa o novo `--color-selected-tint` (igual a `--color-surface-2`, sem matiz nova); e-mail sobe para `--color-muted-foreground` só no destaque. A faixa lateral de status (Task 1) é preservada nos dois estados.

## Passos

- **Step 1: Write the failing test — token `--color-selected-tint` existe nos dois temas**

```ts
// apps/frontend/src/app/globals.css não tem teste próprio; a existência do token é
// verificada indiretamente pelo teste de UserRow abaixo (Step 5), que depende da
// classe Tailwind `bg-selected-tint` existir e ser aplicada. Este passo apenas
// adiciona o token — sem teste unitário isolado de CSS, pois o projeto não tem
// suíte de CSS/tema separada (confirmado na pesquisa: nenhum arquivo de teste cobre
// globals.css diretamente).
```

- **Step 2: Add the token to `globals.css` (light and dark blocks)**

```css
/* apps/frontend/src/app/globals.css — dentro do bloco @theme (light), logo após
   --color-surface-2 (linha ~39): */
	--color-surface-2: #f7f7f3;
	--color-selected-tint: #f7f7f3;
	--color-surface-3: #efefe9;
```

```css
/* apps/frontend/src/app/globals.css — dentro do bloco .dark (linha ~99), logo após
   --color-surface-2: */
	--color-surface-2: #1d1d1d;
	--color-selected-tint: #1d1d1d;
	--color-surface-3: #242424;
```

- **Step 3: Write the failing test — `UserRow` separa destaque de marcado**

```tsx
// apps/frontend/src/features/admin/components/user-row.test.tsx
test("FR-003, FR-004: destaque e marcado usam cores de fundo distintas", () => {
	const user = buildUser({ status: "activated", role: "MEMBER" })

	const { rerender } = render(
		<UserRow user={user} isSelected checked={false} />,
	)
	const highlightedRow = screen.getByText(user.name).closest("li")
	expect(highlightedRow).toHaveClass("bg-accent/40")
	expect(highlightedRow).not.toHaveClass("bg-selected-tint")

	rerender(<UserRow user={user} isSelected={false} checked />)
	const markedRow = screen.getByText(user.name).closest("li")
	expect(markedRow).toHaveClass("bg-selected-tint")
	expect(markedRow).not.toHaveClass("bg-accent/40")
})

test("FR-005: e-mail sobe para muted-foreground só no destaque", () => {
	const user = buildUser({ status: "activated", role: "MEMBER" })

	const { rerender } = render(
		<UserRow user={user} isSelected checked={false} />,
	)
	expect(screen.getByText(user.email)).toHaveClass("text-muted-foreground")

	rerender(<UserRow user={user} isSelected={false} checked />)
	expect(screen.getByText(user.email)).toHaveClass("text-subtle")
	expect(screen.getByText(user.email)).not.toHaveClass("text-muted-foreground")
})
```

- **Step 4: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/admin/components/user-row.test.tsx`
Expected: FAIL — hoje `isSelected` e `checked` colapsam no mesmo booleano
`isHighlighted`, então o card marcado (`checked`, sem `isSelected`) também recebe
`bg-accent/40`, e o e-mail é sempre `text-subtle`.

- **Step 5: Write minimal implementation — separar os estados em `UserRow`**

```tsx
// apps/frontend/src/features/admin/components/user-row.tsx
// rowClassName ganha os dois estados em vez de um isHighlighted único:
function rowClassName(
	isInteractive: boolean,
	hasNestedCheckbox: boolean,
	isSelected: boolean,
	isMarkedOnly: boolean,
	statusStripeClass: string,
	className?: string,
) {
	return cn(
		"flex w-full items-center gap-4 rounded-lg border border-l-[3px] border-border bg-card px-5 py-4 transition-[border-color] duration-300 ease-out",
		!isSelected && !isMarkedOnly && statusStripeClass,
		isInteractive && !hasNestedCheckbox && "cursor-pointer hover:border-border-strong",
		isSelected && "border-accent bg-accent/40",
		isMarkedOnly && "bg-selected-tint border-border-strong",
		className,
	)
}

// no corpo do componente:
const isMarkedOnly = Boolean(checked) && !isSelected
const emailClassName = cn(
	"truncate font-mono text-[13px]",
	isSelected ? "text-muted-foreground" : "text-subtle",
)

// chamada atualizada:
rowClassName(isInteractive, hasNestedCheckbox, Boolean(isSelected), isMarkedOnly, statusStripeClass, className)

// JSX do e-mail:
<span className={emailClassName}>{user.email}</span>
```

Remove o antigo `Boolean(isSelected || checked)` e o parâmetro `isHighlighted` de
`rowClassName` — foram substituídos pelos dois booleanos independentes acima.

- **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run src/features/admin/components/user-row.test.tsx`
Expected: PASS

- **Step 7: Commit**

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx
git commit -m "feat(admin-users): separa cor de destaque e marcado, ajusta contraste do e-mail [FR-003, FR-004, FR-005]"
```

## Critérios de Sucesso

- Um card em destaque (`isSelected`) mostra `bg-accent/40`/`border-accent` e nunca
  `bg-selected-tint` (FR-003, FR-004).
- Um card apenas marcado (`checked` sem `isSelected`) mostra `bg-selected-tint` e nunca
  `bg-accent/40` (FR-003, FR-004).
- O token `--color-selected-tint` existe nos blocos light e dark de `globals.css`, com o
  mesmo valor de `--color-surface-2` em cada um (FR-004).
- O e-mail usa `text-muted-foreground` somente quando o card está em destaque; nos
  demais estados usa `text-subtle` (FR-005).
