# Task 8: AdminUsersContent — limpar seleção ao mudar página/filtro/busca [FR-011]

**Status:** PENDING
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** cheap
**Depends on:** task-07

## Visão Geral

Após a Task 7, `AdminUsersContent` (em
`apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`) já mantém
`selectedIds: Set<string>`. Esta task garante que a seleção nunca fique "presa" a uma
página, filtro ou busca que não é mais visível: sempre que `page`, `activeFilter` ou
`debouncedQuery` mudarem, `selectedIds` deve ser limpo automaticamente (`setSelectedIds(new
Set())`). Isso evita que um usuário selecionado na página 1 permaneça marcado
"invisivelmente" ao navegar para a página 2, ou que uma seleção feita sob o filtro
"Membros" seja aplicada por engano depois de trocar para "Administradores".

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`

(Mesma decisão de arquivo de teste da Task 7: este diretório tem dois arquivos de teste de
página — `page.test.tsx`, sem mock de autenticação, e `admin-users-page.test.tsx`, que já
usa `renderWithProviders` + `useAuthStore.setState(...)` e já contém o `describe("seleção
em massa", ...)` criado na Task 7, com o helper `buildUser` estendido e o `beforeEach` de
autenticação. Esta task acrescenta testes ao mesmo `describe`, em vez de criar um novo
arquivo ou um novo bloco.)

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: o reset de seleção é modelado como um `useEffect` dedicado, reagindo a mudanças de estado (`page`, `activeFilter`, `debouncedQuery`) em vez de espalhar `setSelectedIds(new Set())` em cada handler que already existe (`handlePageChange`, `handleFilterChange`, o efeito de `debouncedQuery`) — uma única fonte da verdade para "quando a seleção deve ser limpa".
- `vitest`: os 3 novos testes seguem a convenção `describe`/`test` em português e reaproveitam o `beforeEach` e o helper `mockUsersList` já existentes em `admin-users-page.test.tsx`.
- `test-antipatterns`: os testes verificam o estado do checkbox real no DOM (`aria-checked`) após a navegação/filtro/busca, nunca acessando o estado interno `selectedIds` do componente diretamente.

## Passos

- **Step 1: Escrever o teste falho — mudar de página limpa a seleção**

No mesmo `describe("seleção em massa", ...)` de
`apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx` (criado
na Task 7, já com `buildUser` estendido e o `beforeEach` de autenticação), adicionar uma
função auxiliar para gerar várias páginas e o primeiro teste:

```tsx
function buildManyUsers(count: number) {
	return Array.from({ length: count }, (_, index) =>
		buildUser({
			id: `user-${index + 1}`,
			name: `Usuário ${index + 1}`,
			email: `usuario${index + 1}@example.com`,
		}),
	)
}
```

```tsx
	test("mudar de página limpa a seleção atual", async () => {
		const user = userEvent.setup()
		mockUsersList(buildManyUsers(15))
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")

		await user.click(screen.getByTestId("admin-users-page-2"))

		await waitFor(() => {
			expect(
				within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
			).toHaveAttribute("aria-checked", "false")
		})
	})
```

(`mockUsersList` — já existente no arquivo — ignora o parâmetro `page` da query string e
sempre devolve a mesma lista completa com `pagination.total = users.length`; com 15
usuários e `limit: 10` (padrão de `ADMIN_USERS_DEFAULT_LIMIT`), `totalPages` fica em `2`,
suficiente para exercitar o botão `admin-users-page-2` gerado por `NumberedPagination`. O
`user-1` continua renderizado na "página 2" pois o handler não filtra por página — o que
importa para este teste é apenas o estado do checkbox, não o conteúdo da lista.)

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "mudar de página limpa a seleção atual"`
Expected: FAIL — o checkbox de `user-1` continua com `aria-checked="true"` após clicar em
"admin-users-page-2" (nenhum efeito limpa `selectedIds` na mudança de página ainda).

- **Step 3: Implementação mínima — useEffect que limpa a seleção**

Em `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, logo após a declaração
de `selectedIds` (introduzida na Task 7) e do `useEffect` existente que reseta `page` no
`debouncedQuery`, adicionar:

