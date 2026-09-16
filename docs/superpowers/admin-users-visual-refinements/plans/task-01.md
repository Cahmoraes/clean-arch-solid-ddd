# Task 1: Status vira faixa lateral; badge de papel único [FR-001, FR-002]

**Status:** DONE
**PRD:** `../prd/prd-admin-users-visual-refinements.md`
**Spec:** `../specs/admin-users-visual-refinements-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`StatusBadge` ganha um `variant` (`"pill"` default, `"stripe"` novo): em modo `stripe`
não renderiza mais o pill visual, só um texto acessível (`sr-only`) para leitor de tela.
`UserRow` passa a usar `variant="stripe"` para o status e aplica a cor do tom como uma
borda esquerda de 3px no card, liberando o espaço antes ocupado pelo segundo pill. O
badge de papel (`RoleBadge`) não muda — continua o único pill visível.

## Arquivos

- Modify: `apps/frontend/src/components/ui/status-badge.tsx`
- Modify: `apps/frontend/src/components/ui/status-badge.test.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `StatusBadge`/`RoleBadge` seguem a convenção de componente shadcn (variant prop, `cn()`, tokens do tema) — a nova variant deve seguir o mesmo padrão.
- `tailwindcss`: nova classe de borda lateral (`border-l-[3px]`) e utilitários de cor por tom (`border-l-success`/`border-l-warning`/`border-l-destructive`) via tokens Tailwind v4.
- `wcag-audit-patterns`: status deixa de ser um pill textual e vira só cor de borda — o texto equivalente (`sr-only`) é obrigatório para não depender só de cor (WCAG 1.4.1).
- `test-antipatterns`: os novos testes de `variant="stripe"` e da classe de borda devem exercitar o componente real, não mockar `StatusBadge`/`cn`.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-users-visual-refinements-visual.md`, seção "1. Badges Membro/Status → faixa lateral de status".
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion.
- **Confirmar com o usuário:** nenhuma fonte de design adicional foi mencionada durante o brainstorming — confirmar rapidamente que continua assim antes de implementar.
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou regressão visual conectada neste ambiente — construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** status vira faixa de 3px na borda esquerda, cor por tom (`success`/`warning`/`danger`→ verde/âmbar/vermelho, `neutral`→ tom de borda neutro); o pill de papel continua como único badge textual visível.

## Passos

- **Step 1: Write the failing test — `StatusBadge` variant `"stripe"` renderiza só texto acessível**

```tsx
// apps/frontend/src/components/ui/status-badge.test.tsx
test("FR-001: variant stripe renderiza só texto acessível, sem pill visual", () => {
	render(
		<StatusBadge tone="success" variant="stripe">
			Ativo
		</StatusBadge>,
	)
	const label = screen.getByText("Ativo")
	expect(label).toHaveClass("sr-only")
	expect(label.closest("span")?.querySelector("svg")).toBeNull()
})
```

- **Step 2: Run test to verify it fails**

Run (de dentro de `apps/frontend`): `pnpm exec vitest run src/components/ui/status-badge.test.tsx`
Expected: FAIL — `variant` não existe em `StatusBadgeProps` (erro de tipo) ou o teste falha porque o `span` renderizado não tem a classe `sr-only` (o componente atual sempre renderiza o pill).

- **Step 3: Write minimal implementation — `variant` prop em `StatusBadge`**

```tsx
// apps/frontend/src/components/ui/status-badge.tsx
export type StatusBadgeVariant = "pill" | "stripe"

export interface StatusBadgeProps {
	tone: StatusTone
	children: ReactNode
	className?: string
	variant?: StatusBadgeVariant
}

const STRIPE_BORDER_CLASSES: Record<StatusTone, string> = {
	success: "border-l-success",
	warning: "border-l-warning",
	danger: "border-l-destructive",
	neutral: "border-l-border-strong",
}

export function statusStripeBorderClass(tone: StatusTone): string {
	return STRIPE_BORDER_CLASSES[tone]
}

