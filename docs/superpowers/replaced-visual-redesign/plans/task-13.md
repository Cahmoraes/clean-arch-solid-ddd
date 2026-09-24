# Task 13: Tela de Check-ins na direção Noite neon [FR-018, FR-020]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01, task-12

## Visão Geral

Reestiliza a tela de Check-ins na direção aprovada: chip de status (verde, âmbar, vermelho) sobre fundo suave, horário em mono à direita, Aprovar em magenta e Rejeitar em vermelho suave, filtro ativo e página ativa da paginação em ciano. As regras de ação não mudam (pendente: Aprovar e Rejeitar; validado: só Rejeitar; rejeitado: nenhuma). O filtro herda o `SegmentedControl` já reestilizado na tarefa 12; a paginação numerada, compartilhada com Academias, é reestilizada aqui.

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-item.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`
- Modify: `apps/frontend/src/components/ui/numbered-pagination.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-item.test.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx`
- Test: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`
- Test: `apps/frontend/src/components/ui/numbered-pagination.test.tsx`

## Interfaces

- **Consome:**
  - De task-12: `SegmentedControl` com item ativo `border-accent bg-accent/10 text-foreground` (usado por `CheckInFilterBar` sem mudar a assinatura).
  - De task-01: tokens `bg-primary`, `text-primary-foreground`, `hover:bg-primary-strong`, `border-accent`, `bg-accent/10`, `bg-success-soft`, `text-success`, `bg-warning-soft`, `text-warning`, `bg-destructive-soft`, `text-destructive`.
  - Já existentes no repositório, sem mudar: `CheckInItemProps { checkIn: CheckIn; action?: React.ReactNode }`, `CheckInFilterBarProps { status: CheckInFilterStatus; onStatusChange: (status: CheckInFilterStatus) => void; stats?: CheckInStats }`, `NumberedPaginationProps { page: number; totalPages: number; onChange: (page: number) => void; testIdPrefix: string; disabled?: boolean; className?: string; variant?: "default" | "accent" }`, `CheckInActions({ checkIn })` com `data-testid` `checkin-approve-<id>` e `checkin-reject-<id>`.
- **Produz:** contrato visual reutilizado pela tarefa 14, sem mudar assinaturas: página ativa de `NumberedPagination` (variantes `default` e `accent`) com `border-accent bg-accent/10 text-foreground`; `CheckInItem` exibe o horário em `<time dateTime=... class="font-mono ...">` só com hora e minuto.

### Conformidade com as Skills Padrão

- `shadcn`: `Button` e `PaginationLink` mantêm suas variantes; a mudança é por classes de token.
- `tailwindcss`: só utilitários de token; chip de status por `*-soft`.
- `vercel-composition-patterns`: nenhuma prop nova; ação continua injetada por `action`.
- `wcag-audit-patterns`: chip com ícone e cor (não só cor), botões de ícone com `aria-label` e tooltip, página ativa com `aria-current` do `PaginationLink`.
- `test-antipatterns`: testes por comportamento (regras de ação) e por classes de token (contrato visual).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-checkins-visual.md` (tokens em `replaced-visual-redesign-visual.md`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a tela de Check-ins? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** item como cartão com chip de ícone à esquerda, nome da academia, "Realizado em dd/mm/aaaa, hh:mm", horário em mono à direita e ações; status só pelo chip (validado verde, pendente âmbar, rejeitado vermelho, sobre fundo suave); Aprovar em magenta, Rejeitar em vermelho suave; filtro ativo com contorno ciano; página ativa em ciano; sem arte pixel

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote (`/check-ins` e `/admin/check-ins`, tema escuro e claro).

- **Step 1: Confirm the props of the files being edited**

Run: `grep -n "export interface CheckInFilterBarProps" -A 5 apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
Expected: `status: CheckInFilterStatus`, `onStatusChange: (status: CheckInFilterStatus) => void`, `stats?: CheckInStats`. Se divergir, usar a interface real no teste do passo 2.

- **Step 2: Write the failing test**

