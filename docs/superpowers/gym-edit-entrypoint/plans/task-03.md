# Task 3: Página `/academias` — passar `isAdmin` para `GymResults`

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/gym-edit-entrypoint-design.md`
**Depends on:** task-02

## Visão Geral

Ligar o ponto de entrada à fonte do papel do usuário. A página `/academias` já lê
`useAuthStore((state) => state.user)` para decidir o botão "Cadastrar". Reaproveita-se esse
`user` para derivar `isAdmin` e repassá-lo ao `GymResults`, fechando o fluxo: admin vê o
ícone de edição em cada card; membro/anônimo não vê.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/academias/page.test.tsx`

### Conformidade com as Skills Padrão

- use `react`: deriva valor booleano a partir de estado já lido; sem hook novo.
- use `zustand`: seletor `useAuthStore((state) => state.user)` já existente.
- use `test-antipatterns`: testes orientados a comportamento via MSW + papel do usuário, sem mock de implementação.
- use `tanstack-query-best-practices`: respostas mockadas via MSW (`server.use`) como nos testes existentes.

## Passos

- **Step 1: Escrever os testes falhando**

Adicionar ao `describe("AcademiasPage", ...)` em
`apps/frontend/src/app/(authenticated)/academias/page.test.tsx`:

```tsx
	test("exibe ícone de edição nos cards para usuário ADMIN", async () => {
		setUser("ADMIN")
		server.use(
			http.get(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json(fakeGyms(2), { status: 200 }),
			),
		)
		renderWithProviders(<AcademiasPage />)

		const editLink = await screen.findByTestId("gym-edit-gym-1")
		expect(editLink).toHaveAttribute("href", "/admin/academias/gym-1/editar")
	})

	test("não exibe ícone de edição nos cards para usuário MEMBER", async () => {
		setUser("MEMBER")
		server.use(
			http.get(`${apiBaseUrl}/gyms`, () =>
				HttpResponse.json(fakeGyms(2), { status: 200 }),
			),
		)
		renderWithProviders(<AcademiasPage />)

		expect(await screen.findByTestId("gym-card-gym-1")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-edit-gym-1")).not.toBeInTheDocument()
	})
```

> `setUser`, `fakeGyms`, `apiBaseUrl`, `server` e `http` já estão definidos/importados
> no topo do arquivo de teste — não reimportar.

- **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter frontend test -- "src/app/(authenticated)/academias/page.test.tsx"`
Expected: FAIL — `gym-edit-gym-1` não encontrado (página ainda não passa `isAdmin`).

- **Step 3: Derivar `isAdmin` e passá-lo ao `GymResults`**

Em `apps/frontend/src/app/(authenticated)/academias/page.tsx`:

3a. Logo após a leitura do `user` (`const user = useAuthStore((state) => state.user)`),
acrescentar:

```tsx
	const isAdmin = user?.role === "ADMIN"
```

3b. Acrescentar a prop `isAdmin` ao `<GymResults>` (que já recebe `items={items}`):

```tsx
				<GymResults
					query={trimmed}
					isBrowseMode={isBrowseMode}
					isLoading={activeQuery.isLoading}
					isError={activeQuery.isError}
					errorMessage={activeQuery.error?.userMessage}
					onRetry={() => activeQuery.refetch()}
					items={items}
					isAdmin={isAdmin}
				/>
```

- **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter frontend test -- "src/app/(authenticated)/academias/page.test.tsx"`
Expected: PASS — os dois novos testes passam e os testes existentes da página continuam verdes.

- **Step 5: Lint e type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; zero erros de tipo.

- **Step 6: Suíte completa do frontend + build**

Run: `pnpm --filter frontend test && pnpm --filter frontend build`
Expected: toda a suíte passa; build de produção conclui sem erros.

- **Step 7: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/academias/page.tsx" "apps/frontend/src/app/(authenticated)/academias/page.test.tsx"
git commit -m "feat(gym-edit-entrypoint): show gym edit icon for admins on /academias"
```

## Critérios de Sucesso

- Usuário ADMIN vê, em cada card de `/academias`, um link de edição apontando para
  `/admin/academias/{id}/editar`.
- Usuário MEMBER (e anônimo) não vê o link de edição.
- Os testes pré-existentes da página (botão "Cadastrar", browse, busca) permanecem verdes.
- `lint:fix`, `tsc:check`, suíte de testes e `build` passam 100%.
