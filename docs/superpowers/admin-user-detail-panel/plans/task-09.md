# Task 9: Integração `page.tsx` + `user-row.tsx` (layout, seleção, linha ativa, teclado) [RF-001, RF-004, RF-005, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** task-08

## Visão Geral

Integra o painel na página de usuários: substitui `UserDetailModal` por `UserDetailContainer`, monta o layout split-view (lista à esquerda + painel à direita no desktop; lista full + Dialog no mobile), propaga o destaque da linha ativa para `UserRow`, mantém a troca de usuário sem fechar o painel (desktop) e adiciona navegação por teclado ↑/↓ entre as linhas. Por fim, remove o `user-detail-modal.tsx` legado (substituído pelos módulos de `user-detail/`).

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-row.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-row.test.tsx` (novo caso)
- Delete: `apps/frontend/src/features/admin/components/user-detail-modal.tsx`
- Delete: `apps/frontend/src/features/admin/components/user-detail-modal.test.tsx` (se existir)

### Conformidade com as Skills Padrão

- use react skill: estado de seleção, navegação por teclado, composição
- use shadcn skill + tailwindcss skill: layout split-view com grid responsivo
- use test-antipatterns skill + vitest skill: testes de destaque e navegação
- use no-workarounds skill + systematic-debugging skill: ao ajustar testes existentes que quebrarem

## Passos

- **Step 1: Teste do destaque da linha ativa em `UserRow`**

Adicione ao final do `describe` em `apps/frontend/src/features/admin/components/user-row.test.tsx`:

```tsx
test("aplica aria-pressed quando isSelected é verdadeiro", () => {
	render(
		<ul>
			<UserRow user={buildUser()} onSelect={() => {}} isSelected={true} />
		</ul>,
	)
	expect(screen.getByTestId("user-row-u1")).toHaveAttribute(
		"aria-pressed",
		"true",
	)
})
```

> O helper `buildUser` já existe nesse arquivo de teste (ver pesquisa). Reaproveite-o.

- **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "aria-pressed"`
Expected: FAIL — `isSelected` ainda não é uma prop e o atributo não é aplicado.

- **Step 3: Adicionar `isSelected` ao `UserRow`**

Em `apps/frontend/src/features/admin/components/user-row.tsx`, atualize a interface e o `<li>`:

```tsx
export interface UserRowProps {
	user: AdminUser
	onSelect?: (user: AdminUser) => void
	isSelected?: boolean
	className?: string
}
```

E na função, ajuste a assinatura e o `<li>`:

```tsx
export function UserRow({
	user,
	onSelect,
	isSelected,
	className,
}: UserRowProps) {
	const isInteractive = typeof onSelect === "function"
	// ...handleSelect e handleKeyDown permanecem iguais...

	return (
		<li
			data-testid={`user-row-${user.id}`}
			onClick={isInteractive ? handleSelect : undefined}
			onKeyDown={isInteractive ? handleKeyDown : undefined}
			role={isInteractive ? "button" : undefined}
			tabIndex={isInteractive ? 0 : undefined}
			aria-pressed={isInteractive ? Boolean(isSelected) : undefined}
			className={cn(
				"flex w-full items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 text-left transition-[border-color] duration-300 ease-out",
				isInteractive && "cursor-pointer hover:border-border-strong",
				isSelected && "border-accent bg-accent/40",
				className,
			)}
		>
			{/* conteúdo inalterado */}
		</li>
	)
}
```

- **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "UserRow"`
Expected: PASS — incluindo o novo caso de `aria-pressed`.

- **Step 5: Propagar `selectedUserId` na lista e adaptar a página**

Em `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`:

5a. Troque o import do modal pelo container e adicione `toast` (sonner) e `KeyboardEvent`:

```tsx
import { UserDetailContainer } from "@/features/admin/components/user-detail/user-detail-container"
```

Remova a linha `import { UserDetailModal } from "@/features/admin/components/user-detail-modal"`.

5b. Acrescente `selectedUserId` às props de `UsersList`, `UsersContent` e propague ao `UserRow`:

```tsx
interface UsersListProps {
	users: ReadonlyArray<AdminUser>
	page: number
	totalPages: number
	selectedUserId: string | null
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
}

