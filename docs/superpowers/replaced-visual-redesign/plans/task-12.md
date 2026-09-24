# Task 12: Tela de Usuários na direção Noite neon [FR-017, FR-020]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Reestiliza a tela de Usuários na direção aprovada: filtro ativo e linha selecionada em ciano (contorno e fundo suave), Admin em magenta suave, avatar do painel em magenta, aba ativa em ciano, rótulo (eyebrow) em ciano e badges de status mantendo verde, âmbar e vermelho. Nenhuma função muda (filtros com contagem, busca, lista e painel, seleção em lote, abas). O `SegmentedControl` alterado aqui também serve ao filtro de Check-ins e ao alternador de visão de Academias.

## Arquivos

- Modify: `apps/frontend/src/components/ui/segmented-control.tsx`
- Modify: `apps/frontend/src/components/ui/role-badge.tsx`
- Modify: `apps/frontend/src/components/ui/tabs.tsx`
- Modify: `apps/frontend/src/components/ui/eyebrow.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Test: `apps/frontend/src/components/ui/segmented-control.test.tsx`
- Test: `apps/frontend/src/components/ui/role-badge.test.tsx`
- Create (test): `apps/frontend/src/components/ui/tabs.test.tsx`
- Create (test): `apps/frontend/src/components/ui/eyebrow.test.tsx`
- Test: `apps/frontend/src/features/admin/components/user-row.test.tsx`
- Test: `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`

## Interfaces

- **Consome:** tokens de `apps/frontend/src/app/globals.css` (task-01) por utilitários: `border-accent`, `bg-accent/10`, `bg-accent/20`, `text-accent`, `bg-primary`, `text-primary-foreground`, `border-primary/40`, `bg-primary/15`, `border-transparent`. Nomes já existentes no repositório, sem mudar assinatura: `SegmentedControlProps<T>`, `SegmentedItem<T>`, `RoleBadgeProps { role: "ADMIN" | "MEMBER"; className?: string }`, `UserRowProps`, `UserFilterBarProps`, `UserDetailPanelProps`, `statusStripeBorderClass(tone)` de `@/components/ui/status-badge`, `Avatar` (`className` mesclado por `cn`).
- **Produz:** contrato visual reutilizado pelas tarefas 13 e 14, sem mudar assinaturas:
  - `SegmentedControl`: item ativo com classes `border-accent bg-accent/10 text-foreground`; item inativo com `border-transparent`; badge flutuante de contagem `bg-accent text-accent-foreground`; badge inline ativo `bg-accent/20`.
  - `RoleBadge` ADMIN: `border-primary/40 bg-primary/15 text-foreground`.
  - `TabsTrigger` ativo: `data-[state=active]:text-accent`.
  - `Eyebrow`: `text-accent`.
  - `UserRow` selecionada: `border-accent bg-accent/10`.

### Conformidade com as Skills Padrão

- `shadcn`: mudança nos componentes de base (`tabs`, `segmented-control`) por classes de token, mantendo a API e o Radix.
- `tailwindcss`: só utilitários de token; a faixa de status segue por `statusStripeBorderClass` (por último no `cn`).
- `vercel-composition-patterns`: nenhuma prop nova; o consumidor mantém o controle.
- `wcag-audit-patterns`: ciano e magenta só como contorno ou fundo suave, texto sempre em `foreground` ou `accent` com contraste calculado (task-02); estado ativo não depende só de cor (`aria-pressed`, borda).
- `test-antipatterns`: asserções sobre classes de token (contrato visual) e sobre comportamento, não sobre literais de cor.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-usuarios-visual.md` (tokens em `replaced-visual-redesign-visual.md`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a tela de Usuários? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** eyebrow "Admin" ciano em mono; filtro segmentado de largura total com contagens e item ativo com contorno ciano; linha de usuário como cartão com faixa lateral de 3px na cor do status, selecionada com contorno e fundo ciano suave; badges Ativo verde, Bloqueado âmbar, Inativo vermelho; Admin magenta suave e Membro neutro; painel com avatar grande de iniciais em magenta, e-mail em mono, abas Detalhes/Permissões/Atividade (ativa em ciano); ciano marca seleção e filtro ativo, magenta só ação primária; sem arte pixel

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote (lista de usuários e painel, tema escuro e claro).

- **Step 1: Confirm the props of the files being edited**

Antes de editar, confirmar que as props seguem como o plano assume:

Run: `grep -n "export interface UserFilterBarProps" -A 6 apps/frontend/src/features/admin/components/user-filter-bar.tsx`
Expected: `activeFilter: UserFilter`, `stats?: UserStats`, `onFilterChange: (filter: UserFilter) => void`, `className?: string`. Se divergir, usar a interface real e ajustar só o teste do passo 2.

- **Step 2: Write the failing test**

Acrescentar ao final de `apps/frontend/src/components/ui/segmented-control.test.tsx`:

```tsx
describe("SegmentedControl — direção Noite neon", () => {
	test("item ativo tem contorno e fundo suave em ciano; inativo tem borda transparente", () => {
		render(
			<SegmentedControl items={ITEMS} value="todos" onValueChange={vi.fn()} />,
		)
		const active = screen.getByRole("button", { name: /Todos/ })
		const inactive = screen.getByRole("button", { name: /Ativos/ })
		expect(active).toHaveClass("border-accent", "bg-accent/10", "text-foreground")
		expect(inactive).toHaveClass("border-transparent")
		expect(inactive).not.toHaveClass("border-accent")
	})

	test("badge flutuante de contagem usa o acento (ciano), não o primary", () => {
		render(
			<SegmentedControl
				items={ITEMS}
				value="todos"
				onValueChange={vi.fn()}
				countFloat
			/>,
		)
		const badge = screen.getByText("12")
		expect(badge).toHaveClass("bg-accent", "text-accent-foreground")
		expect(badge).not.toHaveClass("bg-primary")
	})
})
```

Acrescentar ao final de `apps/frontend/src/components/ui/role-badge.test.tsx`:

```tsx
describe("RoleBadge — direção Noite neon", () => {
	test("Admin usa magenta suave (primary translúcido)", () => {
		render(<RoleBadge role={ADMIN} />)
		expect(screen.getByText("Admin")).toHaveClass(
			"border-primary/40",
			"bg-primary/15",
		)
	})

	test("Membro permanece neutro", () => {
		render(<RoleBadge role={MEMBER} />)
		expect(screen.getByText("Membro")).toHaveClass("bg-surface-2", "border-border")
	})
})
```

Criar `apps/frontend/src/components/ui/tabs.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Tabs, TabsList, TabsTrigger } from "./tabs"

describe("TabsTrigger", () => {
	test("a aba ativa é destacada em ciano por token", () => {
		render(
			<Tabs value="a">
				<TabsList>
					<TabsTrigger value="a">Detalhes</TabsTrigger>
					<TabsTrigger value="b">Permissões</TabsTrigger>
				</TabsList>
			</Tabs>,
		)
		const active = screen.getByRole("tab", { name: "Detalhes" })
		expect(active).toHaveAttribute("data-state", "active")
		expect(active.className).toContain("data-[state=active]:text-accent")
		expect(active.className).not.toContain("data-[state=active]:text-foreground")
	})
})
```

Criar `apps/frontend/src/components/ui/eyebrow.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Eyebrow } from "./eyebrow"

describe("Eyebrow", () => {
	test("rótulo em ciano, mono e maiúsculo", () => {
		render(<Eyebrow>Admin</Eyebrow>)
		expect(screen.getByText("Admin")).toHaveClass(
			"font-mono",
			"uppercase",
			"text-accent",
		)
	})
})
```

Em `apps/frontend/src/features/admin/components/user-row.test.tsx`, atualizar as asserções que mencionam `bg-accent/40` para `bg-accent/10` (linhas do teste `destaque e marcado usam cores de fundo distintas` (o título real no arquivo começa com um prefixo de requisito antigo; localizar por esse trecho), do teste `aplica cor de marcado (não de destaque)...` e o `not.toContain("bg-accent/40")`), e acrescentar ao final do arquivo:

```tsx
describe("UserRow — direção Noite neon", () => {
	test("linha selecionada usa contorno e fundo suave em ciano e mantém a faixa de status de 3px", () => {
		const user = buildUser({ status: "activated" })
		render(<UserRow user={user} isSelected />)
		const row = screen.getByTestId(`user-row-${user.id}`)
		expect(row).toHaveClass("border-accent", "bg-accent/10", "border-l-[3px]")
		expect(row).toHaveClass("border-l-success")
	})

	test("a faixa lateral acompanha o status: bloqueado em âmbar e inativo em vermelho", () => {
		const locked = buildUser({ id: "u2", status: "locked" })
		const suspended = buildUser({ id: "u3", status: "suspended" })
		render(
			<ul>
				<UserRow user={locked} />
				<UserRow user={suspended} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u2")).toHaveClass("border-l-warning")
		expect(screen.getByTestId("user-row-u3")).toHaveClass("border-l-destructive")
	})
})
```

Acrescentar ao final de `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx` (usa `renderPanel` e `buildUser`):

```tsx
describe("UserDetailPanel — direção Noite neon", () => {
	test("o avatar do cabeçalho usa iniciais em magenta", () => {
		renderPanel(buildUser())
		const avatar = screen
			.getByRole("banner")
			.querySelector('span[aria-hidden="true"]')
		expect(avatar).toHaveClass("bg-primary", "text-primary-foreground")
		expect(avatar).not.toHaveClass("bg-accent")
	})

	test("mantém as três abas, com Detalhes ativa", () => {
		renderPanel(buildUser())
		expect(screen.getByRole("tab", { name: "Detalhes" })).toHaveAttribute(
			"data-state",
			"active",
		)
		expect(screen.getByRole("tab", { name: "Permissões" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Atividade" })).toBeInTheDocument()
	})
})
```

Em `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`: não há mudança de asserção esperada (o filtro herda o `SegmentedControl`); rodar o arquivo no passo 5 para confirmar.

- **Step 3: Run test to verify it fails**

Run: `pnpm --filter frontend test src/components/ui/segmented-control.test.tsx src/components/ui/role-badge.test.tsx src/components/ui/tabs.test.tsx src/components/ui/eyebrow.test.tsx src/features/admin/components/user-row.test.tsx src/features/admin/components/user-detail/user-detail-panel.test.tsx`
Expected: FAIL. `segmented-control`: `expected class to contain "border-accent"`; `role-badge`: falta `border-primary/40`; `tabs`: `data-[state=active]:text-accent` ausente; `eyebrow`: `text-accent` ausente (hoje `text-subtle`); `user-row`: `bg-accent/10` ausente (hoje `bg-accent/40`); `user-detail-panel`: avatar com `bg-accent`.

- **Step 4: Write minimal implementation**

4a. `apps/frontend/src/components/ui/segmented-control.tsx`:

- `InlineBadge`: trocar a classe do ramo ativo por `"bg-accent/20 text-foreground"` (mantém `"bg-foreground/10"` no inativo).
- `FloatBadge`: trocar `bg-primary ... text-primary-foreground` por `bg-accent ... text-accent-foreground` (mantém o restante da classe).
- Botão: substituir a classe base e a do ramo ativo por:

```tsx
						className={cn(
							"inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
							active
								? "border-accent bg-accent/10 text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
							countFloat && "relative",
						)}
```

4b. `apps/frontend/src/components/ui/role-badge.tsx`: trocar `"border-accent/45 bg-accent/20 text-foreground"` por `"border-primary/40 bg-primary/15 text-foreground"`.

4c. `apps/frontend/src/components/ui/tabs.tsx`: em `TabsTrigger`, trocar `"data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"` por `"data-[state=active]:bg-background data-[state=active]:text-accent data-[state=active]:shadow-sm"`.

4d. `apps/frontend/src/components/ui/eyebrow.tsx`: trocar `text-subtle` por `text-accent`.

4e. `apps/frontend/src/features/admin/components/user-row.tsx`: em `rowClassName`, trocar `isSelected && "border-accent bg-accent/40"` por `isSelected && "border-accent bg-accent/10"`. Manter a faixa de status por último no `cn` e o e-mail com `text-highlight-foreground` quando selecionada.

4f. `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`: em `UserIdentityHeader`, trocar `<Avatar name={user.name} size="lg" />` por `<Avatar name={user.name} size="lg" className="bg-primary text-primary-foreground" />`.

- **Step 5: Run test to verify it passes**

Run: `pnpm --filter frontend test src/components/ui/segmented-control.test.tsx src/components/ui/role-badge.test.tsx src/components/ui/tabs.test.tsx src/components/ui/eyebrow.test.tsx src/components/ui/avatar.test.tsx src/features/admin/components/user-row.test.tsx src/features/admin/components/user-filter-bar.test.tsx src/features/admin/components/user-detail/user-detail-panel.test.tsx src/components/ui/status-badge.test.tsx`
Expected: PASS

- **Step 6: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/segmented-control.tsx apps/frontend/src/components/ui/segmented-control.test.tsx apps/frontend/src/components/ui/role-badge.tsx apps/frontend/src/components/ui/role-badge.test.tsx apps/frontend/src/components/ui/tabs.tsx apps/frontend/src/components/ui/tabs.test.tsx apps/frontend/src/components/ui/eyebrow.tsx apps/frontend/src/components/ui/eyebrow.test.tsx apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx
git commit -m "feat(frontend): tela de Usuários na direção Noite neon"
```

## Critérios de Sucesso

- Filtro segmentado com contagem, busca, lista, painel com abas e seleção em lote continuam funcionando; nenhum comportamento mudou (FR-017).
- Filtro ativo e linha selecionada em ciano (contorno e fundo suave); Admin em magenta suave; avatar do painel em magenta; aba ativa e eyebrow em ciano (FR-017).
- A faixa lateral de 3px acompanha o status (verde, âmbar, vermelho) mesmo com a linha selecionada; badges de status mantêm as cores semânticas, sem neon (FR-020).
