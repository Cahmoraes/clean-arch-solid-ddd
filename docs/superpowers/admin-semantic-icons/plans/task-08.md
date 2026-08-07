# Task 8: Botões Aprovar/Rejeitar ícone-só + tooltip em check-ins [FR-006, FR-008]

**Status:** PENDING
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** standard
**Depends on:** task-01, task-02, task-03

## Visão Geral

Migrar os botões `Aprovar`/`Rejeitar` de `check-in-actions.tsx` (hoje `<button>` nativos com texto) para o componente compartilhado `Button` (`size="icon"`), com ícones `Check`/`X` (via `ACTION_ICON`), `aria-label` dinâmico e `Tooltip` (FR-006), cobrindo FR-008 (aria-label + tooltip) nesta mesma superfície.

**Nota importante de infraestrutura de teste (mesma descoberta das tasks 6 e 7):** o Radix `Tooltip.Root` lança erro em runtime sem um `TooltipProvider` ancestral. O arquivo de teste atual usa `render()` puro de `@testing-library/react`. Esta task troca todas as chamadas de `render(` por `renderWithProviders(` (import de `@/test/render`) neste arquivo — a partir desta task qualquer render de `CheckInActions` com botões visíveis monta um `Tooltip.Root`.

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: migração de elemento nativo para `Button` compartilhado com variantes existentes.
- `vercel-composition-patterns`: composição `Tooltip` + `Button` com `aria-label` dinâmico.
- `tailwindcss`: preservar a semântica visual (accent para aprovar, destructive-soft para rejeitar) ao trocar classes custom por `buttonVariants`.
- `test-antipatterns`: manter `data-testid` como estratégia de query primária (convenção já estabelecida neste arquivo) e complementar com asserções de acessibilidade, sem substituir a estratégia existente.
- `impeccable`: acessibilidade de par de ações ícone-só (Aprovar/Rejeitar) em fluxo de revisão — aria-label dinâmico durante estado pendente é um detalhe de UX não trivial.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-semantic-icons-visual.md`
- **Fonte de design original:** nenhuma — layout definido via mockup do companion de brainstorming, aprovado interativamente pelo usuário.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** ícone `Check` (via `ACTION_ICON.approve`) para Aprovar, ícone `X` (via `ACTION_ICON.reject`) para Rejeitar; `aria-label` dinâmico (`"Aprovar"`/`"Aprovando..."`, `"Rejeitar"`/`"Rejeitando..."`) e o mesmo texto como conteúdo do tooltip. Cor accent para Aprovar e destructive-soft para Rejeitar são preservadas (mesma semântica visual do `<button>` nativo anterior). **Correção incluída (achado da revisão de spec):** hoje o botão nativo troca o TEXTO para "Aprovando..."/"Rejeitando..." durante o envio, dando ao usuário vidente uma pista visual de qual ação está em voo — ao virar ícone-só, `aria-label`/tooltip dinâmicos preservam essa informação só para leitor de tela/hover, mas ambos os ícones ficam visualmente `disabled:opacity-50` ao mesmo tempo (já que `isLoading = validate.isPending || reject.isPending` desabilita os dois). Esta task fecha essa lacuna trocando o ícone do botão que está de fato pendente (`isPending`, não `isLoading`) por `Loader2` (`lucide-react`) com `animate-spin`, mantendo o outro botão com seu ícone normal — dá ao usuário vidente a mesma pista que o texto dava antes.

## Passos

- **Step 1: Write the failing test**

Substituir o conteúdo de `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx` por:

```tsx
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { useRejectCheckIn, useValidateCheckIn } from "@/features/check-ins/api"
import { ApiError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render"
import { CheckInActions } from "./check-in-actions.js"

vi.mock("@/features/check-ins/api", () => ({
	useValidateCheckIn: vi.fn(),
	useRejectCheckIn: vi.fn(),
}))

const makeMutation = (overrides: Record<string, unknown> = {}) => ({
	mutateAsync: vi.fn().mockResolvedValue(undefined),
	isPending: false,
	...overrides,
})

const pendingCheckIn = {
	id: "ci-1",
	gymId: "g-1",
	gymTitle: "Iron Gym",
	status: "pending" as const,
	validatedAt: null,
	rejectedAt: null,
	createdAt: "2024-01-01T10:00:00Z",
}

const validatedCheckIn = {
	...pendingCheckIn,
	id: "ci-2",
	status: "validated" as const,
	validatedAt: "2024-01-01T11:00:00Z",
}

const rejectedCheckIn = {
	...pendingCheckIn,
	id: "ci-3",
	status: "rejected" as const,
	rejectedAt: "2024-01-01T11:00:00Z",
}

describe("CheckInActions", () => {
	beforeEach(() => {
		vi.mocked(toast.success).mockClear()
		vi.mocked(toast.error).mockClear()
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation() as unknown as ReturnType<typeof useValidateCheckIn>,
		)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation() as unknown as ReturnType<typeof useRejectCheckIn>,
		)
	})

	test("renders Aprovar and Rejeitar buttons for a pending check-in", () => {
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		expect(screen.getByTestId("checkin-approve-ci-1")).toBeInTheDocument()
		expect(screen.getByTestId("checkin-reject-ci-1")).toBeInTheDocument()
	})

	test("renders only Rejeitar button for a validated check-in", () => {
		renderWithProviders(<CheckInActions checkIn={validatedCheckIn} />)
		expect(screen.getByTestId("checkin-reject-ci-2")).toBeInTheDocument()
		expect(
			screen.queryByTestId("checkin-approve-ci-2"),
		).not.toBeInTheDocument()
	})

	test("renders nothing for a rejected check-in", () => {
		const { container } = renderWithProviders(
			<CheckInActions checkIn={rejectedCheckIn} />,
		)
		expect(container).toBeEmptyDOMElement()
	})

	test("calls validate.mutateAsync and shows success toast on Aprovar click", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-approve-ci-1"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-1")
		expect(toast.success).toHaveBeenCalledWith(
			"Check-in aprovado com sucesso.",
		)
	})

	test("calls reject.mutateAsync and shows success toast on Rejeitar click (pending)", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useRejectCheckIn
			>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-1"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-1")
		expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
	})

	test("calls reject.mutateAsync and shows success toast on Rejeitar click (validated)", async () => {
		const mutateAsync = vi.fn().mockResolvedValue(undefined)
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({ mutateAsync }) as unknown as ReturnType<
				typeof useRejectCheckIn
			>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={validatedCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-2"))
		expect(mutateAsync).toHaveBeenCalledWith("ci-2")
		expect(toast.success).toHaveBeenCalledWith("Check-in rejeitado.")
	})

	test("shows error toast with ApiError.userMessage when validate fails", async () => {
		const apiError = new ApiError(
			409,
			"already_validated",
			"Conflito ao processar a solicitação.",
		)
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({
				mutateAsync: vi.fn().mockRejectedValue(apiError),
			}) as unknown as ReturnType<typeof useValidateCheckIn>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-approve-ci-1"))
		expect(toast.error).toHaveBeenCalledWith(
			"Conflito ao processar a solicitação.",
		)
	})

	test("shows fallback error toast when reject fails with unknown error", async () => {
		vi.mocked(useRejectCheckIn).mockReturnValue(
			makeMutation({
				mutateAsync: vi.fn().mockRejectedValue(new Error("network")),
			}) as unknown as ReturnType<typeof useRejectCheckIn>,
		)
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		await user.click(screen.getByTestId("checkin-reject-ci-1"))
		expect(toast.error).toHaveBeenCalledWith(
			"Não foi possível rejeitar o check-in.",
		)
	})

	test("FR-006: os botões usam o componente Button compartilhado, sem texto visível", () => {
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")
		const rejectBtn = screen.getByTestId("checkin-reject-ci-1")
		expect(within(approveBtn).queryByText("Aprovar")).not.toBeInTheDocument()
		expect(approveBtn).toHaveAttribute("aria-label", "Aprovar")
		expect(within(rejectBtn).queryByText("Rejeitar")).not.toBeInTheDocument()
		expect(rejectBtn).toHaveAttribute("aria-label", "Rejeitar")
	})

	test("FR-008: exibe tooltip no hover e no foco de teclado de cada botão", async () => {
		const user = userEvent.setup()
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")

		await user.hover(approveBtn)
		expect(await screen.findByText("Aprovar")).toBeInTheDocument()
		await user.unhover(approveBtn)

		approveBtn.focus()
		expect(await screen.findByText("Aprovar")).toBeInTheDocument()
	})

	test("mostra um ícone de carregamento apenas no botão que está de fato pendente", () => {
		vi.mocked(useValidateCheckIn).mockReturnValue(
			makeMutation({ isPending: true }) as unknown as ReturnType<
				typeof useValidateCheckIn
			>,
		)
		renderWithProviders(<CheckInActions checkIn={pendingCheckIn} />)
		const approveBtn = screen.getByTestId("checkin-approve-ci-1")
		const rejectBtn = screen.getByTestId("checkin-reject-ci-1")
		expect(
			(approveBtn as HTMLElement).querySelector(".animate-spin"),
		).toBeInTheDocument()
		expect(
			(rejectBtn as HTMLElement).querySelector(".animate-spin"),
		).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/check-ins/components/check-in-actions.test.tsx`
Expected: FAIL em dois testes — "FR-006: os botões usam o componente Button compartilhado, sem texto visível" (os botões atuais renderizam "Aprovar"/"Rejeitar" como texto visível e não têm `aria-label`) e "mostra um ícone de carregamento apenas no botão que está de fato pendente" (o `<button>` nativo atual não tem lógica de `Loader2`/`animate-spin`, então `querySelector(".animate-spin")` retorna `null`). (O teste "FR-008" pode passar trivialmente neste estado intermediário, já que o texto do botão em si já está visível sem precisar de hover — isso é esperado e é corrigido pelo Step 3, que remove o texto visível dos botões.) Os demais testes (pré-existentes, agora usando `renderWithProviders`) continuam passando sem alteração de comportamento.

- **Step 3: Write minimal implementation**

Editar `apps/frontend/src/features/check-ins/components/check-in-actions.tsx`:

```tsx
"use client"

import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ACTION_ICON } from "@/components/ui/status-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CheckIn } from "@/features/check-ins/api"
import { useRejectCheckIn, useValidateCheckIn } from "@/features/check-ins/api"
import { ApiError } from "@/lib/errors"

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) return error.userMessage
	return fallback
}