Acrescentar ao final de `apps/frontend/src/features/check-ins/components/check-in-item.test.tsx` (usa `checkIn`, `render`, `screen` já existentes):

```tsx
describe("CheckInItem — direção Noite neon", () => {
	test("o chip de status usa fundo suave semântico: verde, âmbar e vermelho", () => {
		const { container, rerender } = render(<CheckInItem checkIn={checkIn} />)
		expect(container.querySelector('[data-status="pending"]')).toHaveClass(
			"bg-warning-soft",
			"text-warning",
		)
		rerender(<CheckInItem checkIn={{ ...checkIn, status: "validated" }} />)
		expect(container.querySelector('[data-status="validated"]')).toHaveClass(
			"bg-success-soft",
			"text-success",
		)
		rerender(<CheckInItem checkIn={{ ...checkIn, status: "rejected" }} />)
		expect(container.querySelector('[data-status="rejected"]')).toHaveClass(
			"bg-destructive-soft",
			"text-destructive",
		)
	})

	test("o horário aparece em mono à direita, só com hora e minuto, ligado ao instante do check-in", () => {
		const { container } = render(<CheckInItem checkIn={checkIn} />)
		const time = container.querySelector("time")
		expect(time).toHaveClass("font-mono")
		expect(time).toHaveAttribute("dateTime", checkIn.createdAt)
		expect(time?.textContent).toMatch(/^\d{2}:\d{2}$/)
	})

	test("mantém o texto Realizado em com data e hora", () => {
		render(<CheckInItem checkIn={checkIn} />)
		expect(screen.getByText(/Realizado em .+\d{2}:\d{2}/)).toBeInTheDocument()
	})
})
```

Acrescentar ao final de `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx` (usa `renderWithProviders`, `pendingCheckIn` e os mocks já existentes):

```tsx
describe("CheckInActions — direção Noite neon", () => {
	beforeEach(() => {
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation() as unknown as ReturnType<typeof useValidateCheckIn>,
		)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation() as unknown as ReturnType<typeof useRejectCheckIn>,
		)
	})

	test("Aprovar é a ação primária em magenta e Rejeitar é vermelho suave", () => {
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		expect(screen.getByTestId("checkin-approve-ci-1")).toHaveClass(
			"bg-primary",
			"text-primary-foreground",
		)
		expect(screen.getByTestId("checkin-approve-ci-1")).not.toHaveClass("bg-accent")
		expect(screen.getByTestId("checkin-reject-ci-1")).toHaveClass(
			"bg-destructive-soft",
			"text-destructive",
		)
	})
})
```

Acrescentar ao final de `apps/frontend/src/components/ui/numbered-pagination.test.tsx` (abrir o arquivo e reutilizar seus imports e o helper de render; se não houver helper, usar `render` de `@testing-library/react` e `vi.fn()`):

```tsx
describe("NumberedPagination — página ativa em ciano", () => {
	for (const variant of ["default", "accent"] as const) {
		test(`variante ${variant}: a página ativa tem contorno e fundo suave em ciano`, () => {
			render(
				<NumberedPagination
					page={2}
					totalPages={5}
					onChange={vi.fn()}
					testIdPrefix="t"
					variant={variant}
				/>,
			)
			expect(screen.getByTestId("t-page-2")).toHaveClass(
				"border-accent",
				"bg-accent/10",
			)
			expect(screen.getByTestId("t-page-3")).not.toHaveClass("border-accent")
		})
	}
})
```

Acrescentar ao final de `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx` (abrir o arquivo e reutilizar o import de `CheckInFilterBar` e o helper de render existentes):

