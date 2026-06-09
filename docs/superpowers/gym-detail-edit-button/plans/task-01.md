# Task 1: Testes TDD para botão editar no detalhe da academia

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/gym-detail-edit-button-design.md`
**Depends on:** N/A

## Visão Geral

Adicionar três casos de teste ao arquivo existente
`apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx` que cobrem o novo
comportamento do botão de edição: admin vê o link com href correto, aria-label correto, e
não-admin não vê o link. Os testes devem **falhar** antes da implementação da task 2.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx`

### Conformidade com as Skills Padrão

- `code-style`: testes em PT-BR, `test()` (nunca `it`), indentação tab
- `test-antipatterns`: MSW para mocks HTTP, sem mock manual de módulos para o componente

## Passos

### Step 1: Verificar que os testes existentes passam antes de qualquer mudança

```bash
cd apps/frontend
pnpm test -- -t "GymDetailPage" --reporter=verbose
```

Saída esperada: todos os testes existentes em `PASS`. Se algum falhar, não prosseguir —
investigar antes.

### Step 2: Adicionar os três casos de teste no `describe("GymDetailPage")`

Abrir `apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx` e adicionar
os três `test()` abaixo **dentro** do `describe("GymDetailPage", () => { ... })`,
após o último teste existente (antes do `})`):

```typescript
	test("exibe link de edição para usuário admin", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-1", role: "ADMIN" },
		})
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json(
					{
						id: "gym-1",
						title: "Iron Gym",
						description: null,
						phone: null,
						latitude: -23.5,
						longitude: -46.6,
					},
					{ status: 200 },
				),
			),
		)
		renderWithProviders(<GymDetailPage />)

		const editLink = await screen.findByTestId("gym-detail-edit")
		expect(editLink).toBeInTheDocument()
		expect(editLink).toHaveAttribute("href", "/admin/academias/gym-1/editar")
	})

	test("rotula o link de edição com o nome da academia", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-1", role: "ADMIN" },
		})
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json(
					{
						id: "gym-1",
						title: "Iron Gym",
						description: null,
						phone: null,
						latitude: -23.5,
						longitude: -46.6,
					},
					{ status: 200 },
				),
			),
		)
		renderWithProviders(<GymDetailPage />)

		expect(
			await screen.findByRole("link", { name: "Editar academia Iron Gym" }),
		).toBeInTheDocument()
	})

	test("não exibe link de edição para usuário não-admin", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json(
					{
						id: "gym-1",
						title: "Iron Gym",
						description: null,
						phone: null,
						latitude: -23.5,
						longitude: -46.6,
					},
					{ status: 200 },
				),
			),
		)
		renderWithProviders(<GymDetailPage />)

		await screen.findByTestId("gym-detail-title")
		expect(screen.queryByTestId("gym-detail-edit")).not.toBeInTheDocument()
	})
```

### Step 3: Confirmar que os novos testes falham (TDD red)

```bash
cd apps/frontend
pnpm test -- -t "exibe link de edição para usuário admin|rotula o link de edição|não exibe link de edição" --reporter=verbose
```

Saída esperada: os três novos testes falham com mensagem similar a
`Unable to find an element by: [data-testid="gym-detail-edit"]`.
Se passarem sem implementação, a fixture de teste está incorreta — revisar.

### Step 4: Commit dos testes

```bash
cd apps/frontend
pnpm --filter frontend lint:fix
```

Saída esperada: zero issues Biome.

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/frontend/src/app/\(authenticated\)/academias/\[id\]/page.test.tsx
git commit -m "test: casos TDD para botão editar no detalhe da academia (red)"
```

## Critérios de Sucesso

- Os três novos `test()` existem no arquivo e falham com a implementação atual.
- Os testes existentes (`exibe nome, descrição...`, `exibe Skeleton...`, etc.) continuam passando.
- `pnpm lint:fix` retorna zero issues.