interface CheckInActionsProps {
	checkIn: CheckIn
}

interface RejectButtonProps {
	checkInId: string
	onClick: () => Promise<void>
	isLoading: boolean
	isPending: boolean
}

const ApproveIcon = ACTION_ICON.approve
const RejectIcon = ACTION_ICON.reject

function RejectButton({
	checkInId,
	onClick,
	isLoading,
	isPending,
}: RejectButtonProps) {
	const label = isPending ? "Rejeitando..." : "Rejeitar"
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClick}
					disabled={isLoading}
					aria-busy={isPending}
					aria-label={label}
					data-testid={`checkin-reject-${checkInId}`}
					className="bg-destructive-soft text-destructive hover:bg-destructive hover:text-destructive-foreground"
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					) : (
						<RejectIcon className="h-4 w-4" aria-hidden="true" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

interface ApproveButtonProps {
	checkInId: string
	onClick: () => Promise<void>
	isLoading: boolean
	isPending: boolean
}

function ApproveButton({
	checkInId,
	onClick,
	isLoading,
	isPending,
}: ApproveButtonProps) {
	const label = isPending ? "Aprovando..." : "Aprovar"
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={onClick}
					disabled={isLoading}
					aria-busy={isPending}
					aria-label={label}
					data-testid={`checkin-approve-${checkInId}`}
					className="bg-accent text-accent-foreground hover:bg-primary-strong"
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
					) : (
						<ApproveIcon className="h-4 w-4" aria-hidden="true" />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}

interface PendingActionsProps {
	checkInId: string
	onValidate: () => Promise<void>
	onReject: () => Promise<void>
	isLoading: boolean
	isValidating: boolean
	isRejecting: boolean
}

function PendingActions({
	checkInId,
	onValidate,
	onReject,
	isLoading,
	isValidating,
	isRejecting,
}: PendingActionsProps) {
	return (
		<div className="flex gap-2 max-[560px]:flex-col">
			<ApproveButton
				checkInId={checkInId}
				onClick={onValidate}
				isLoading={isLoading}
				isPending={isValidating}
			/>
			<RejectButton
				checkInId={checkInId}
				onClick={onReject}
				isLoading={isLoading}
				isPending={isRejecting}
			/>
		</div>
	)
}

export function CheckInActions({ checkIn }: CheckInActionsProps) {
	const validate = useValidateCheckIn()
	const reject = useRejectCheckIn()
	const isLoading = validate.isPending || reject.isPending

	async function handleValidate() {
		try {
			await validate.mutateAsync(checkIn.id)
			toast.success("Check-in aprovado com sucesso.")
		} catch (error) {
			toast.error(errorMessage(error, "Não foi possível aprovar o check-in."))
		}
	}

	async function handleReject() {
		try {
			await reject.mutateAsync(checkIn.id)
			toast.success("Check-in rejeitado.")
		} catch (error) {
			toast.error(errorMessage(error, "Não foi possível rejeitar o check-in."))
		}
	}

	if (checkIn.status === "validated") {
		return (
			<div className="flex gap-2 max-[560px]:flex-col">
				<RejectButton
					checkInId={checkIn.id}
					onClick={handleReject}
					isLoading={isLoading}
					isPending={reject.isPending}
				/>
			</div>
		)
	}

	if (checkIn.status === "pending") {
		return (
			<PendingActions
				checkInId={checkIn.id}
				onValidate={handleValidate}
				onReject={handleReject}
				isLoading={isLoading}
				isValidating={validate.isPending}
				isRejecting={reject.isPending}
			/>
		)
	}

	return null
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/check-ins/components/check-in-actions.test.tsx`
Expected: PASS (todos os 11 testes do arquivo)

- **Step 5: Commit** *(esta task participa da Wave 3 em paralelo com as tasks 5, 6 e 7, em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos alterados — o orquestrador comita na barreira de integração da wave.)*

```bash
git add apps/frontend/src/features/check-ins/components/check-in-actions.tsx apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx
git commit -m "feat: botoes Aprovar/Rejeitar viram icone-so com aria-label dinamico e tooltip (FR-006, FR-008)"
```

## Critérios de Sucesso

- Os botões Aprovar e Rejeitar usam o componente `Button` compartilhado (`size="icon"`), com ícones `Check`/`X` (via `ACTION_ICON.approve`/`ACTION_ICON.reject`), sem texto visível.
- `aria-label` e conteúdo do tooltip mudam dinamicamente conforme o estado pendente (`"Aprovar"`/`"Aprovando..."`, `"Rejeitar"`/`"Rejeitando..."`).
- O botão que está de fato pendente (`isPending`) troca seu ícone por `Loader2` com `animate-spin`; o outro botão mantém seu ícone normal mesmo desabilitado — repõe visualmente para o usuário vidente a pista que o texto "Aprovando.../Rejeitando..." dava antes.
- `data-testid`, `onClick`, `disabled={isLoading}` e `aria-busy={isPending}` permanecem exatamente como estavam.
- Todos os testes de `check-in-actions.test.tsx` (pré-existentes, agora em `test()`, e novos) passam usando `renderWithProviders`.
- `CheckInActions` funciona identicamente em `/check-ins` (rota do próprio usuário, quando admin) e em `/admin/check-ins` — o `TooltipProvider` (task 3) é montado em `providers.tsx`, na raiz da árvore, cobrindo ambas as rotas.
