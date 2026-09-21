# Task 4: Item do bell com botão de excluir [FR-001, FR-012, FR-013]

**Status:** PENDING
**PRD:** `../prd/prd-notification-delete.md`
**Spec:** `../specs/notification-delete-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Dá ao `NotificationItem` (`apps/frontend/src/components/notification/notification-item.tsx`) a ação de excluir. O `<li>` passa a conter dois botões irmãos: o botão principal de hoje (marca como lida) e um botão de excluir posicionado sobre o lugar da hora, nunca aninhado (botão dentro de botão é HTML inválido). O botão de excluir tem nome acessível "Excluir notificação", 32px, ícone `Trash2` de 16px, é revelado por hover ou foco da linha, fica sempre visível em `@media (hover: none)`, e o clique nele chama `onDelete(id)` sem disparar `onMarkAsRead`. A atenuação `opacity-60` das linhas lidas atinge só o botão principal.

Esta task só altera o item e o seu teste. O `NotificationDropdown` ainda não repassa `onDelete` (a prop nova é obrigatória no item); a fiação é da task-05, então o typecheck do dropdown só fica verde depois dela.

## Arquivos

- Modify: `apps/frontend/src/components/notification/notification-item.tsx`
- Test: `apps/frontend/src/components/notification/notification-item.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:** `NotificationItem` (export de `notification-item.tsx`) com a prop nova `onDelete: (id: string) => void`, ao lado das existentes `notification: NotificationItemData` e `onMarkAsRead: (id: string) => void`.

### Conformidade com as Skills Padrão

- `shadcn`: consistência com o padrão de botão destrutivo suave de `check-in-actions.tsx` (`bg-destructive-soft text-destructive`); o botão aqui é um `<button>` nativo para não exigir `TooltipProvider` nem brigar com o `h-10 w-10` do `Button` de tamanho `icon`
- `tailwindcss`: utilitários v4, `group`/`group-hover`/`group-focus-within`, `focus-visible` e a variante arbitrária `[@media(hover:none)]`
- `wcag-audit-patterns`: nome acessível "Excluir notificação", botões irmãos (sem `button` dentro de `button`), foco visível e ícone `aria-hidden`
- `vercel-composition-patterns`: a exclusão entra por prop (`onDelete`), sem flags booleanas
- `test-antipatterns`: os testes verificam comportamento e a estrutura do DOM; a revelação por CSS é conferida pelas classes utilitárias, sem mock do que está sob teste

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/notification-delete-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** opção B (botão aparece no hover ou foco da linha e ocupa o lugar da hora; em `@media (hover: none)` fica sempre visível); botão de 32px (`h-8 w-8`), `rounded-md`, ícone `Trash2` de 16px (`h-4 w-4`), hover em `bg-destructive-soft text-destructive`; posição `absolute right-3 top-2` dentro do `<li className="group relative">`; `opacity-60` das linhas lidas só no botão principal; layout do item, ponto de não lida e tokens do tema permanecem como hoje. Como a hora fica sob o botão quando ele é sempre visível, em `hover: none` a hora também fica invisível (o botão ocupa o lugar dela, como no mockup).

## Passos

- **Step 0: Confirm design source & fidelity tools**

Leia a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual` (o autor do plano as descobriu no momento do planejamento). Confirme com o usuário se existe uma fonte de design original (só isso precisa do usuário, e por isso pertence à execução) e preencha qualquer lacuna que o plano deixou em aberto (rode a descoberta de ferramentas de novo só se o campo estiver em branco, inspecionando as skills disponíveis e os MCPs conectados; case por capacidade, nunca fixe uma ferramenta). Se existir URL de origem ou ferramenta de fidelidade, use-a; caso contrário construa manualmente contra o mockup curado `../specs/mockups/notification-delete-visual.md`. O mockup é o norte: reaproveite o layout, o espaçamento e os tokens decididos, sem re-derivá-los. Este passo nunca bloqueia: "sem fonte / sem ferramenta" é uma resposta válida que segue para a implementação manual.

- **Step 1: Ajustar os testes existentes que usam `getByRole("button")` (sem mudança de comportamento)**

Em `notification-item.test.tsx`, o novo botão de excluir torna `getByRole("button")` ambíguo. Passe a filtrar o botão principal por nome e aceite `onDelete` no helper de render:

```tsx
function renderItem(
	notification: NotificationItemData,
	onMarkAsRead: (id: string) => void = vi.fn(),
	onDelete: (id: string) => void = vi.fn(),
) {
	return render(
		<ul>
			<NotificationItem
				notification={notification}
				onMarkAsRead={onMarkAsRead}
				onDelete={onDelete}
			/>
		</ul>,
	)
}

