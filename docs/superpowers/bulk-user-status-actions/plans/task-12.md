# Task 12: AdminUsersContent — integração final (barra + diálogo + hook) [FR-004, FR-005]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** capable
**Depends on:** task-07, task-08, task-09, task-10, task-11

## Visão Geral

Esta task conecta todas as peças construídas nas Tasks 7–11 dentro de `AdminUsersContent`
(`apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`): o estado de seleção
`selectedIds` (Task 7, já limpo automaticamente em mudanças de página/filtro/busca pela
Task 8), o `BulkActionBar` (Task 9), o `BulkStatusConfirmationDialog` (Task 10) e o hook
`useBulkChangeUserStatus` (Task 11). O fluxo final: `BulkActionBar` é renderizado logo
abaixo da lista, visível apenas quando `selectedIds.size > 0`; clicar em "Ativar" ou
"Desativar" abre `BulkStatusConfirmationDialog` com a ação correspondente; confirmar o
diálogo dispara `useBulkChangeUserStatus().mutate({ userIds, action })` e, em caso de
sucesso, limpa `selectedIds` e fecha o diálogo; clicar em "Limpar seleção" apenas zera
`selectedIds`, sem abrir nenhum diálogo.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`

(Mesma decisão de arquivo de teste das Tasks 7 e 8: `admin-users-page.test.tsx` já
estabelece a convenção de mock de autenticação — `useAuthStore.setState(...)` — necessária
para que `resolvePermissions(user, currentUser)` gate a seleção corretamente, e já contém
o `describe("seleção em massa", ...)` acumulado pelas Tasks 7/8, ao qual esta task
acrescenta os 3 novos testes de integração final.)

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: a integração usa o `UseMutationResult` retornado por `useBulkChangeUserStatus()` (Task 11) — `isPending` alimenta o `isPending` do diálogo, e o `onSuccess` local (passado como segundo argumento de `mutate(...)`) limpa a seleção sem duplicar a lógica de invalidação de cache já feita dentro do hook (`onSettled`).
- `vercel-composition-patterns`: `AdminUsersContent` compõe os três componentes novos (`BulkActionBar`, `BulkStatusConfirmationDialog`, o hook) sem que nenhum deles precise conhecer o componente pai — cada um continua recebendo apenas props/callbacks, mantendo a composição unidirecional já estabelecida nas Tasks 9/10.
- `vercel-react-best-practices`: os handlers de abertura/fechamento do diálogo (`handleBulkActivate`, `handleBulkDeactivate`, `handleBulkDialogOpenChange`, `handleBulkConfirm`, `handleBulkClear`) são funções nomeadas declaradas no corpo de `AdminUsersContent`, no mesmo estilo dos handlers já existentes (`handlePageChange`, `handleFilterChange`), evitando closures inline complexos no JSX.
- `tailwindcss`: nenhuma classe nova é introduzida nesta task — `BulkActionBar` e `BulkStatusConfirmationDialog` já trazem seus próprios estilos das Tasks 9/10; esta task apenas os posiciona no layout existente de `page.tsx`.
- `vitest`: os 3 novos testes seguem a convenção `describe`/`test` em português já usada no bloco `describe("seleção em massa", ...)` acumulado pelas Tasks 7/8.
- `test-antipatterns`: os testes disparam a interação real (clicar nos botões do `BulkActionBar`, confirmar no `AlertDialog`) e observam o DOM resultante (diálogo aberto/fechado, checkboxes desmarcados, requisição HTTP recebida via MSW) — nunca chamam `mutate()` ou os handlers diretamente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/bulk-user-status-actions-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion (HTML gerado a partir dos tokens do projeto, sem Figma/wireframe externo).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela, além do mockup curado? Se não houver resposta, prosseguir com o mockup como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `shadcn` (componentes shadcn/ui) e skill `ui-ux-pro-max` (com integração shadcn/ui MCP) — nenhuma ferramenta de design-to-code externa configurada neste repo.
- **Decisões visuais já tomadas (não refazer):** `BulkActionBar` fica ancorado ao rodapé da lista (`sticky bottom-0`), abaixo de `UsersList`/`NumberedPagination`, dentro da mesma coluna da grade (`grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`) já usada por `page.tsx` — não se estende por baixo do painel de detalhe; nenhuma nova decisão de layout é tomada nesta task além de posicionar os componentes já construídos (Tasks 9/10) no lugar certo da árvore.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade
Visual` acima (decididas em tempo de plano). Confirmar com o usuário se existe uma fonte
de design original além do mockup curado — na ausência de resposta, ou se a resposta for
"não", seguir apenas o mockup em
`../specs/mockups/bulk-user-status-actions-visual.md` como norte de posicionamento (o
`BulkActionBar` e o `BulkStatusConfirmationDialog` já foram construídos fielmente ao
mockup nas Tasks 9/10 — esta task apenas os integra, sem redesenhar nada). Não há
ferramenta de design-to-code externa configurada neste repo; usar as skills `shadcn` e
`ui-ux-pro-max` já identificadas apenas para validar visualmente o posicionamento final.

