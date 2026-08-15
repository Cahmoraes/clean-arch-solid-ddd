# Task 4: Página `/perfil` tabbed com aba "Atividade" [FR-001, FR-003, FR-006, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-historico-atividade-perfil.md`
**Spec:** `../specs/historico-atividade-perfil-design.md`
**Mockup:** `../specs/mockups/historico-atividade-perfil-visual.md`
**Tier:** standard
**Depends on:** task-02, task-03

## Visão Geral

Transforma a página `/perfil` em uma página tabbed (opção B do mockup): abas `Visão geral` | `Atividade` no padrão do `UserDetailTabs` admin. A aba "Visão geral" mantém o conteúdo atual (grid `ProfileCard` | `MetricCard`); a aba "Atividade" renderiza o feed de atividades dentro de um `Card` de largura total usando o `ActivityTab` compartilhado (de task-02). O feed busca de forma lazy via `useUserActivity(undefined, { enabled: activeTab === "atividade" })` (de task-03), consumindo o novo endpoint `GET /users/me/activity` (de task-01) com os últimos 20 eventos, sem paginação nem "carregar mais" (FR-006, mesma decisão da tela admin — a `ActivityTab` não possui paginação). Estados de loading (skeleton), erro (inline, distinto do vazio) e vazio (`EmptyState`) são herdados do `ActivityTab`.

**Decisão de valores de aba:** usar `overview` / `atividade` (PT-BR), espelhando o `UserDetailTabs` admin (`value="atividade"`) e a prosa normativa do mockup (`enabled: activeTab === "atividade"`). O `value="activity"` no core markup do mockup é ilustrativo/inglês, não normativo.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx` (adiciona Tabs + aba de atividade)
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx` (novos testes da aba de atividade)

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: lazy-load via `enabled`, query key compartilhada com o admin (`["user-activity", "me"]`) — sem cache duplicado.
- `shadcn`: uso dos componentes `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` e `Card`/`CardContent` do design system real.
- `code-style`: componentes PascalCase, hooks `use*`, tabs (indentação), descrições de teste em PT-BR com `test`.
- `tailwindcss`: tokens de layout/estilo do mockup (card full-width, gap).
- `test-antipatterns`: testes contra o comportamento real (fetch lazy, eventos, vazio, erro), sem mocks de componente do `ActivityTab`.

### Fidelidade Visual

Referência: `../specs/mockups/historico-atividade-perfil-visual.md` (artefato curado, opção B — aba "Atividade").

| Aspecto | Mockup (prose/tokens) | Implementação |
| --- | --- | --- |
| Estrutura | Header mantido; tab row logo abaixo do header; conteúdo da aba "Atividade" em card full-width | `<PageContainer>` → header → `<Tabs>` (TabsList + 2 TabsContent) |
| Tab row | Abas `Visão geral` | `Atividade` | `<TabsList>` com `<TabsTrigger value="overview">Visão geral</TabsTrigger>` e `<TabsTrigger value="atividade">Atividade</TabsTrigger>` |
| Card do feed | Card `bg-card`/`border-border`, radius `--radius-lg`, `shadow-sm` | `<Card className="w-full"><CardContent>` (shadcn `Card` real, nota de fidelidade do mockup) envolvendo `<ActivityTab>` |
| Feed | Mesmos detalhes do admin: agrupamento por data, ícone por categoria, descrição + horário, últimos 20 itens, sem paginação | `<ActivityTab>` compartilhado (task-02) com `events`/`isLoading`/`isError` |
| Lazy load | `enabled: activeTab === "atividade"` | `useUserActivity(undefined, { enabled: activeTab === "atividade" })` |
| Estados | Loading (skeleton), erro inline distinto do vazio, vazio (`EmptyState`) | Herdados do `ActivityTab` |
| Sem fonte original | Nenhuma — mockup companion | Implementação com componentes reais do projeto |

## Passos

- **Step 1: Escrever os testes da aba de atividade**

Adicione ao arquivo `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx` um bloco `describe("ProfilePage — aba Atividade")` com os casos abaixo (mantendo o bloco `beforeEach` existente):

