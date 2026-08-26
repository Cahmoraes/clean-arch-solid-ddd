# Task 7: `details-edit-form` — indicador de obrigatoriedade + ícones decorativos ocultos [FR-002, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`DetailsEditForm` (`apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`) tem dois problemas de acessibilidade: (1) `ProfileFields` renderiza `<Input id="edit-name">` (L121-126) e `<Input id="edit-email">` (L135-141) sem `required`/`aria-required` nem indicador textual, embora nome e e-mail sejam sempre obrigatórios na edição de perfil administrativa; (2) `StatusField` (L175) e `RoleField` (L209) renderizam um `ChevronDown` puramente decorativo dentro de cada `<select>` sem `aria-hidden`. O fix aplica o mesmo padrão de indicador já usado em `EditProfileModal.tsx`/`form-field.tsx` (`sr-only "(obrigatório)"` + `aria-required="true"`, sem asterisco visível) nos dois campos, e `aria-hidden="true"` nos dois ícones `ChevronDown`.

Como o indicador `sr-only "(obrigatório)"` passa a fazer parte do texto do `<label>`, o nome acessível dos inputs de Nome e E-mail muda de `"Nome"`/`"E-mail"` para `"Nome (obrigatório)"`/`"E-mail (obrigatório)"`. O arquivo `details-edit-form.test.tsx` já existe e tem 5 testes com `screen.getByLabelText("Nome")`/`"E-mail"` em **match exato** — essas asserções passam a não encontrar o elemento assim que o indicador for implementado. Esta task também ajusta essas 5 asserções para regex (`/nome/i`/`/e-mail/i`), o mesmo padrão já usado em `contact-form.test.tsx` e `gym-cnpj-field.test.tsx` por essa exata razão.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`
- Test: Modify `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx` (arquivo já existe)

### Conformidade com as Skills Padrão

- `shadcn`: `Input` é a primitiva shadcn/ui (`@/components/ui/input`) consumida por `ProfileFields` — o indicador de obrigatoriedade segue o mesmo markup (`sr-only` dentro do `<label>`) já usado em `FormField`/`FieldShell`/`EditProfileModal`, sem recriar o padrão.
- `wcag-audit-patterns`: critério 3.3.2 (Labels or Instructions) / 4.1.2 (Name, Role, Value) para os campos obrigatórios; critério 1.1.1 (Non-text Content) / 4.1.2 para os ícones `ChevronDown`, redundantes à seta nativa do `<select>` e por isso puramente decorativos.
- `vercel-react-best-practices`: os `select` nativos e os `Input` controlados permanecem com a mesma lógica de estado — a mudança é só de atributos/markup, sem novo estado ou efeito.
- `test-antipatterns`: os testes validam o contrato observável (`aria-required` no input associado via `getByLabelText`, `aria-hidden` no `<svg>` renderizado), não a implementação interna dos sub-componentes `ProfileFields`/`StatusField`/`RoleField`.

## Passos

- **Step 1: Write the failing test**

Em `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx`, ajuste os 5 testes existentes que usam `getByLabelText`/`queryByLabelText` com match exato de `"Nome"`/`"E-mail"` para regex (necessário porque o nome acessível do input muda ao adicionar o indicador — antes da implementação o regex já casa com o texto atual, então esses 5 testes continuam passando sem alteração de comportamento):

```tsx
	test("renderiza inputs de nome e email quando canEditProfile é true", () => {
		renderForm()
		expect(screen.getByLabelText(/nome/i)).toHaveValue("Maria")
		expect(screen.getByLabelText(/e-mail/i)).toHaveValue("maria@test.com")
	})

	test("oculta campos de nome e email quando canEditProfile é false", () => {
		renderForm(buildUser(), { ...allPermissions, canEditProfile: false })
		expect(screen.queryByLabelText(/nome/i)).not.toBeInTheDocument()
		expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
	})
```

```tsx
	test("botão Salvar fica habilitado ao alterar o nome", async () => {
		const user = userEvent.setup()
		renderForm()
		await user.clear(screen.getByLabelText(/nome/i))
		await user.type(screen.getByLabelText(/nome/i), "Novo Nome")
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeEnabled()
	})