function getMainButton(): HTMLElement {
	return screen.getByRole("button", { name: /Manutenção programada/ })
}

function getDeleteButton(): HTMLElement {
	return screen.getByRole("button", { name: "Excluir notificação" })
}
```

E substitua cada `screen.getByRole("button")` dos testes existentes por `getMainButton()`: são os testes "tem identificação visual própria, distinta de check-in" (duas ocorrências; a segunda renderização também usa o título "Manutenção programada"), "clicar em um aviso não lido chama onMarkAsRead com o id" e "clicar em um aviso já lido não chama onMarkAsRead". Os outros dois testes existentes (título e mensagem, e o de HTML/script como texto) não usam `getByRole("button")` e ficam como estão.

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (5 testes; o filtro por nome casa com o único botão atual, então o comportamento não muda).

- **Step 2: Write the failing test (botão de excluir, clique, irmãos, sem atenuação)**

Acrescente ao final do arquivo:

```tsx
describe("NotificationItem: botão de excluir", () => {
	test("expõe o botão de excluir com nome acessível e type button [FR-001, FR-013]", () => {
		renderItem(makeNotification())

		const deleteButton = getDeleteButton()

		expect(deleteButton).toHaveAttribute("type", "button")
		expect(deleteButton.querySelector("svg")).not.toBeNull()
	})

	test("clicar em excluir chama onDelete com o id e não marca como lida [FR-001, FR-013]", async () => {
		const onMarkAsRead = vi.fn()
		const onDelete = vi.fn()
		renderItem(makeNotification(), onMarkAsRead, onDelete)

		await userEvent.click(getDeleteButton())

		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledWith("notice-1")
		expect(onMarkAsRead).not.toHaveBeenCalled()
	})

	test("o botão principal e o de excluir são irmãos, sem button dentro de button [FR-013]", () => {
		renderItem(makeNotification())
		const mainButton = getMainButton()
		const deleteButton = getDeleteButton()

		expect(mainButton.contains(deleteButton)).toBe(false)
		expect(deleteButton.closest("button")).toBe(deleteButton)
		expect(deleteButton.parentElement).toBe(mainButton.parentElement)
		expect(deleteButton.parentElement?.tagName).toBe("LI")
		expect(deleteButton.parentElement).toHaveClass("group", "relative")
		expect(mainButton.querySelector("button")).toBeNull()
	})

	test("em item lido a atenuação atinge só o botão principal, não o de excluir [FR-001]", () => {
		renderItem(makeNotification({ readAt: "2026-09-20T10:00:00.000Z" }))

		expect(getMainButton()).toHaveClass("opacity-60")
		expect(getDeleteButton()).not.toHaveClass("opacity-60")
		expect(getDeleteButton().closest("li")).not.toHaveClass("opacity-60")
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx -t "botão de excluir"`
Expected: FAIL nos 4 testes com `Unable to find an accessible element with the role "button" and name "Excluir notificação"`.

- **Step 4: Write minimal implementation (estrutura, clique e irmãos)**

Em `notification-item.tsx`:

(a) Importe o ícone e ajuste as props:

```tsx
import {
	CheckCircle,
	Megaphone,
	ShieldAlert,
	Tag,
	Trash2,
	XCircle,
} from "lucide-react"
```

```tsx
interface NotificationItemProps {
	notification: NotificationItemData
	onMarkAsRead: (id: string) => void
	onDelete: (id: string) => void
}
```

(b) Na assinatura do componente e junto de `handleClick`:

```tsx
export function NotificationItem({
	notification,
	onMarkAsRead,
	onDelete,
}: NotificationItemProps) {
```

```tsx
	function handleDelete() {
		onDelete(notification.id)
	}
```

(c) Troque `<li>` por `<li className="group relative">` (o `<button>` principal, com todo o seu conteúdo, `onClick={handleClick}` e o `opacity-60` de linha lida, permanece exatamente como está) e acrescente o botão irmão logo após o `</button>` principal e antes do `</li>`:

```tsx
			<button
				type="button"
				aria-label="Excluir notificação"
				onClick={handleDelete}
				className="absolute right-3 top-2"
			>
				<Trash2 aria-hidden="true" />
			</button>
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (5 testes anteriores mais os 4 novos).

- **Step 6: Write the failing test (FR-012: revelação por hover/foco e estilo visual)**

Dentro de `describe("NotificationItem: botão de excluir")`:

```tsx
	test("o botão de excluir é revelado por hover ou foco da linha e a hora sai do lugar [FR-012]", () => {
		renderItem(makeNotification())
		const deleteButton = getDeleteButton()

		expect(deleteButton).toHaveClass(
			"opacity-0",
			"group-hover:opacity-100",
			"group-focus-within:opacity-100",
			"focus-visible:opacity-100",
		)
		expect(screen.getByText("agora")).toHaveClass(
			"group-hover:invisible",
			"group-focus-within:invisible",
		)
	})

	test("o botão de excluir tem 32px, rounded-md, ícone Trash2 de 16px e hover destrutivo [FR-012, FR-013]", () => {
		renderItem(makeNotification())
		const deleteButton = getDeleteButton()
		const icon = deleteButton.querySelector("svg")

		expect(deleteButton).toHaveClass(
			"h-8",
			"w-8",
			"rounded-md",
			"hover:bg-destructive-soft",
			"hover:text-destructive",
		)
		expect(icon).toHaveClass("h-4", "w-4")
		expect(icon).toHaveAttribute("aria-hidden", "true")
	})
```

- **Step 7: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx -t "revelado por hover ou foco"`
Expected: FAIL (`expected class "absolute right-3 top-2" to contain "opacity-0"`).

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx -t "32px, rounded-md"`
Expected: FAIL (`expected class "absolute right-3 top-2" to contain "h-8"`).

- **Step 8: Write minimal implementation (classes de revelação e visual)**

O botão de excluir passa a:

```tsx
			<button
				type="button"
				aria-label="Excluir notificação"
				onClick={handleDelete}
				className="absolute right-3 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-destructive-soft hover:text-destructive"
			>
				<Trash2 className="h-4 w-4" aria-hidden="true" />
			</button>
```

E a hora (o `<span>` que exibe `formatRelativeTime(notification.createdAt)`) troca a classe por:

```tsx
className="flex-shrink-0 text-xs text-muted-foreground group-hover:invisible group-focus-within:invisible"
```

- **Step 9: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (todos os testes do arquivo).

- **Step 10: Write the failing test (Review Focus: dispositivo touch)**

Review Focus: Dispositivo touch (`@media (hover: none)`): o botão de excluir fica visível sem hover

Dentro de `describe("NotificationItem: botão de excluir")`:

```tsx
	test("Review Focus: em dispositivo touch (@media (hover: none)) o botão de excluir fica visível sem hover [FR-012]", () => {
		renderItem(makeNotification())

		expect(getDeleteButton()).toHaveClass("[@media(hover:none)]:opacity-100")
		expect(screen.getByText("agora")).toHaveClass(
			"[@media(hover:none)]:invisible",
		)
	})
```

O happy-dom não avalia `@media (hover: none)`, então o teste confere as classes utilitárias que produzem o comportamento; o Tailwind gera a regra a partir delas.

- **Step 11: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx -t "Review Focus: em dispositivo touch"`
Expected: FAIL (`expected class "... hover:text-destructive" to contain "[@media(hover:none)]:opacity-100"`).

- **Step 12: Write minimal implementation (touch)**

Acrescente `[@media(hover:none)]:opacity-100` às classes do botão de excluir (por exemplo, logo depois de `focus-visible:opacity-100`) e `[@media(hover:none)]:invisible` às classes da hora:

```tsx
className="flex-shrink-0 text-xs text-muted-foreground group-hover:invisible group-focus-within:invisible [@media(hover:none)]:invisible"
```

- **Step 13: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (todos os testes do arquivo).

- **Step 14: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/components/notification/notification-item.tsx apps/frontend/src/components/notification/notification-item.test.tsx
git commit -m "feat(notification-delete): adiciona botao de excluir ao item do bell" -m "Claude-Session: https://claude.ai/code/session_01PgFG13SHLTeWfds7Pinf2j"
```

## Critérios de Sucesso

- Cada item do bell tem um botão de excluir com nome acessível "Excluir notificação", `type="button"` e ícone `aria-hidden` [FR-001, FR-013].
- O clique no botão de excluir chama `onDelete(notification.id)` uma vez e não chama `onMarkAsRead`; o botão principal e o de excluir são irmãos dentro do `<li className="group relative">` [FR-001, FR-013].
- O botão de excluir é revelado por hover ou foco da linha (`group-hover`, `group-focus-within`, `focus-visible`) e fica sempre visível em `@media (hover: none)`; a hora sai do lugar enquanto o botão aparece [FR-012].
- O botão tem 32px (`h-8 w-8`), `rounded-md`, ícone de 16px e hover em `bg-destructive-soft text-destructive`; a atenuação `opacity-60` de item lido fica só no botão principal [FR-012, FR-013].