```tsx
describe("ProfilePage — aba Atividade", () => {
	test("não busca atividade até a aba ser aberta", async () => {
		const user = userEvent.setup()
		let activityCalled = false
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () => {
				activityCalled = true
				return HttpResponse.json({ events: [] }, { status: 200 })
			}),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		expect(activityCalled).toBe(false)
		expect(screen.queryByTestId("activity-tab-skeleton")).not.toBeInTheDocument()

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		await waitFor(() => {
			expect(activityCalled).toBe(true)
		})
	})

	test("exibe os eventos de atividade quando a aba é aberta", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "CHECK_IN",
								description: "Check-in realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
							{
								id: "activity-2",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: "2025-01-09T08:30:00.000Z",
							},
						],
					},
					{ status: 200 },
				),
			),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Check-in realizado")).toBeInTheDocument()
		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
	})

	test("exibe estado vazio quando não há eventos", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json({ events: [] }, { status: 200 }),
			),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(
			await screen.findByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe erro distinto do vazio quando a busca falha", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(
			await screen.findByRole("alert"),
		).toHaveTextContent(
			"Não foi possível carregar o histórico de atividade.",
		)
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})

	test("exibe skeleton durante o carregamento da atividade", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, async () => {
				await new Promise((resolve) => setTimeout(resolve, 50))
				return HttpResponse.json({ events: [] }, { status: 200 })
			}),
		)

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-card")).toBeInTheDocument()
		})

		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar os testes para confirmar que falham**

Run: `npx vitest run 'src/app/(authenticated)/perfil/page.test.tsx'` (a partir de `apps/frontend`)
Expected: FAIL — a página ainda não tem abas nem o feed (os novos testes não encontram a tab "Atividade" nem os elementos do feed).

- **Step 3: Implementar a página tabbed**

Em `apps/frontend/src/app/(authenticated)/perfil/page.tsx`:

Adicione os imports:

```tsx
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityTab } from "@/features/activity/components/activity-tab"
import { useUserActivity } from "@/features/activity/api/use-user-activity"
```

No componente `ProfilePage`, adicione o estado da aba e o hook lazy (mantendo `editOpen` e os hooks `useMe`/`useMetrics` existentes):

```tsx
const [activeTab, setActiveTab] = React.useState("overview")
const {
	data: activityEvents,
	isLoading: isActivityLoading,
	isError: isActivityError,
} = useUserActivity(undefined, {
	enabled: activeTab === "atividade",
})
```

Reestruture o retorno para envolver o conteúdo no `Tabs` (header e `EditProfileModal` permanecem fora do `Tabs`):

```tsx
return (
	<PageContainer width="default" className="gap-6">
		<header className="flex flex-col gap-1">
			<Eyebrow>Conta</Eyebrow>
			<h1 className="font-display text-3xl font-semibold text-foreground">
				Meu perfil
			</h1>
			<p className="text-sm text-muted-foreground">
				Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
			</p>
		</header>

		<Tabs
			value={activeTab}
			onValueChange={setActiveTab}
			className="flex flex-col gap-4"
		>
			<TabsList>
				<TabsTrigger value="overview">Visão geral</TabsTrigger>
				<TabsTrigger value="atividade">Atividade</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">
				<ProfileCard
					me={me}
					meLoading={meLoading}
					meError={meError}
					meFetching={meFetching}
					onRetry={() => void meRefetch()}
					checkInsCount={metrics?.checkInsCount}
					metricsLoading={metricsLoading}
					metricsError={metricsError}
					onMetricsRetry={() => void metricsRefetch()}
					onEdit={() => {
						if (!editOpen) {
							setEditOpen(true)
						}
					}}
				/>
			</TabsContent>
			<TabsContent value="atividade">
				<Card className="w-full">
					<CardContent>
						<ActivityTab
							events={activityEvents}
							isLoading={isActivityLoading}
							isError={isActivityError}
						/>
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>

		{me ? (
			<EditProfileModal
				open={editOpen}
				onOpenChange={setEditOpen}
				currentName={me.name}
				hasPassword={me.hasPassword}
			/>
		) : null}
	</PageContainer>
)
```

O `ProfileCard`, `ProfileCardLoading`, `ProfileCardError`, `ProfileFactsGrid`, `MetricCard` e o header permanecem como estão — apenas mudam de posição dentro do novo `TabsContent value="overview"`.

- **Step 4: Rodar os testes da página**

Run: `npx vitest run 'src/app/(authenticated)/perfil/page.test.tsx'` (a partir de `apps/frontend`)
Expected: PASS — todos os testes, incluindo os existentes (cartão, status suspenso, edição de perfil, senha) e os novos da aba de atividade.

- **Step 5: Rodar o teste VLT da página (regressão)**

Run: `npx vitest run 'src/app/(authenticated)/perfil/perfil-volt.test.tsx'` (a partir de `apps/frontend`)
Expected: PASS — a página segue íntegra; o hook de atividade fica com `enabled: false` até a aba ser aberta, então não dispara requisições nem quebra o teste VLT.

- **Step 6: Commit** *(execução sequencial apenas — em wave paralela o orquestrador faz o commit na barreira de integração. Se você for um implementador em árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/app/\(authenticated\)/perfil
git commit -m "feat(frontend): add activity tab to perfil page"
```

## Critérios de Sucesso

- Página `/perfil` é tabbed (`Visão geral` | `Atividade`), espelhando o padrão do `UserDetailTabs` admin (FR-001, Consistência).
- Aba "Atividade" renderiza o feed no `Card` full-width via `ActivityTab` compartilhado, com os últimos 20 eventos do `GET /users/me/activity`, sem paginação nem "carregar mais" (FR-003, FR-006).
- Feed carrega de forma lazy, apenas quando a aba é aberta (FR-007) — teste de "não busca até abrir" valida o `enabled`.
- Estados de loading (skeleton `activity-tab-skeleton`), erro (inline `role="alert"`, distinto do vazio) e vazio (`EmptyState`) corretos.
- Nenhuma regressão nos testes existentes da página (cartão, badges, modal de edição, senha) nem no teste VLT.
- Sem duplicação: admin e perfil usam o mesmo `ActivityTab` e o mesmo hook (D2, D3).