```

```tsx
	test("salvar nome alterado envia PATCH e chama onSaved", async () => {
		const onSaved = vi.fn()
		const user = userEvent.setup()
		let patched = false

		server.use(
			http.patch(`${apiBaseUrl}/users/:userId`, () => {
				patched = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		renderForm(buildUser(), allPermissions, vi.fn(), onSaved)

		await user.clear(screen.getByLabelText(/nome/i))
		await user.type(screen.getByLabelText(/nome/i), "Maria Editada")
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

		await waitFor(() => {
			expect(patched).toBe(true)
			expect(onSaved).toHaveBeenCalledOnce()
		})
	})
```

```tsx
	test("exibe erro inline quando a API retorna 403", async () => {
		const user = userEvent.setup()

		server.use(
			http.patch(`${apiBaseUrl}/users/:userId`, () => {
				return HttpResponse.json({ message: "Forbidden" }, { status: 403 })
			}),
		)

		renderForm()

		await user.clear(screen.getByLabelText(/nome/i))
		await user.type(screen.getByLabelText(/nome/i), "Outro Nome")
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument()
		})
	})
```

Em seguida, adicione os 2 testes novos ao final do `describe("DetailsEditForm", ...)`, antes do `})` de fechamento (linha 225 atual):

```tsx
	test("indica os campos Nome e E-mail como obrigatórios via aria-required e texto para leitor de tela", () => {
		renderForm()
		expect(screen.getByLabelText(/nome/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getAllByText("(obrigatório)")).toHaveLength(2)
		expect(screen.queryByText("*")).not.toBeInTheDocument()
	})

	test("ícones decorativos dos selects de Status e Permissão ficam ocultos de leitores de tela", () => {
		renderForm()
		const statusIcon = screen
			.getByLabelText("Status")
			.parentElement?.querySelector("svg")
		const roleIcon = screen
			.getByLabelText("Permissão")
			.parentElement?.querySelector("svg")
		expect(statusIcon).toHaveAttribute("aria-hidden", "true")
		expect(roleIcon).toHaveAttribute("aria-hidden", "true")
	})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/details-edit-form.test.tsx`
Expected: FAIL — os 15 testes pré-existentes (5 deles com matcher ajustado para regex) continuam passando; os 2 testes novos falham: `"indica os campos Nome e E-mail..."` falha em `toHaveAttribute("aria-required", "true")` (recebe `null`) e em `screen.getAllByText("(obrigatório)")` (`Unable to find an element`); `"ícones decorativos dos selects..."` falha em `toHaveAttribute("aria-hidden", "true")` (o `<svg>` existe mas sem o atributo).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`, ajuste `ProfileFields` (L112-145):

```tsx
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="edit-name"
					className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
				>
					Nome
					<span className="sr-only">(obrigatório)</span>
				</label>
				<Input
					id="edit-name"
					value={name}
					onChange={(e) => onNameChange(e.target.value)}
					disabled={isPending}
					required
					aria-required="true"
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<label
					htmlFor="edit-email"
					className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
				>
					E-mail
					<span className="sr-only">(obrigatório)</span>
				</label>
				<Input
					id="edit-email"
					type="email"
					value={email}
					onChange={(e) => onEmailChange(e.target.value)}
					disabled={isPending}
					required
					aria-required="true"
				/>
			</div>
		</div>
	)
```

Em `StatusField` (L175), adicione `aria-hidden="true"` ao ícone:

```tsx
					<ChevronDown
						className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
```

Em `RoleField` (L209), o mesmo ajuste:

```tsx
					<ChevronDown
						className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/details-edit-form.test.tsx`
Expected: PASS — `Test Files 1 passed`, `Tests 17 passed`.

- **Step 5: Commit** *(execução paralela — se seu prompt indicar que você é um de vários implementadores em uma wave compartilhada, pule este passo e apenas reporte os arquivos alterados; o orquestrador comita na barreira de integração.)*

```bash
git add apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx
git commit -m "fix(a11y): indica nome/email obrigatorios e oculta icones decorativos em DetailsEditForm"
```

## Critérios de Sucesso

- `Input#edit-name` e `Input#edit-email` têm `required` e `aria-required="true"` (FR-002).
- Os `<label>` de Nome e E-mail em `ProfileFields` contêm o texto `sr-only` "(obrigatório)", sem nenhum asterisco (`*`) visível solto no DOM (D6).
- Os `ChevronDown` de `StatusField` e `RoleField` têm `aria-hidden="true"` (FR-007).
- `details-edit-form.test.tsx` passa com 17 testes: os 15 pré-existentes (5 com matcher migrado para regex, sem mudança de comportamento) e os 2 novos.
