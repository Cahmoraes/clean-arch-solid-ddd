# Task 3: Adicionar seletor visual de itens por página [FR-001, FR-003, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-user-activity-pagination-capability.md`
**Spec:** `../specs/user-activity-pagination-capability-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Adicionar o controle visual “Itens por página” na barra de paginação da atividade do perfil, usando controle nativo acessível com opções `10`, `20` e `50`. A opção atual deve ficar perceptível, o resumo continua baseado em `pagination.pageSize` retornado pela API e trocar o tamanho define `page=1` preservando os demais parâmetros da URL.

## Arquivos

- Create: `apps/frontend/src/features/activity/components/activity-pagination-card-header.test.tsx`
- Modify: `apps/frontend/src/features/activity/components/activity-pagination-card-header.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`
- Test: `apps/frontend/src/features/activity/components/activity-pagination-card-header.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: aplicar tokens/utilitários existentes para controle compacto na barra de paginação.
- `vercel-react-best-practices`: manter componente controlado por props, sem efeitos desnecessários e sem re-renderizações artificiais.
- `ui-ux-pro-max`: preservar hierarquia visual, acessibilidade do rótulo e clareza do estado selecionado.
- `test-antipatterns`: testar interação real por role/label/valor selecionado com Testing Library.
- `no-workarounds`: usar controle nativo acessível sem adicionar dependência de Select ou hack de estado.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/pagination-size-options.md` (baseline de layout, spacing, hierarquia e tokens)
- **Fonte de design original:** nenhuma; a fonte original é inexistente e o spec determina seguir o mockup curado.
- **Confirmar com o usuário:** a fonte original já está declarada como inexistente no spec; confirmar apenas se o usuário fornecer novo artefato durante a execução.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills disponíveis `ui-ux-pro-max` e `tailwindcss`; não há ferramenta de visual regression obrigatória configurada para esta task.
- **Decisões visuais já tomadas (não refazer):** seletor “Itens por página” na mesma barra da paginação, próximo ao resumo/list controls; opções `10`, `20` e `50`; `20` como padrão; navegação numérica continua visível e sem mudança conceitual de posição; ao trocar a opção, a página volta para `1`; resumo reflete `pageSize` retornado pela API; preservar hierarquia e tokens existentes da tela de atividade, sem modal ou nova área.

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Read the design source and fidelity tools already recorded in `### Fidelidade Visual` (the plan author discovered them once, at plan time). Confirm the original design source with the user — only this needs the user and so belongs at execution — and fill any gap the plan left open (re-run tool discovery only if the field was left blank, inspecting the available skills + connected MCP tools; match by capability, never hardcode a tool). If a source URL or a fidelity tool exists, use it; otherwise build to the curated mockup at `../specs/mockups/pagination-size-options.md` manually. The mockup is the *norte* — reuse its decided layout, spacing, and tokens; do not re-derive them.

- **Step 1: Write the failing test**

Crie `apps/frontend/src/features/activity/components/activity-pagination-card-header.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { ActivityPaginationCardHeader } from "./activity-pagination-card-header"

function buildPagination(
	overrides: Partial<{
		page: number
		pageSize: number
		total: number
		totalPages: number
	}> = {},
) {
	return {
		page: 1,
		pageSize: 20,
		total: 120,
		totalPages: 6,
		...overrides,
	}
}

describe("ActivityPaginationCardHeader", () => {
	test("renderiza seletor acessível de itens por página com valor atual", () => {
		render(
			<ActivityPaginationCardHeader
				pagination={buildPagination({ pageSize: 50 })}
				isTransitioning={false}
				onPageChange={vi.fn()}
				onPageSizeChange={vi.fn()}
				pageSize={50}
				testIdPrefix="activity-top"
			/>,
		)

		const select = screen.getByRole("combobox", {
			name: "Itens por página",
		})
		expect(select).toHaveValue("50")
		expect(screen.getByRole("option", { name: "10" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "20" })).toBeInTheDocument()
		expect(screen.getByRole("option", { name: "50" })).toBeInTheDocument()
	})

	test("chama onPageSizeChange ao alterar o controle nativo", async () => {
		const user = userEvent.setup()
		const onPageSizeChange = vi.fn()
		render(
			<ActivityPaginationCardHeader
				pagination={buildPagination()}
				isTransitioning={false}
				onPageChange={vi.fn()}
				onPageSizeChange={onPageSizeChange}
				pageSize={20}
				testIdPrefix="activity-top"
			/>,
		)

		await user.selectOptions(
			screen.getByRole("combobox", { name: "Itens por página" }),
			"10",
		)

		expect(onPageSizeChange).toHaveBeenCalledWith(10)
	})
})
```