```tsx
	// biome-ignore lint/correctness/useExhaustiveDependencies: page, activeFilter e debouncedQuery são os gatilhos intencionais para limpar a seleção; nenhum é consumido no corpo do efeito
	useEffect(() => {
		setSelectedIds(new Set())
	}, [page, activeFilter, debouncedQuery])
```

O efeito existente que já reseta `page` continua inalterado, imediatamente acima:

```tsx
	// biome-ignore lint/correctness/useExhaustiveDependencies: debouncedQuery é o gatilho intencional para resetar a página; não é consumido no corpo do efeito
	useEffect(() => {
		setPage(1)
	}, [debouncedQuery])

	// biome-ignore lint/correctness/useExhaustiveDependencies: page, activeFilter e debouncedQuery são os gatilhos intencionais para limpar a seleção; nenhum é consumido no corpo do efeito
	useEffect(() => {
		setSelectedIds(new Set())
	}, [page, activeFilter, debouncedQuery])
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "mudar de página limpa a seleção atual"`
Expected: PASS

- **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"
git commit -m "feat: limpa a seleção em massa ao mudar de página"
```

- **Step 6: Escrever o teste falho — mudar o filtro limpa a seleção**

Adicionar ao mesmo `describe`:

```tsx
	test("mudar o filtro ativo limpa a seleção atual", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1" }),
			buildUser({ id: "user-2" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")

		await user.click(await screen.findByRole("button", { name: /inativos/i }))

		await waitFor(() => {
			expect(
				within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
			).toHaveAttribute("aria-checked", "false")
		})
	})
```

- **Step 7: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "mudar o filtro ativo limpa a seleção atual"`
Expected: PASS — nenhuma mudança de implementação adicional necessária além do Step 3;
`handleFilterChange` já chama `setActiveFilter(filter)`, o que dispara o novo `useEffect`.

- **Step 8: Escrever o teste falho — mudar a busca (após o debounce) limpa a seleção**

Adicionar ao mesmo `describe`:

```tsx
	test("digitar na busca (após o debounce) limpa a seleção atual", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1" }),
			buildUser({ id: "user-2" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "true")

		const searchInput = screen.getByTestId("admin-users-search")
		await user.type(searchInput, "ana")

		await waitFor(
			() => {
				expect(
					within(screen.getByTestId("user-row-user-1")).getByRole(
						"checkbox",
					),
				).toHaveAttribute("aria-checked", "false")
			},
			{ timeout: 2000 },
		)
	}, 20_000)
```

- **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "digitar na busca (após o debounce) limpa a seleção atual"`
Expected: PASS — o `useEffect` do Step 3 depende de `debouncedQuery`, então a limpeza
ocorre assim que o valor debounced muda (500ms depois de parar de digitar).

- **Step 10: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 11: Commit final**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"
git commit -m "test: cobre limpeza de seleção ao mudar filtro e busca"
```

## Critérios de Sucesso

- Mudar `page` (via `NumberedPagination`), `activeFilter` (via `UserFilterBar`) ou
  `debouncedQuery` (após o debounce de 500ms da busca) sempre limpa `selectedIds` para um
  `Set` vazio (FR-011).
- A limpeza é observável no DOM: os checkboxes de `UserRow` que estavam marcados voltam a
  `aria-checked="false"` após qualquer uma das três mudanças.
- Nenhum handler existente (`handlePageChange`, `handleFilterChange`, o efeito de
  `debouncedQuery`) precisa chamar `setSelectedIds` diretamente — a limpeza é centralizada
  em um único `useEffect`.
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check` e
  `pnpm --filter frontend lint:fix` passam sem erros.