```tsx
describe("CheckInFilterBar — direção Noite neon", () => {
	test("o filtro ativo tem contorno ciano e os demais borda transparente", () => {
		render(
			<CheckInFilterBar
				status="pending"
				onStatusChange={vi.fn()}
				stats={{ total: 10, pending: 4, validated: 5, rejected: 1 }}
			/>,
		)
		const active = screen.getAllByRole("button", { name: /Pendentes/ })[0]
		const inactive = screen.getAllByRole("button", { name: /Aprovados/ })[0]
		expect(active).toHaveClass("border-accent", "bg-accent/10")
		expect(inactive).toHaveClass("border-transparent")
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `pnpm --filter frontend test src/features/check-ins/components/check-in-item.test.tsx src/features/check-ins/components/check-in-actions.test.tsx src/components/ui/numbered-pagination.test.tsx src/features/check-ins/components/check-in-filter-bar.test.tsx`
Expected: FAIL. `check-in-item`: `time` sem `dateTime` e com texto de data completa (não casa `^\d{2}:\d{2}$`); `check-in-actions`: Aprovar ainda tem `bg-accent` em vez de `bg-primary`; `numbered-pagination`: a página ativa não tem `border-accent`. O teste do chip e o do filtro passam (chip já semântico; filtro herdado da tarefa 12).

- **Step 4: Write minimal implementation**

4a. `apps/frontend/src/features/check-ins/components/check-in-item.tsx`: acrescentar, junto de `formatDate`:

```tsx
function formatTime(iso: string): string {
	try {
		return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(
			new Date(iso),
		)
	} catch {
		return iso
	}
}
```

e trocar o elemento `<time>` por:

```tsx
			<time
				dateTime={checkIn.createdAt}
				className="font-mono text-sm text-muted-foreground tabular max-[560px]:hidden"
			>
				{formatTime(checkIn.createdAt)}
			</time>
```

O texto `Realizado em {formatDate(checkIn.createdAt)}` e o chip (`STATUS_CHIP`) permanecem como estão (a semântica verde, âmbar e vermelho já está correta).

4b. `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`: em `ApproveButton`, trocar `className="bg-accent text-accent-foreground hover:bg-primary-strong"` por `className="bg-primary text-primary-foreground hover:bg-primary-strong"`. `RejectButton` já usa `bg-destructive-soft text-destructive` e não muda.

4c. `apps/frontend/src/components/ui/numbered-pagination.tsx`: substituir `pageLinkClassName` por:

```tsx
function pageLinkClassName(
	variant: NumberedPaginationVariant,
	isActive: boolean,
): string {
	if (isActive) {
		return "h-8 w-8 rounded-sm border-accent bg-accent/10 text-sm font-semibold text-foreground hover:bg-accent/15"
	}
	if (variant !== "accent") return "h-8 w-8 text-sm"
	return "h-8 w-8 rounded-sm text-sm text-muted-foreground hover:text-foreground"
}
```

- **Step 5: Run test to verify it passes**

Run: `pnpm --filter frontend test src/features/check-ins/components/check-in-item.test.tsx src/features/check-ins/components/check-in-actions.test.tsx src/features/check-ins/components/check-in-filter-bar.test.tsx src/components/ui/numbered-pagination.test.tsx src/components/ui/segmented-control.test.tsx`
Expected: PASS. Se um teste antigo de `check-in-item` fixar o texto completo do `<time>`, atualizá-lo para o formato só com hora e minuto; as regras de ação (pendente com as duas ações, validado só Rejeitar, rejeitado nenhuma) seguem cobertas pelos testes existentes de `check-in-actions`.

- **Step 6: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/features/check-ins/components/check-in-item.tsx apps/frontend/src/features/check-ins/components/check-in-item.test.tsx apps/frontend/src/features/check-ins/components/check-in-actions.tsx apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx apps/frontend/src/components/ui/numbered-pagination.tsx apps/frontend/src/components/ui/numbered-pagination.test.tsx
git commit -m "feat(frontend): tela de Check-ins na direção Noite neon"
```

## Critérios de Sucesso

- Filtro por status com contagem, busca, ordenação, itens e ações continuam funcionando; as regras de ação não mudaram (FR-018).
- Chip de status verde, âmbar e vermelho sobre fundo suave; horário em mono à direita; Aprovar em magenta; Rejeitar em vermelho suave (FR-018, FR-020).
- Filtro ativo e página ativa em ciano (FR-018).