- **Step 1: Escrever o teste falho — clicar "Ativar" na barra abre o diálogo com action="activate"**

No mesmo `describe("seleção em massa", ...)` de
`apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`
(acumulado pelas Tasks 7/8, já com `buildUser`, `mockUsersList`, `beforeEach` de
autenticação e o helper `buildManyUsers` da Task 8), adicionar:

```tsx
	test("clicar em 'Ativar' na barra de ações abre o diálogo de confirmação de ativação", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", status: "suspended" }),
			buildUser({ id: "user-2", status: "suspended" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)

		await user.click(screen.getByRole("button", { name: "Ativar" }))

		expect(
			screen.getByRole("heading", { name: "Confirmar ativação em massa" }),
		).toBeInTheDocument()
	})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "clicar em 'Ativar' na barra de ações abre o diálogo de confirmação de ativação"`
Expected: FAIL — `screen.getByRole("button", { name: "Ativar" })` não é encontrado (o
`BulkActionBar` ainda não é renderizado por `AdminUsersContent`).

- **Step 3: Implementação mínima — integrar BulkActionBar, o diálogo e o hook**

Em `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, adicionar os imports:

```ts
import { BulkActionBar } from "@/features/admin/components/bulk-action-bar"
import {
	BulkStatusConfirmationDialog,
	type BulkStatusAction,
} from "@/features/admin/components/bulk-status-confirmation-dialog"
import { useBulkChangeUserStatus } from "@/features/admin/api/use-bulk-change-user-status"
```

Em `AdminUsersContent`, adicionar o estado do diálogo e o hook de mutation (logo após a
declaração de `selectedIds`/`toggleSelect` da Task 7):

```tsx
	const [bulkAction, setBulkAction] = useState<BulkStatusAction | null>(null)
	const bulkChangeUserStatus = useBulkChangeUserStatus()

	function handleBulkActivate() {
		setBulkAction("activate")
	}

	function handleBulkDeactivate() {
		setBulkAction("deactivate")
	}

	function handleBulkClear() {
		setSelectedIds(new Set())
	}

	function handleBulkDialogOpenChange(open: boolean) {
		if (!open) setBulkAction(null)
	}

	function handleBulkConfirm() {
		if (!bulkAction) return
		bulkChangeUserStatus.mutate(
			{ userIds: Array.from(selectedIds), action: bulkAction },
			{
				onSuccess: () => {
					setSelectedIds(new Set())
					setBulkAction(null)
				},
			},
		)
	}
```

No JSX de `AdminUsersContent`, adicionar `<BulkActionBar />` e
`<BulkStatusConfirmationDialog />` logo após o `<div className="grid grid-cols-1 gap-6
md:grid-cols-[...]">...</div>` que já envolve `UsersContent`/`UserDetailContainer`, ainda
dentro de `<PageContainer>`:

```tsx
			<BulkActionBar
				selectedCount={selectedIds.size}
				onActivate={handleBulkActivate}
				onDeactivate={handleBulkDeactivate}
				onClear={handleBulkClear}
			/>
			<BulkStatusConfirmationDialog
				open={bulkAction !== null}
				onOpenChange={handleBulkDialogOpenChange}
				action={bulkAction ?? "activate"}
				count={selectedIds.size}
				isPending={bulkChangeUserStatus.isPending}
				onConfirm={handleBulkConfirm}
			/>
		</PageContainer>
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "clicar em 'Ativar' na barra de ações abre o diálogo de confirmação de ativação"`
Expected: PASS