Em `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`, adicione dentro de `describe("ProfilePage — aba Atividade", ...)`:

```typescript
test("altera itens por página, volta para page 1 e mantém demais parâmetros", async () => {
	const user = userEvent.setup()
	const requestedParams: string[] = []
	server.use(
		http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
			const searchParams = new URL(request.url).searchParams
			requestedParams.push(searchParams.toString())
			const requestedPage = searchParams.get("page") ?? "1"
			const requestedPageSize = searchParams.get("pageSize") ?? "20"
			return HttpResponse.json(
				{
					events: [
						{
							id: `activity-${requestedPageSize}`,
							type: "LOGIN",
							description: `Login com ${requestedPageSize} itens`,
							occurredAt: "2025-01-10T12:00:00.000Z",
						},
					],
					pagination: {
						page: Number(requestedPage),
						pageSize: Number(requestedPageSize),
						total: 120,
						totalPages: Math.ceil(120 / Number(requestedPageSize)),
					},
				},
				{ status: 200 },
			)
		}),
	)
	currentSearchParams = new URLSearchParams("filter=all&page=3&pageSize=20")

	renderProfilePageWithStatefulSearchParams()

	await waitFor(() => {
		expect(screen.getByTestId("profile-card")).toBeInTheDocument()
	})
	await user.click(screen.getByRole("tab", { name: "Atividade" }))
	expect(await screen.findByText("Login com 20 itens")).toBeInTheDocument()

	await user.selectOptions(
		screen.getByRole("combobox", { name: "Itens por página" }),
		"50",
	)

	expect(replaceMock).toHaveBeenCalledWith("?filter=all&page=1&pageSize=50")
	expect(await screen.findByText("Login com 50 itens")).toBeInTheDocument()
	expect(screen.getByRole("combobox", { name: "Itens por página" })).toHaveValue(
		"50",
	)
	expect(screen.getByTestId("activity-summary")).toHaveTextContent(
		"Exibindo 1–50 de 120 atividades",
	)
	expect(requestedParams).toEqual([
		"page=3&pageSize=20",
		"page=1&pageSize=50",
	])
})
```

Review Focus: os testes usam role/label/valor selecionado para garantir acessibilidade e estado visível do controle; o teste de página garante `page=1` ao trocar tamanho e resumo baseado na resposta atual.

- **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter frontend exec vitest run src/features/activity/components/activity-pagination-card-header.test.tsx
pnpm --filter frontend exec vitest run 'src/app/(authenticated)/perfil/page.test.tsx' -t "altera itens por página"
```

Expected: FAIL. `ActivityPaginationCardHeader` ainda não recebe `pageSize`/`onPageSizeChange`, não renderiza o combobox “Itens por página” e `ProfilePage` ainda não redefine `page=1` ao alterar o tamanho.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/activity/components/activity-pagination-card-header.tsx`, importe o tipo/opções:

```typescript
import type { ChangeEvent } from "react"
import {
	type ActivityPageSize,
	ACTIVITY_PAGE_SIZE_OPTIONS,
	DEFAULT_ACTIVITY_PAGE_SIZE,
	isActivityPageSize,
} from "@/features/activity/lib/activity-pagination"
```

Atualize a assinatura de props:

