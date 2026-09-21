# Task 5: Fiação do dropdown e do bell e estado da lista após excluir [FR-001, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-notification-delete.md`
**Spec:** `../specs/notification-delete-design.md`
**Tier:** standard
**Depends on:** task-03, task-04

## Visão Geral

Liga a exclusão de ponta a ponta na UI. O `NotificationDropdown` ganha a prop `onDelete` (também no `Pick` de `NotificationDropdownContent`) e a repassa a cada `NotificationItem`. O `NotificationBell` lê `deleteNotification` de `useNotifications()` e passa `onDelete` ao dropdown. Além disso trata o estado da lista após excluir (FR-011): hoje o estado vazio é decidido só por `notifications.length === 0`, o que remove a sentinela de scroll infinito quando o último item exibido é excluído e ainda há mais páginas. O dropdown passa a mostrar o estado vazio somente quando não há itens e `hasNextPage` é falso; com `hasNextPage` verdadeiro mantém a sentinela montada para o scroll infinito voltar a buscar.

## Arquivos

- Modify: `apps/frontend/src/components/notification/notification-dropdown.tsx`
- Modify: `apps/frontend/src/components/notification/notification-bell.tsx`
- Test: `apps/frontend/src/components/notification/notification-dropdown.test.tsx`

## Interfaces

- **Consome:**
  - da task-03: `UseNotificationsResult.deleteNotification: (notificationId: string) => Promise<void>` (campo devolvido por `useNotifications()` de `@/lib/notifications/use-notifications`; a promessa resolve sempre).
  - da task-04: `NotificationItem` com as props `notification: NotificationItemData`, `onMarkAsRead: (id: string) => void` e `onDelete: (id: string) => void`; o botão de excluir tem nome acessível "Excluir notificação" e chama `onDelete(notification.id)`.
- **Produz:** `NotificationDropdown` com a prop nova `onDelete: (id: string) => void` (ao lado de `notifications`, `isLoading`, `hasNextPage`, `isFetchingNextPage`, `fetchNextPage`, `onMarkAsRead`, `onMarkAllAsRead`).

### Conformidade com as Skills Padrão

- `vercel-composition-patterns`: `onDelete` desce por props do bell ao dropdown e ao item, sem flags booleanas nem contexto novo
- `vercel-react-best-practices`: a sentinela permanece no mesmo ponto da árvore para o `IntersectionObserver` não observar um nó desmontado, sem efeitos ou estado novos
- `wcag-audit-patterns`: o estado vazio só aparece quando de fato não há mais nada a carregar; o botão de excluir continua acessível por nome
- `test-antipatterns`: os testes usam o dropdown real e um `IntersectionObserver` de teste na fronteira do navegador, sem mock do componente sob teste

## Passos

- **Step 1: Confirmar o estado atual**

Run: `grep -n "onDelete" apps/frontend/src/components/notification/notification-item.tsx apps/frontend/src/lib/notifications/use-notifications.ts`
Expected: `notification-item.tsx` mostra a prop `onDelete` (task-04) e `use-notifications.ts` mostra `deleteNotification` (task-03; o grep por `deleteNotification` no hook também deve retornar linhas). Se faltar algum, uma das dependências não foi concluída: pare e reporte.

Confirme que `notification-dropdown.test.tsx` renderiza `NotificationDropdown` em 7 testes, cada um com a linha `onMarkAllAsRead={vi.fn()}`; todos passam a receber `onDelete` (prop obrigatória).

- **Step 2: Ajustar os renders existentes do dropdown para a prop nova**

Em `notification-dropdown.test.tsx`, logo abaixo de cada linha `onMarkAllAsRead={vi.fn()}` dos 7 renders existentes, acrescente:

```tsx
				onDelete={vi.fn()}
```

E acrescente o import do `userEvent` (usado nos testes novos):

```tsx
import userEvent from "@testing-library/user-event"
```

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-dropdown.test.tsx`
Expected: PASS (7 testes; a prop extra é ignorada em runtime até a implementação existir).

- **Step 3: Write the failing test (FR-001: excluir chama onDelete pelo dropdown)**

Acrescente ao final do arquivo:

```tsx
describe("NotificationDropdown: exclusão", () => {
	test("clicar em excluir chama onDelete com o id da notificação, sem marcar como lida [FR-001]", async () => {
		const onDelete = vi.fn()
		const onMarkAsRead = vi.fn()
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={false}
				isFetchingNextPage={false}
				fetchNextPage={vi.fn()}
				onMarkAsRead={onMarkAsRead}
				onMarkAllAsRead={vi.fn()}
				onDelete={onDelete}
			/>,
		)

		await userEvent.click(
			screen.getByRole("button", { name: "Excluir notificação" }),
		)

		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledWith("1")
		expect(onMarkAsRead).not.toHaveBeenCalled()
	})
})
```

- **Step 4: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-dropdown.test.tsx -t "clicar em excluir chama onDelete"`
Expected: FAIL (`expected "spy" to be called 1 times, but got 0 times`): o dropdown ainda não repassa `onDelete` ao item, e o item chama `onDelete` indefinido.

- **Step 5: Write minimal implementation (dropdown)**

Em `notification-dropdown.tsx`:

(a) Na interface `NotificationDropdownProps`, após `onMarkAsRead`:

```tsx
	onDelete: (id: string) => void
```

(b) Em `NotificationDropdownContent`, acrescente `onDelete` à desestruturação e ao `Pick`:

```tsx
function NotificationDropdownContent({
	notifications,
	isLoading,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	onMarkAsRead,
	onDelete,
}: Pick<
	NotificationDropdownProps,
	| "notifications"
	| "isLoading"
	| "hasNextPage"
	| "isFetchingNextPage"
	| "fetchNextPage"
	| "onMarkAsRead"
	| "onDelete"
>) {
```

