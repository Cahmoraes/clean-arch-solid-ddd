# Task 6: UserRow — checkbox de seleção com suporte a desabilitado [FR-001, FR-003]

**Status:** IN_PROGRESS
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`UserRow` (o card de cada usuário na listagem `/admin/usuarios`) precisa ganhar um
checkbox de seleção à esquerda do `Avatar`, sem quebrar o comportamento existente de
clique/teclado que abre o painel de detalhe (`onSelect`/`aria-pressed`). O checkbox é
opcional via prop `selectable` (fica ausente quando a task não é usada em contexto de
seleção em massa), reporta a mudança via `onToggleSelect(user, checked)`, e pode ser
desabilitado (`selectDisabled`) para usuários que o admin logado não pode gerenciar — a
mesma decisão de permissão já usada pelo painel de detalhe (`resolvePermissions(...).canChangeStatus`,
consumida por quem renderiza `UserRow`, não por `UserRow` em si). O componente `Checkbox`
do shadcn/ui ainda não existe neste projeto — o primeiro passo desta task é gerá-lo via
CLI.

## Arquivos

- Create: `apps/frontend/src/components/ui/checkbox.tsx` (gerado via `pnpm dlx shadcn@latest add checkbox`, executado dentro de `apps/frontend`)
- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: gerar o primitivo `Checkbox` via `pnpm dlx shadcn@latest add checkbox` (não escrever o wrapper Radix manualmente) e seguir a convenção de `components.json` (`"ui": "@/components/ui"`) já usada pelos demais primitivos do projeto.
- `tailwindcss`: o destaque visual do card selecionado já existe (`border-accent bg-accent/40`) — o espaçamento ao redor do novo `Checkbox` deve seguir a mesma cadência (`gap-4`) já usada entre `Avatar` e o bloco de nome/e-mail em `UserRow`, sem introduzir novos valores de espaçamento.
- `vercel-composition-patterns`: `UserRow` precisa continuar aceitando `selectable`/`onToggleSelect` como props opcionais e compostas com as props existentes (`onSelect`, `isSelected`), sem forçar quem já consome `UserRow` sem seleção em massa a passar novas props.
- `vercel-react-best-practices`: isolar o comportamento de `stopPropagation` no wrapper do checkbox como uma função nomeada (não um closure inline duplicado em `onClick` e `onKeyDown`), mantendo o componente legível.
- `context7`: consultar a documentação do `@radix-ui/react-checkbox` (instalado pelo `shadcn add checkbox`) para confirmar a assinatura exata de `onCheckedChange` (`(checked: boolean | "indeterminate") => void`) antes de tipar `onToggleSelect`.
- `vitest`: os novos testes seguem a convenção `describe`/`test` em português já usada no arquivo `user-row.test.tsx` existente.
- `test-antipatterns`: os testes usam `userEvent.click` sobre o checkbox real renderizado (via `screen.getByRole("checkbox")`), nunca chamando `onCheckedChange` diretamente — isso garante que o `stopPropagation` é exercitado de verdade.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/bulk-user-status-actions-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion (HTML gerado a partir dos tokens do projeto, sem Figma/wireframe externo).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela, além do mockup curado? Se não houver resposta, prosseguir com o mockup como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `shadcn` (componentes shadcn/ui) e skill `ui-ux-pro-max` (com integração shadcn/ui MCP) — nenhuma ferramenta de design-to-code externa configurada neste repo.
- **Decisões visuais já tomadas (não refazer):** checkbox dentro do card (`UserRow`), não uma nova coluna/data-table; quando marcado, o card reaproveita o MESMO destaque visual já usado no estado `isSelected` (borda `--accent`, fundo `accent/40` translúcido) — não criar um novo estilo de destaque para "checkbox marcado"; checkbox desabilitado fica visualmente esmaecido (comportamento padrão do atributo `disabled` do primitivo shadcn, sem CSS customizado adicional).

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade
Visual` acima (decididas em tempo de plano). Confirmar com o usuário se existe uma fonte
de design original além do mockup curado — na ausência de resposta, ou se a resposta for
"não", seguir apenas o mockup em `../specs/mockups/bulk-user-status-actions-visual.md`
como norte de layout/tokens (não redeterminar espaçamento/cores a partir do zero). Não há
ferramenta de design-to-code externa configurada neste repo; usar as skills `shadcn` e
`ui-ux-pro-max` já identificadas para a implementação manual do componente.

- **Step 1: Gerar o primitivo Checkbox via shadcn CLI**

Run (a partir de `apps/frontend`): `pnpm dlx shadcn@latest add checkbox`
Expected: cria `apps/frontend/src/components/ui/checkbox.tsx` (wrapper `forwardRef` sobre `@radix-ui/react-checkbox`, no mesmo padrão dos demais primitivos em `src/components/ui/`) e adiciona `@radix-ui/react-checkbox` como dependência em `apps/frontend/package.json`.

- **Step 2: Escrever o teste falho — checkbox aparece e chama onToggleSelect**

Adicionar ao final de `apps/frontend/src/features/admin/components/user-row.test.tsx` (o arquivo já importa `render`, `screen`, `userEvent`, `describe`, `expect`, `test`, `vi`, `AdminUser` e `UserRow`, e já tem o helper `buildUser` no topo — reaproveitar, não duplicar):

```tsx
describe("seleção em massa", () => {
	test("exibe o checkbox quando selectable é true e chama onToggleSelect ao marcar", async () => {
		const user = userEvent.setup()
		const onToggleSelect = vi.fn()
		const adminUser = buildUser()

		render(
			<ul>
				<UserRow
					user={adminUser}
					selectable
					onToggleSelect={onToggleSelect}
				/>
			</ul>,
		)

		const checkbox = screen.getByRole("checkbox")
		await user.click(checkbox)

		expect(onToggleSelect).toHaveBeenCalledTimes(1)
		expect(onToggleSelect).toHaveBeenCalledWith(adminUser, true)
	})
})
```

- **Step 3: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "exibe o checkbox quando selectable é true"`
Expected: FAIL — `screen.getByRole("checkbox")` não encontra nenhum elemento (o checkbox ainda não é renderizado por `UserRow`).