function UsersList({
	users,
	page,
	totalPages,
	selectedUserId,
	onPageChange,
	onSelect,
}: UsersListProps) {
	return (
		<>
			<ul data-testid="admin-users-list" className="flex flex-col gap-2">
				{users.map((user) => (
					<UserRow
						key={user.id}
						user={user}
						onSelect={onSelect}
						isSelected={user.id === selectedUserId}
					/>
				))}
			</ul>
			{totalPages > 1 ? (
				<UsersPagination
					page={page}
					totalPages={totalPages}
					onChange={onPageChange}
				/>
			) : null}
		</>
	)
}
```

Adicione `selectedUserId: string | null` à interface `UsersContentProps` e repasse a prop ao `UsersList` dentro de `UsersContent`.

5c. No componente `AdminUsersPage`, adicione o handler de edição e a navegação por teclado, e substitua o `return` do split-view. Acrescente os handlers:

```tsx
function handleEditUser(user: AdminUser) {
	toast.info(`Edição de ${user.name} estará disponível em breve.`)
}

function handleListKeyNavigation(event: KeyboardEvent<HTMLDivElement>) {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
	const list = data?.users
	if (!list || list.length === 0) return
	event.preventDefault()
	const currentIndex = activeSelectedUser
		? list.findIndex((user) => user.id === activeSelectedUser.id)
		: -1
	const delta = event.key === "ArrowDown" ? 1 : -1
	const nextIndex = Math.min(
		Math.max(currentIndex + delta, 0),
		list.length - 1,
	)
	setSelectedUser(list[nextIndex])
}
```

> Verifique a API real do `toast` em `apps/frontend/src/components/ui` / `sonner` (já há um `Toaster` no projeto). Se a importação for diferente, ajuste (`import { toast } from "sonner"`).

5d. Substitua a `<section>` retornada para o layout split-view (largura maior + grid de duas colunas no desktop):

```tsx
return (
	<section
		data-testid="admin-users-page"
		className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6"
		aria-busy={isFetching}
	>
		<div className="flex flex-col gap-5">
			<PageHeader
				eyebrow="Admin"
				title="Usuários"
				subtitle="Gerencie membros e administradores da plataforma"
				className="mb-0"
			/>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<UserFilterBar
					activeFilter={activeFilter}
					counts={stats}
					onFilterChange={handleFilterChange}
					className="w-full [&>button]:flex-1 [&>button]:justify-center"
				/>
				<SearchBar
					data-testid="admin-users-search"
					placeholder="Buscar por nome ou e-mail..."
					value={inputQuery}
					onChange={(e) => setInputQuery(e.target.value)}
					className="w-full"
				/>
			</div>
		</div>

		<div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: navegação por teclado entre linhas da lista */}
			<div onKeyDown={handleListKeyNavigation}>
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
				/>
			</div>

			<UserDetailContainer
				user={activeSelectedUser}
				onClose={handleModalClose}
				onEdit={handleEditUser}
			/>
		</div>
	</section>
)
```

- **Step 6: Remover o modal legado**

```bash
git rm apps/frontend/src/features/admin/components/user-detail-modal.tsx
git rm apps/frontend/src/features/admin/components/user-detail-modal.test.tsx 2>/dev/null || true
```

> Antes de remover, confirme que nenhum outro arquivo importa `UserDetailModal`:
> Run: `grep -rn "user-detail-modal" apps/frontend/src` — deve retornar vazio após a troca de import na page.

- **Step 7: Rodar a suíte completa do frontend**

Run: `pnpm --filter frontend test`
Expected: PASS — toda a suíte verde, incluindo os testes das tasks 1-8.

- **Step 8: Lint + tipos + build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: zero problemas; build conclui com sucesso.

- **Step 9: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/admin/usuarios/page.tsx apps/frontend/src/features/admin/components/user-row.tsx apps/frontend/src/features/admin/components/user-row.test.tsx
git commit -m "feat(frontend): integrate UserDetailContainer split-view into users page"
```

## Critérios de Sucesso

- Clicar numa linha abre o painel (desktop em coluna; mobile em Dialog) (RF-001).
- A linha selecionada recebe destaque visual e `aria-pressed` (RF-004).
- Trocar de usuário no desktop substitui o conteúdo sem fechar o painel (RF-005).
- Setas ↑/↓ navegam a seleção entre as linhas, atualizando o painel (RF-020).
- `user-detail-modal.tsx` removido sem referências órfãs.
- `pnpm --filter frontend test`, `lint:fix`, `tsc:check` e `build` passam a 100%.
