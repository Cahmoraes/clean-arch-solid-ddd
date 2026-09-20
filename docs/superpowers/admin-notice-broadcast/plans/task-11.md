# Task 11: Item Novo aviso no menu de administração [FR-014]

**Status:** PENDING
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Adiciona o item "Novo aviso" (ícone `Megaphone` do lucide-react) ao grupo ADMIN da sidebar, depois de Analytics, apontando para `/admin/avisos/novo`. O grupo só é renderizado quando `isAdmin`, então `MEMBER` não vê o item. O item ativo usa o estilo `sidebar-active` existente (`aria-current="page"`). A task não depende da página: o link só precisa do `href`.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

### Conformidade com as Skills Padrão

- `test-antipatterns`: os testes renderizam o `AuthenticatedShell` real com papel do usuário no store e asseveram o que aparece (link, `href`, `aria-current`); nada de asserção em classes internas.
- `no-workarounds`: o item entra na lista `ADMIN_NAV_ITEMS`, sem condição extra de papel duplicada (o grupo já é restrito a `isAdmin`).
- `vercel-react-best-practices`: a lista de itens continua constante de módulo, sem custo por render.
- `shadcn`: reutiliza `SidebarNavItem` e tokens da sidebar (`sidebar-active`); nenhum componente novo.
- `tailwindcss`: nenhuma classe nova; o estilo do item é o do `SidebarNavItem`.
- `wcag-audit-patterns`: o link expõe nome acessível (`aria-label="Novo aviso"`, funciona com a sidebar recolhida) e `aria-current="page"` quando ativo; o ícone é decorativo (`aria-hidden`).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-notice-broadcast-visual.md` (seção Estrutura: item "Novo aviso" com ícone `Megaphone` no grupo ADMIN, depois de Analytics; estado ativo com fundo `sidebar-active`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `frontend-design` e `impeccable` (qualidade de UI) e `playwright-cli` ou `claude-in-chrome` (conferir a sidebar renderizada); se indisponíveis na execução, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** item no grupo ADMIN após Analytics, ícone `Megaphone` (lucide), estado ativo `bg-sidebar-active` com texto `sidebar-active-foreground`, mesmo `SidebarNavItem` dos demais itens

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`. Confirmar com o usuário se existe fonte de design original (URL/export); se não houver, e sem ferramenta de fidelidade disponível, construir manualmente contra o mockup curado em `../specs/mockups/admin-notice-broadcast-visual.md` (norte, não pixel-final). Este passo nunca bloqueia.

- **Step 1: Write the failing test**

Adicionar ao final de `apps/frontend/src/components/layout/authenticated-shell.test.tsx`, fora dos `describe` existentes, reutilizando os helpers do módulo (`setRole`, `setPathname`, `renderWithProviders`):

```tsx
describe("AuthenticatedShell — item Novo aviso", () => {
	test("ADMIN vê o link Novo aviso apontando para /admin/avisos/novo", () => {
		setRole("ADMIN")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(screen.getByRole("link", { name: "Novo aviso" })).toHaveAttribute(
			"href",
			"/admin/avisos/novo",
		)
	})

	test("o link fica ativo em /admin/avisos/novo", () => {
		setRole("ADMIN")
		setPathname("/admin/avisos/novo")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(screen.getByRole("link", { name: "Novo aviso" })).toHaveAttribute(
			"aria-current",
			"page",
		)
	})

	test("o link não fica ativo em outra rota de administração", () => {
		setRole("ADMIN")
		setPathname("/admin/usuarios")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(
			screen.getByRole("link", { name: "Novo aviso" }),
		).not.toHaveAttribute("aria-current")
	})

	test("MEMBER não vê o link Novo aviso", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)

		expect(
			screen.queryByRole("link", { name: "Novo aviso" }),
		).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/layout/authenticated-shell.test.tsx -t "item Novo aviso"`
Expected: FAIL - os três testes de ADMIN falham com `Unable to find an accessible element with the role "link" and name "Novo aviso"`; o teste de MEMBER passa (o item ainda não existe para ninguém).

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/components/layout/authenticated-shell.tsx
// import do lucide-react, em ordem alfabética (Megaphone entre LogOut e PanelLeftClose)
import {
	BarChart3,
	Building2,
	CalendarDays,
	CheckCircle,
	CreditCard,
	LayoutDashboard,
	LogOut,
	Megaphone,
	PanelLeftClose,
	PanelLeftOpen,
	User,
	Users,
} from "lucide-react"

// lista de itens de administração
const ADMIN_NAV_ITEMS: ReadonlyArray<NavItem> = [
	{ href: "/admin/usuarios", label: "Usuários", icon: Users },
	{ href: "/admin/check-ins", label: "Check-ins", icon: CheckCircle },
	{ href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
	{ href: "/admin/avisos/novo", label: "Novo aviso", icon: Megaphone },
]
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS (arquivo inteiro, incluindo os 15 testes anteriores e os 4 novos).

- **Step 5: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(layout): adiciona item Novo aviso ao menu de administracao"
```

## Critérios de Sucesso

- O menu de administração exibe "Novo aviso" com `href="/admin/avisos/novo"` para `ADMIN` (FR-014).
- O item fica ativo (`aria-current="page"`) em `/admin/avisos/novo` e inativo nas demais rotas.
- `MEMBER` não vê o item.