- **Step 4: Implementação mínima — renderizar o Checkbox com stopPropagation**

Em `apps/frontend/src/features/admin/components/user-row.tsx`, atualizar a interface de props e o corpo do componente:

```tsx
import type { KeyboardEvent, MouseEvent } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"

export interface UserRowProps {
	user: AdminUser
	onSelect?: (user: AdminUser) => void
	isSelected?: boolean
	className?: string
	selectable?: boolean
	checked?: boolean
	selectDisabled?: boolean
	onToggleSelect?: (user: AdminUser, checked: boolean) => void
}

// ...statusLabel/statusTone inalterados...

export function UserRow({
	user,
	onSelect,
	isSelected,
	className,
	selectable,
	checked,
	selectDisabled,
	onToggleSelect,
}: UserRowProps) {
	const isInteractive = typeof onSelect === "function"

	function handleSelect() {
		onSelect?.(user)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
		if (event.key !== "Enter" && event.key !== " ") return
		event.preventDefault()
		handleSelect()
	}

	function stopRowInteraction(
		event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>,
	) {
		event.stopPropagation()
	}

	const interactiveProps = isInteractive
		? {
				onClick: handleSelect,
				onKeyDown: handleKeyDown,
				role: "button" as const,
				tabIndex: 0,
				"aria-pressed": Boolean(isSelected),
			}
		: {}

	return (
		<li
			data-testid={`user-row-${user.id}`}
			{...interactiveProps}
			className={cn(
				"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-[border-color] duration-300 ease-out",
				isInteractive && "cursor-pointer hover:border-border-strong",
				isSelected && "border-accent bg-accent/40",
				className,
			)}
		>
			{selectable ? (
				<span onClick={stopRowInteraction} onKeyDown={stopRowInteraction}>
					<Checkbox
						checked={checked}
						disabled={selectDisabled}
						aria-label={`Selecionar ${user.name}`}
						onCheckedChange={(value) => {
							onToggleSelect?.(user, value === true)
						}}
					/>
				</span>
			) : null}
			<Avatar name={user.name} size="sm" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-[15.5px] font-semibold text-card-foreground">
					{user.name}
				</span>
				<span className="truncate font-mono text-[13px] text-subtle">
					{user.email}
				</span>
			</div>
			<RoleBadge role={user.role} />
			<StatusBadge tone={statusTone(user.status)}>
				{statusLabel(user.status)}
			</StatusBadge>
		</li>
	)
}
```