```typescript
export function ActivityPaginationCardHeader({
	pagination,
	isTransitioning,
	onPageChange,
	onPageSizeChange,
	pageSize = DEFAULT_ACTIVITY_PAGE_SIZE,
	testIdPrefix,
}: {
	pagination: UserActivityPagination | undefined
	isTransitioning: boolean
	onPageChange: (page: number) => void
	onPageSizeChange?: (pageSize: ActivityPageSize) => void
	pageSize?: ActivityPageSize
	testIdPrefix: string
}) {
```

Dentro do componente, antes do `return`, adicione o handler controlado:

```typescript
function handlePageSizeChange(event: ChangeEvent<HTMLSelectElement>) {
	if (!onPageSizeChange) return
	const nextPageSize = Number(event.target.value)
	if (isActivityPageSize(nextPageSize)) {
		onPageSizeChange(nextPageSize)
	}
}
```

Substitua o badge fixo `20 por página` por um controle nativo quando `onPageSizeChange` existir, mantendo o badge informativo para consumidores sem seleção:

```tsx
{onPageSizeChange ? (
	<label className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
		<span>Itens por página</span>
		<select
			value={pageSize}
			onChange={handlePageSizeChange}
			disabled={isTransitioning}
			className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
		>
			{ACTIVITY_PAGE_SIZE_OPTIONS.map((option) => (
				<option key={option} value={option}>
					{option}
				</option>
			))}
		</select>
	</label>
) : (
	<span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
		{pagination?.pageSize ?? DEFAULT_ACTIVITY_PAGE_SIZE} por página
	</span>
)}
```

Em `apps/frontend/src/app/(authenticated)/perfil/page.tsx`, passe `pageSize` e o callback para o header. Primeiro importe o tipo se ainda não estiver importado:

```typescript
import {
	type ActivityPageSize,
	getActivityPageFromParam,
	getActivityPageSizeFromParam,
	isValidActivityPageParam,
	isValidActivityPageSizeParam,
} from "@/features/activity/lib/activity-pagination"
```

Adicione o handler no `ProfilePageContent`:

```typescript
function handleActivityPageSizeChange(nextPageSize: ActivityPageSize) {
	const params = new URLSearchParams(searchParams.toString())
	params.set("page", "1")
	params.set("pageSize", String(nextPageSize))
	router.replace(`?${params.toString()}`)
}
```

Atualize `ActivityPaginationCardHeader` no perfil:

```tsx
<ActivityPaginationCardHeader
	pagination={activityData?.pagination}
	isTransitioning={isActivityFetching || isActivityPlaceholderData}
	onPageChange={handleActivityPageChange}
	onPageSizeChange={handleActivityPageSizeChange}
	pageSize={pageSize}
	testIdPrefix="activity-top"
/>
```

- **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter frontend exec vitest run src/features/activity/components/activity-pagination-card-header.test.tsx
pnpm --filter frontend exec vitest run 'src/app/(authenticated)/perfil/page.test.tsx' -t "altera itens por página"
```

Expected: PASS. O combobox “Itens por página” exibe `10`, `20` e `50`, mantém o valor atual selecionado, chama `onPageSizeChange` com número permitido e a página do perfil troca para `?page=1&pageSize=<valor>` preservando parâmetros existentes.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/features/activity/components/activity-pagination-card-header.tsx apps/frontend/src/features/activity/components/activity-pagination-card-header.test.tsx 'apps/frontend/src/app/(authenticated)/perfil/page.tsx' 'apps/frontend/src/app/(authenticated)/perfil/page.test.tsx'
git commit -m "feat: add profile activity page size selector

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- [FR-001] A atividade do próprio perfil oferece opções visíveis `10`, `20` e `50`.
- [FR-003] O controle e o resumo indicam o tamanho efetivamente aplicado pela paginação retornada.
- [FR-006] Alterar o tamanho define `page=1` e preserva os demais parâmetros da URL.
- O controle “Itens por página” é acessível por role/label e expõe o valor selecionado.
- A UI segue o mockup curado e as decisões visuais do spec, sem adicionar dependência de Select ou criar nova área/modal.