export function StatusBadge({
	tone,
	children,
	className,
	variant = "pill",
}: StatusBadgeProps) {
	if (variant === "stripe") {
		return <span className={cn("sr-only", className)}>{children}</span>
	}
	const Icon = isIconTone(tone) ? STATUS_ICON[tone] : null
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
				TONE_CLASSES[tone],
				className,
			)}
		>
			{Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
			{children}
		</span>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/status-badge.test.tsx`
Expected: PASS

- **Step 5: Write the failing test — `statusStripeBorderClass` mapeia cada tom**

```tsx
// apps/frontend/src/components/ui/status-badge.test.tsx
test("FR-001: statusStripeBorderClass mapeia cada tom para a cor de borda correta", () => {
	expect(statusStripeBorderClass("success")).toBe("border-l-success")
	expect(statusStripeBorderClass("warning")).toBe("border-l-warning")
	expect(statusStripeBorderClass("danger")).toBe("border-l-destructive")
	expect(statusStripeBorderClass("neutral")).toBe("border-l-border-strong")
})
```

- **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/ui/status-badge.test.tsx`
Expected: PASS (a implementação do Step 3 já cobre este teste)

- **Step 7: Write the failing test — `UserRow` aplica a faixa e mantém só um pill visível**

```tsx
// apps/frontend/src/features/admin/components/user-row.test.tsx
test("FR-001, FR-002: status vira faixa lateral, papel continua como único pill", () => {
	const user = buildUser({ status: "activated", role: "MEMBER" })
	render(<UserRow user={user} />)

	// FR-002: um único pill visível (papel) — o pill de status não existe mais
	expect(screen.getByText("Membro")).toBeInTheDocument()
	expect(screen.queryByText("Ativo")?.className).not.toMatch(/rounded-full/)

	// FR-001: a faixa lateral usa a cor do tom, e o texto continua acessível
	const row = screen.getByText(user.name).closest("li")
	expect(row).toHaveClass("border-l-success")
	expect(screen.getByText("Ativo")).toHaveClass("sr-only")
})
```

- **Step 8: Run test to verify it fails**

Run: `pnpm exec vitest run src/features/admin/components/user-row.test.tsx`
Expected: FAIL — o `<li>` ainda não tem `border-l-success` (a implementação atual não
aplica a faixa), e o `StatusBadge` ainda renderiza como pill visível.

- **Step 9: Write minimal implementation — `UserRow` usa `variant="stripe"` e aplica a faixa**

```tsx
// apps/frontend/src/features/admin/components/user-row.tsx
// (dentro de rowClassName, adicionar o parâmetro statusStripeClass e a base border-l-[3px])
function rowClassName(
	isInteractive: boolean,
	hasNestedCheckbox: boolean,
	isHighlighted: boolean,
	statusStripeClass: string,
	className?: string,
) {
	return cn(
		"flex w-full items-center gap-4 rounded-lg border border-l-[3px] border-border bg-card px-5 py-4 transition-[border-color] duration-300 ease-out",
		!isHighlighted && statusStripeClass,
		isInteractive && !hasNestedCheckbox && "cursor-pointer hover:border-border-strong",
		isHighlighted && "border-accent bg-accent/40",
		className,
	)
}

// no corpo do componente, antes do JSX de retorno:
const tone = statusTone(user.status)
const statusStripeClass = statusStripeBorderClass(tone)

// no JSX, troca a chamada de rowClassName para incluir statusStripeClass, e o badge de status:
<RoleBadge role={user.role} />
<StatusBadge tone={tone} variant="stripe">
	{statusLabel(user.status)}
</StatusBadge>
```

Import `statusStripeBorderClass` de `@/components/ui/status-badge` no topo do arquivo.

- **Step 10: Run test to verify it passes**

Run: `pnpm exec vitest run src/features/admin/components/user-row.test.tsx`
Expected: PASS

- **Step 11: Commit**

```bash
git add apps/frontend/src/components/ui/status-badge.tsx apps/frontend/src/components/ui/status-badge.test.tsx apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx
git commit -m "feat(admin-users): status do usuario vira faixa lateral [FR-001, FR-002]"
```

## Critérios de Sucesso

- `StatusBadge` com `variant="stripe"` renderiza só um `sr-only` com o texto, sem pill/ícone visual (FR-001).
- `statusStripeBorderClass` mapeia cada `StatusTone` para a classe de borda correta (FR-001).
- No `UserRow`, o `<li>` carrega `border-l-{tone}` quando não está em destaque, e o badge de papel continua sendo o único pill visível no card (FR-001, FR-002).
- Quando o card está em destaque (`isHighlighted`), a faixa de status some e o card mostra `border-accent` — comportamento herdado, coberto pelos testes já existentes de destaque.