- **Step 5: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "exibe o checkbox quando selectable é true"`
Expected: PASS

- **Step 6: Commit**

```bash
git add apps/frontend/src/components/ui/checkbox.tsx apps/frontend/package.json apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx
git commit -m "feat: adiciona checkbox de seleção em massa ao UserRow"
```

- **Step 7: Escrever o teste falho — checkbox desabilitado não dispara onToggleSelect**

Adicionar ao mesmo bloco `describe("seleção em massa", ...)`:

```tsx
	test("fica disabled quando selectDisabled é true e não dispara onToggleSelect", async () => {
		const user = userEvent.setup()
		const onToggleSelect = vi.fn()

		render(
			<ul>
				<UserRow
					user={buildUser()}
					selectable
					selectDisabled
					onToggleSelect={onToggleSelect}
				/>
			</ul>,
		)

		const checkbox = screen.getByRole("checkbox")
		expect(checkbox).toBeDisabled()

		await user.click(checkbox)

		expect(onToggleSelect).not.toHaveBeenCalled()
	})
```

- **Step 8: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "fica disabled quando selectDisabled é true"`
Expected: PASS (o atributo `disabled` do Radix Checkbox já impede a interação e a emissão de `onCheckedChange`, sem lógica adicional).

- **Step 9: Escrever o teste falho — clicar no checkbox não aciona onSelect do card**

Adicionar ao mesmo bloco `describe`:

```tsx
	test("clicar no checkbox não aciona onSelect do card", async () => {
		const user = userEvent.setup()
		const onSelect = vi.fn()
		const onToggleSelect = vi.fn()

		render(
			<ul>
				<UserRow
					user={buildUser()}
					selectable
					onSelect={onSelect}
					onToggleSelect={onToggleSelect}
				/>
			</ul>,
		)

		await user.click(screen.getByRole("checkbox"))

		expect(onToggleSelect).toHaveBeenCalledTimes(1)
		expect(onSelect).not.toHaveBeenCalled()
	})
```

- **Step 10: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "clicar no checkbox não aciona onSelect do card"`
Expected: PASS

- **Step 11: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS (todos os testes de `user-row.test.tsx`, incluindo os 3 novos)

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 12: Commit final**

```bash
git add apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx
git commit -m "test: cobre checkbox desabilitado e isolamento de clique no UserRow"
```

## Critérios de Sucesso

- `apps/frontend/src/components/ui/checkbox.tsx` existe (gerado via shadcn CLI) e `@radix-ui/react-checkbox` está em `apps/frontend/package.json`.
- `UserRow` renderiza um `Checkbox` antes do `Avatar` quando `selectable` é `true`, controlado por `checked`, e chama `onToggleSelect(user, checked)` ao alternar (FR-001).
- O checkbox fica `disabled` quando `selectDisabled` é `true` e nunca dispara `onToggleSelect` nesse estado (FR-003, respeita a política de permissão decidida por quem renderiza `UserRow`).
- Clicar/teclar no checkbox nunca aciona `onSelect` do card (comportamento de abrir o painel de detalhe permanece isolado).
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem erros.