- **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"
git commit -m "feat: integra BulkActionBar, diálogo de confirmação e hook de mutation ao AdminUsersContent"
```

- **Step 6: Escrever o teste falho — confirmar o diálogo chama a mutation e limpa a seleção**

Adicionar ao mesmo `describe`:

```tsx
	test("confirmar o diálogo chama a mutation com os IDs selecionados e limpa a seleção ao suceder", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", status: "suspended" }),
			buildUser({ id: "user-2", status: "suspended" }),
		])

		let receivedBody: { userIds?: string[] } = {}
		server.use(
			http.patch(`${apiBaseUrl}/users/bulk-activate`, async ({ request }) => {
				receivedBody = (await request.json()) as { userIds?: string[] }
				return HttpResponse.json(
					{ updated: 2, requested: 2, skipped: 0 },
					{ status: 200 },
				)
			}),
		)

		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)
		await user.click(
			within(screen.getByTestId("user-row-user-2")).getByRole("checkbox"),
		)

		await user.click(screen.getByRole("button", { name: "Ativar" }))
		await user.click(
			screen.getByRole("button", { name: "Confirmar ativação" }),
		)

		await waitFor(() => {
			expect(
				screen.queryByRole("heading", {
					name: "Confirmar ativação em massa",
				}),
			).not.toBeInTheDocument()
		})

		expect(receivedBody.userIds?.sort()).toEqual(["user-1", "user-2"])
		expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument()
	})
```

- **Step 7: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "confirmar o diálogo chama a mutation com os IDs selecionados e limpa a seleção ao suceder"`
Expected: PASS — nenhuma mudança de implementação necessária além do Step 3; o
`onSuccess` local passado a `mutate(...)` já limpa `selectedIds` e fecha o diálogo
(`setBulkAction(null)`), o que faz `BulkActionBar` retornar `null` (Task 9) e o `AlertDialog`
fechar (Task 10).

- **Step 8: Escrever o teste falho — 'Limpar seleção' zera selectedIds sem abrir diálogo**

Adicionar ao mesmo `describe`:

```tsx
	test("clicar em 'Limpar seleção' zera a seleção sem abrir nenhum diálogo", async () => {
		const user = userEvent.setup()
		mockUsersList([
			buildUser({ id: "user-1", status: "suspended" }),
			buildUser({ id: "user-2", status: "suspended" }),
		])
		renderWithProviders(<AdminUsersPage />)

		await screen.findByTestId("user-row-user-1")
		await user.click(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		)

		expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument()

		await user.click(screen.getByRole("button", { name: "Limpar seleção" }))

		expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument()
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
		expect(
			within(screen.getByTestId("user-row-user-1")).getByRole("checkbox"),
		).toHaveAttribute("aria-checked", "false")
	})
```

- **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "clicar em 'Limpar seleção' zera a seleção sem abrir nenhum diálogo"`
Expected: PASS — `handleBulkClear` (Step 3) apenas chama `setSelectedIds(new Set())`,
nunca `setBulkAction(...)`, então nenhum diálogo é aberto.

- **Step 10: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 11: Rodar a suíte completa do backend (sanidade final, já que a feature atravessa as duas camadas)**

Run: `pnpm --filter backend test:run && pnpm --filter backend test:business-flow`
Expected: PASS — confirma que as Tasks 1–5 (backend) continuam passando junto com a
integração final do frontend.

- **Step 12: Commit final**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"
git commit -m "test: cobre integração final de ativação/desativação em massa no AdminUsersContent"
```

## Critérios de Sucesso

- `BulkActionBar` é renderizado em `AdminUsersContent` e reflete `selectedIds.size` em
  tempo real (FR-004).
- Clicar em "Ativar"/"Desativar" na barra abre `BulkStatusConfirmationDialog` com a
  `action` correspondente e a contagem correta (FR-005).
- Confirmar o diálogo dispara `useBulkChangeUserStatus().mutate({ userIds: Array.from
  (selectedIds), action })` com os IDs corretos; em sucesso, `selectedIds` é zerado e o
  diálogo fecha.
- Clicar em "Limpar seleção" zera `selectedIds` sem nunca abrir
  `BulkStatusConfirmationDialog`.
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check`,
  `pnpm --filter frontend lint:fix` e `pnpm --filter backend test:run` +
  `pnpm --filter backend test:business-flow` passam sem erros — a feature completa
  (Tasks 1–12) está integrada ponta a ponta.
