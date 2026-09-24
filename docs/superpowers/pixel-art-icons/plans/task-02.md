# Task 2: Menu lateral com ícones pixel-art

**Status:** PENDING

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** standard

**Depends on:** task-01

## Visão Geral

Troca os ícones do menu lateral (`authenticated-shell.tsx`) de `lucide-react` para o módulo `pixel-icons` e leva itens de navegação, botão Sair e botões de recolher/expandir de `h-4.5 w-4.5` para `h-6 w-6` (24px, a grade exata da lib). Ativo, hover, recolhido e cores continuam dos tokens existentes; só o glifo muda.

## Arquivos

- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/components/layout/authenticated-shell.test.tsx`

## Interfaces

- **Consome:** de `@/components/ui/pixel-icons` (task-01): `Building2`, `CalendarDays`, `CheckCircle`, `CreditCard`, `LayoutDashboard`, `LogOut`, `Megaphone`, `PanelLeftClose`, `PanelLeftOpen`, `User`, `Users`, `Wallet`, todos do tipo `PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`; cada um renderiza `<svg>` com `className` repassado e `aria-hidden="true"` por padrão.
- **Produz:** N/A (`NavItem.icon` continua `React.ElementType`; nenhuma assinatura nova).

### Skills a invocar

- `tailwindcss`: troca de `h-4.5 w-4.5` por `h-6 w-6` mantendo `shrink-0`.
- `wcag-audit-patterns`: ícones seguem decorativos (`aria-hidden`); o nome acessível continua no `aria-label` do link e dos botões.
- `test-antipatterns`: o teste novo asserta o que é renderizado (classes e atributos do svg), sem mock do módulo de ícones.
- `vercel-composition-patterns`: `NavItem.icon` segue recebendo referência de componente (`React.ElementType`), sem props booleanas novas.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/pixel-art-icons-visual.md` (baseline de tamanho, estados e mapeamento; é norte, não pixel-final)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `playwright-cli`, `run` e a automação de navegador `claude-in-chrome`, descobertas por descrição e nunca fixadas; se nenhuma servir, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** menu lateral com ícones 24px (`h-6 w-6`), `currentColor`; ativo em `sidebar-active` com `sidebar-active-foreground`, inativo em `sidebar-muted`, hover `bg-white/5` + `sidebar-foreground`, Sair em hover `text-destructive`; recolhido centralizado no rail de 76px; `crispEdges`, sem `stroke`, nunca glow.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`. Confirme com o usuário se existe fonte de design original; a ausência é resposta válida e roteia para a implementação manual contra o mockup `../specs/mockups/pixel-art-icons-visual.md`. Só redescubra ferramentas se o campo estiver em branco.

- **Step 1: Write the failing test**

Em `apps/frontend/src/components/layout/authenticated-shell.test.tsx`, dentro de `describe("AuthenticatedShell — VOLT", ...)`, logo após o teste `"marca Calendário como ativo na rota de calendário"`, acrescente:

```tsx
	test("ícones do menu lateral têm 24px (h-6 w-6), são decorativos e nítidos", () => {
		setRole("MEMBER")
		renderWithProviders(
			<AuthenticatedShell>
				<p>conteúdo</p>
			</AuthenticatedShell>,
		)
		const navIcon = screen
			.getByRole("link", { name: /Dashboard/ })
			.querySelector("svg")
		const logoutIcon = screen
			.getByRole("button", { name: /sair/i })
			.querySelector("svg")
		const toggleIcon = screen
			.getByRole("button", { name: "Recolher menu" })
			.querySelector("svg")

		for (const icon of [navIcon, logoutIcon, toggleIcon]) {
			expect(icon).not.toBeNull()
			expect(icon).toHaveClass("h-6", "w-6")
			expect(icon).toHaveAttribute("aria-hidden", "true")
			expect(icon).toHaveAttribute("shape-rendering", "crispEdges")
		}
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: FAIL no teste `ícones do menu lateral têm 24px ...` (o svg atual do lucide tem `h-4.5 w-4.5` e não tem `shape-rendering`); os demais testes do arquivo passam.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/layout/authenticated-shell.tsx`:

1. Import (linhas 4 a 17). Antes:

```tsx
import {
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
	Wallet,
} from "lucide-react"
```

Depois (mesma lista de nomes, só muda a origem; a posição do bloco entre os imports é a que o Biome normalizar):

```tsx
import {
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
	Wallet,
} from "@/components/ui/pixel-icons"
```

2. Linha 108 (item de navegação). Antes: `<Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />`. Depois: `<Icon className="h-6 w-6 shrink-0" aria-hidden="true" />`.

3. Linha 201. Antes: `<PanelLeftOpen className="h-4.5 w-4.5" aria-hidden="true" />`. Depois: `<PanelLeftOpen className="h-6 w-6" aria-hidden="true" />`.

4. Linha 203. Antes: `<PanelLeftClose className="h-4.5 w-4.5" aria-hidden="true" />`. Depois: `<PanelLeftClose className="h-6 w-6" aria-hidden="true" />`.

5. Linha 261. Antes: `<LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />`. Depois: `<LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />`.

`NavItem.icon` permanece `React.ElementType`: nenhuma outra edição de tipo.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/components/layout/authenticated-shell.test.tsx`
Expected: PASS (todos os testes do arquivo; itens ainda achados por `aria-label` e tooltip no recolhido intactos).

- **Step 5: Verificar que nenhum import do pacote antigo restou no arquivo**

Run: `rg -n "lucide-react|h-4\.5|w-4\.5" apps/frontend/src/components/layout/authenticated-shell.tsx`
Expected: nenhuma linha de saída (código de saída 1 do `rg`).

- **Step 6: Conferência visual (manual, sem bloquear)**

Com a ferramenta descoberta no Step 0 (ou o navegador do usuário), abra o app autenticado e confira contra o mockup: menu expandido, recolhido (rail de 76px, glifos centralizados, tooltip), item ativo, hover, Sair em hover destrutivo, tema claro e escuro. Os glifos devem estar nítidos em 24px e sem glow. Registre qualquer desvio no relatório da task.

- **Step 7: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/components/layout/authenticated-shell.test.tsx
git commit -m "feat(frontend): menu lateral com ícones pixel-art de 24px

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- Itens de navegação, Sair e recolher/expandir renderizam svg pixel-art com `h-6 w-6`, `aria-hidden="true"` e `shape-rendering="crispEdges"`.
- Itens continuam achados por `aria-label`; o recolhido continua mostrando tooltip.
- `authenticated-shell.tsx` não importa mais `lucide-react` nem usa `h-4.5`/`w-4.5`.
