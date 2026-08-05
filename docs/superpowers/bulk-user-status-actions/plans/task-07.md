# Task 7: AdminUsersContent — estado de seleção e checkbox de página indeterminado [FR-001, FR-002]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** task-06

## Visão Geral

`AdminUsersContent` (função definida dentro de
`apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, não um arquivo separado)
ganha o estado de seleção em massa: `selectedIds: Set<string>`, a função `toggleSelect`
que cada `UserRow` (Task 06) chama via `onToggleSelect`, e um checkbox de "selecionar
página" acima da lista, com estado indeterminado quando a seleção da página é parcial.
A elegibilidade de cada usuário é decidida com `resolvePermissions(user, currentUser).canChangeStatus`
(mesma função já usada pelo painel de detalhe para decidir `canSuspend`/`canActivate`) —
usuários fora da política ficam com o checkbox visível, porém desabilitado (`selectDisabled`),
e são ignorados pelo checkbox de "selecionar página".

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`

(Este diretório já tem dois arquivos de teste da página: `page.test.tsx` — sem mock de
autenticação, cobre apenas loading/empty/paginação — e `admin-users-page.test.tsx` — usa
`renderWithProviders` + `useAuthStore.setState(...)` para simular um admin autenticado.
Como a seleção em massa depende de `resolvePermissions(user, currentUser)`, que por sua
vez depende do usuário autenticado, esta task modifica `admin-users-page.test.tsx`, que já
estabelece essa convenção de mock de autenticação.)

### Conformidade com as Skills Padrão

- `typescript-advanced`: `Set<string>` como estado de seleção e o tipo `boolean | "indeterminate"` do estado do checkbox de página exigem tipagem precisa nas novas props de `UsersList`/`UsersContent`.
- `tailwindcss`: o checkbox de página e seu rótulo ("Selecionar página") devem seguir a mesma cadência de espaçamento (`gap-2`) já usada no restante do arquivo, sem novos valores.
- `vercel-react-best-practices`: `toggleSelect` usa o padrão de atualização funcional de estado (`setSelectedIds((current) => ...)`) para evitar stale closures, consistente com o restante do componente (`setSelectedUser((current) => ...)` já usado em `handleUserPatched`).
- `vitest`: os novos testes seguem a convenção `describe`/`test` em português e a estrutura `beforeEach` com `useAuthStore.setState(...)` já usada em `admin-users-page.test.tsx`.
- `test-antipatterns`: os testes verificam o estado do DOM real (`aria-checked` dos checkboxes renderizados) em vez de inspecionar o estado interno (`selectedIds`) do componente — o estado é um detalhe de implementação, o contrato observável é o DOM.

## Passos

- **Step 1: Escrever o teste falho — seleção parcial deixa o checkbox de página indeterminado**

Em `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`, estender a função `buildUser` existente para aceitar `isSuperAdmin` (necessário para os cenários de política desta e das próximas tasks) e adicionar um novo `describe`:

```tsx
function buildUser(
	overrides: Partial<{
		id: string
		name: string
		email: string
		role: "ADMIN" | "MEMBER"
		status: "activated" | "suspended"
		createdAt: string
		isSuperAdmin: boolean
	}> = {},
) {
	return {
		id: "user-1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER" as const,
		status: "activated" as const,
		createdAt: "2024-01-15T12:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}
```

```tsx
describe("seleção em massa", () => {
	beforeEach(() => {
		isDesktopMock.mockReturnValue(true)
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-logged", role: "ADMIN" },
		})
		vi.mocked(useSearchParams).mockReturnValue(
			new URLSearchParams("") as unknown as ReturnType<typeof useSearchParams>,
		)
	})

	test("marcar 2 checkboxes individuais deixa o checkbox de página em estado indeterminado", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1" }),
			buildUser({ id: "user-2" }),
			buildUser({ id: "user-3" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")

		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		await user.click(
			within(screen.getByTestId("user-row-user-2")).getByRole("checkbox"),
		)

		expect(screen.getByTestId("admin-users-select-page")).toHaveAttribute(
			"aria-checked",
			"mixed",
		)
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "marcar 2 checkboxes individuais deixa o checkbox de página"`
Expected: FAIL — `screen.getByTestId("admin-users-select-page")` não é encontrado (a página ainda não renderiza nenhum checkbox).

- **Step 3: Implementação mínima — estado de seleção, `isUserSelectable` e checkbox de página**

Em `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, adicionar os imports:

```ts
import { Checkbox } from "@/components/ui/checkbox"
import { resolvePermissions } from "@/features/admin/components/user-detail/use-user-detail-actions"
import { useAuthStore } from "@/lib/auth/auth-store"
```

Estender `UsersListProps`/`UsersList` para receber e usar o estado de seleção:

```tsx
interface UsersListProps {
	users: ReadonlyArray<AdminUser>
	page: number
	totalPages: number
	selectedUserId: string | null
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
	selectedIds: Set<string>
	onToggleSelect: (user: AdminUser, checked: boolean) => void
	isUserSelectable: (user: AdminUser) => boolean
}

function UsersList({
	users,
	page,
	totalPages,
	selectedUserId,
	onPageChange,
	onSelect,
	selectedIds,
	onToggleSelect,
	isUserSelectable,
}: UsersListProps) {
	const selectableUsers = users.filter(isUserSelectable)
	const selectedOnPageCount = selectableUsers.filter((user) =>
		selectedIds.has(user.id),
	).length
	const allSelectableSelected =
		selectableUsers.length > 0 &&
		selectedOnPageCount === selectableUsers.length
	const pageCheckboxState: boolean | "indeterminate" =
		selectedOnPageCount === 0
			? false
			: allSelectableSelected
				? true
				: "indeterminate"

	function handleTogglePage(checked: boolean) {
		for (const user of selectableUsers) {
			onToggleSelect(user, checked)
		}
	}

	return (
		<>
			{selectableUsers.length > 0 ? (
				<div className="flex items-center gap-2 px-1 pb-1">
					<Checkbox
						checked={pageCheckboxState}
						data-testid="admin-users-select-page"
						aria-label="Selecionar todos os usuários da página"
						onCheckedChange={(value) => handleTogglePage(value === true)}
					/>
					<span className="text-sm text-subtle">Selecionar página</span>
				</div>
			) : null}
			<ul data-testid="admin-users-list" className="flex flex-col gap-2">
				{users.map((user) => (
					<UserRow
						key={user.id}
						user={user}
						onSelect={onSelect}
						isSelected={user.id === selectedUserId}
						selectable
						checked={selectedIds.has(user.id)}
						selectDisabled={!isUserSelectable(user)}
						onToggleSelect={onToggleSelect}
					/>
				))}
			</ul>
			{totalPages > 1 ? (
				<NumberedPagination
					page={page}
					totalPages={totalPages}
					onChange={onPageChange}
					testIdPrefix="admin-users"
					className="mt-6"
				/>
			) : null}
		</>
	)
}
```

Propagar as mesmas props por `UsersContentProps`/`UsersContent` (adicionar `selectedIds`,
`onToggleSelect`, `isUserSelectable` à interface e repassá-las para `<UsersList />` no
mesmo `return` já existente).

Em `AdminUsersContent`, adicionar o estado e a função de toggle, e ligar tudo à árvore:

```tsx
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const currentUser = useAuthStore((state) => state.user)

	function toggleSelect(user: AdminUser, checked: boolean) {
		setSelectedIds((current) => {
			const next = new Set(current)
			if (checked) next.add(user.id)
			else next.delete(user.id)
			return next
		})
	}

	function isUserSelectable(user: AdminUser): boolean {
		return resolvePermissions(user, currentUser).canChangeStatus
	}
```

E no JSX que renderiza `<UsersContent ... />`, adicionar as três novas props:

```tsx
					<UsersContent
						isLoading={isLoading}
						isError={isError}
						error={error ?? null}
						users={data?.users}
						page={page}
						totalPages={totalPages}
						selectedUserId={activeSelectedUser?.id ?? null}
						onPageChange={handlePageChange}
						onSelect={handleUserSelect}
						selectedIds={selectedIds}
						onToggleSelect={toggleSelect}
						isUserSelectable={isUserSelectable}
					/>
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "marcar 2 checkboxes individuais deixa o checkbox de página"`
Expected: PASS

- **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"
git commit -m "feat: adiciona estado de seleção em massa e checkbox de página ao AdminUsersContent"
```

- **Step 6: Escrever o teste falho — checkbox de página seleciona todos os elegíveis e ignora desabilitados**

Adicionar ao mesmo `describe("seleção em massa", ...)`:

```tsx
	test("marcar o checkbox de página seleciona todos os usuários elegíveis da página (e ignora os desabilitados)", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", role: "MEMBER" }),
			buildUser({ id: "user-2", role: "MEMBER" }),
			buildUser({ id: "user-3", role: "ADMIN" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")

		await user.click(screen.getByTestId("admin-users-select-page"))

		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")
		expect(
			within(screen.getByTestId("user-row-user-2")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")
		expect(
			within(screen.getByTestId("user-row-user-3")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "false")
	})
```

(O requester autenticado é `{ id: "admin-logged", role: "ADMIN" }`, um admin comum
não-root — por `UserManagementPolicy`/`resolvePermissions`, ele pode gerenciar `MEMBER`
mas não outro `ADMIN`; por isso `user-3` — `role: "ADMIN"` — fica desabilitado e é
ignorado pelo "selecionar página".)

- **Step 7: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "marcar o checkbox de página seleciona todos os usuários elegíveis"`
Expected: PASS — nenhuma mudança de implementação necessária além da já feita no Step 3; `handleTogglePage` já itera apenas sobre `selectableUsers` (filtrados por `isUserSelectable`).

- **Step 8: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 9: Commit final**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"
git commit -m "test: cobre seleção total via checkbox de página respeitando a política de permissão"
```

## Critérios de Sucesso

- `AdminUsersContent` mantém `selectedIds: Set<string>` e expõe `toggleSelect(user, checked)` para cada `UserRow` da página (FR-001).
- O checkbox de "selecionar página" reflete `false` quando nenhum usuário elegível da página está selecionado, `"indeterminate"` quando a seleção é parcial, e `true` quando todos os elegíveis estão selecionados (FR-002).
- Marcar o checkbox de página seleciona apenas os usuários elegíveis (`resolvePermissions(...).canChangeStatus === true`) da página atual, ignorando os desabilitados.
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check` e `pnpm --filter frontend lint:fix` passam sem erros.