(c) No `<NotificationItem ... />` dentro do `<ul>`:

```tsx
					<NotificationItem
						key={notification.id}
						notification={notification}
						onMarkAsRead={onMarkAsRead}
						onDelete={onDelete}
					/>
```

(d) Em `NotificationDropdown`, acrescente `onDelete` à desestruturação das props e repasse `onDelete={onDelete}` ao `<NotificationDropdownContent ... />`.

- **Step 6: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-dropdown.test.tsx -t "clicar em excluir chama onDelete"`
Expected: PASS.

- **Step 7: Write the failing test (Review Focus: última notificação carregada com hasNextPage)**

Review Focus: Excluir a última notificação carregada com mais páginas disponíveis volta a buscar, e sem mais páginas mostra o estado vazio

Dentro de `describe("NotificationDropdown: exclusão")`:

```tsx
	test("Review Focus: excluir a última notificação carregada com hasNextPage ativo volta a buscar mais e, sem mais páginas, mostra o estado vazio [FR-011]", () => {
		const fetchNextPage = vi.fn()
		const baseProps = {
			isLoading: false,
			isFetchingNextPage: false,
			fetchNextPage,
			onMarkAsRead: vi.fn(),
			onMarkAllAsRead: vi.fn(),
			onDelete: vi.fn(),
		}
		const { rerender } = render(
			<NotificationDropdown
				{...baseProps}
				notifications={[makeNotification("1")]}
				hasNextPage={true}
			/>,
		)
		const observer = observerInstances[0]
		const sentinel = observer?.observe.mock.calls[0]?.[0] as Element

		rerender(
			<NotificationDropdown
				{...baseProps}
				notifications={[]}
				hasNextPage={true}
			/>,
		)

		expect(screen.queryByText("Nenhuma notificação")).not.toBeInTheDocument()
		expect(sentinel).toBeInTheDocument()
		observer?.trigger(true, sentinel)
		expect(fetchNextPage).toHaveBeenCalledTimes(1)

		rerender(
			<NotificationDropdown
				{...baseProps}
				notifications={[]}
				hasNextPage={false}
			/>,
		)

		expect(screen.getByText("Nenhuma notificação")).toBeInTheDocument()
	})
```

- **Step 8: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-dropdown.test.tsx -t "Review Focus: excluir a última notificação"`
Expected: FAIL em `expect(screen.queryByText("Nenhuma notificação")).not.toBeInTheDocument()`: com a lista vazia o dropdown mostra o estado vazio e desmonta a sentinela, então o scroll infinito não volta a buscar.

- **Step 9: Write minimal implementation (estado vazio só sem mais páginas)**

Em `NotificationDropdownContent`, troque a condição do estado vazio:

```tsx
	if (notifications.length === 0 && !hasNextPage) {
		return (
			<div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
				<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
					<BellOff className="h-5 w-5" aria-hidden="true" />
				</span>
				<p className="text-sm font-medium text-foreground">
					Nenhuma notificação
				</p>
			</div>
		)
	}
```

O `return` final (`<ul>` + parágrafo de "Carregando mais..." + sentinela) permanece igual: com lista vazia e `hasNextPage` verdadeiro ele renderiza uma `<ul>` vazia e a sentinela, na mesma posição da árvore de antes, então o mesmo nó da sentinela continua observado pelo `IntersectionObserver`.

- **Step 10: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-dropdown.test.tsx`
Expected: PASS (todos os testes do arquivo, incluindo os 7 de scroll infinito).

- **Step 11: Ligar o bell**

Em `notification-bell.tsx`, acrescente `deleteNotification` à desestruturação de `useNotifications()`:

```tsx
	const {
		notifications,
		unreadCount,
		isLoading,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		markAsRead,
		markAllAsRead,
		deleteNotification,
	} = useNotifications()
```

E passe a prop ao dropdown, ao lado de `onMarkAllAsRead`:

```tsx
					onDelete={(notificationId) => {
						void deleteNotification(notificationId)
					}}
```

O bell não tem teste próprio e a ligação é uma passagem de prop obrigatória: a coerência de tipos com o dropdown (`onDelete: (id: string) => void`) e com o hook (`deleteNotification: (notificationId: string) => Promise<void>`) é conferida pelo typecheck do checkpoint. Confirme lendo os dois arquivos que o nome da prop e o campo do hook são exatamente os acima.

- **Step 12: Run test to verify the wiring did not regress the components**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx src/components/notification/notification-dropdown.test.tsx`
Expected: PASS (item da task-04 e dropdown desta task).

- **Step 13: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/components/notification/notification-dropdown.tsx apps/frontend/src/components/notification/notification-bell.tsx apps/frontend/src/components/notification/notification-dropdown.test.tsx
git commit -m "feat(notification-delete): liga a exclusao no dropdown e no bell" -m "Claude-Session: https://claude.ai/code/session_01PgFG13SHLTeWfds7Pinf2j"
```

## Critérios de Sucesso

- Clicar no botão de excluir de um item exibido no dropdown chama `onDelete` com o id daquela notificação, sem marcar como lida; o bell liga essa prop a `deleteNotification` do hook [FR-001].
- Ao excluir a última notificação carregada com `hasNextPage` verdadeiro, o dropdown não mostra o estado vazio, mantém a sentinela montada e o scroll infinito volta a chamar `fetchNextPage` [FR-011].
- Sem itens e sem mais páginas, o dropdown mostra "Nenhuma notificação" [FR-011].
