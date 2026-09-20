# Task 10: Formulário e página Novo aviso [FR-001, FR-003, FR-004, FR-005, FR-013]

**Status:** DONE
**Verified:** `pnpm --filter frontend exec vitest run src/features/notices/components/notice-form.test.tsx` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** capable
**Depends on:** task-08, task-09

## Visão Geral

`NoticeForm` implementa o layout B do mockup: `Card` com o formulário (Título, Mensagem com contador `N / 500`, botão "Enviar aviso") à esquerda e `NoticePreview` à direita, alimentado por `useWatch`; empilha abaixo de ~860px. Ao enviar, chama `useBroadcastNotice`; em sucesso mostra `toast.success("Aviso enviado para N usuários.")` (singular tratado) e limpa o formulário; em erro mostra `toast.error(mensagem)` e mantém o texto digitado; o botão fica desabilitado com "Enviando..." durante o envio. A página `admin/avisos/novo/page.tsx` compõe `PageContainer width="wide"` + `PageHeader` + `NoticeForm`; o `AdminGuard` já vem de `admin/layout.tsx`.

## Arquivos

- Create: `apps/frontend/src/features/notices/components/notice-form.tsx`
- Create: `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-form.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.test.tsx`

### Conformidade com as Skills Padrão

- `test-antipatterns`: testes de comportamento com MSW na borda de rede; só `sonner` é mockado (padrão do repositório) para observar o toast; nada de asserção sobre estado interno do formulário.
- `no-workarounds`: contador, validação e reset vêm de `react-hook-form` + `zodResolver`; o bloqueio de envio duplicado vem de `isPending` da mutation, sem debounce nem flags manuais.
- `vercel-react-best-practices`: `useWatch` no lugar de `watch()` (re-render escopado), sem `useEffect` para derivar estado, `useId` para ids estáveis.
- `tanstack-query-best-practices`: usa `mutateAsync` dentro de try/catch para tratar sucesso e erro no ponto de uso, e `isPending` para o estado do botão.
- `shadcn`: `Card`, `Button` e `FormField` do design system; textarea dentro de `FieldShell`.
- `tailwindcss`: grid `min-[860px]:grid-cols-[1.2fr_1fr]` (mesmo ponto de quebra do shell), tokens semânticos e `text-destructive` para excesso de caracteres.
- `wcag-audit-patterns`: `form` com `aria-label`, campos com rótulo, erros com `role="alert"` e `aria-describedby`/`aria-invalid`, botão desabilitado com texto de estado, contador sem depender só de cor.
- `frontend-design`: layout e hierarquia do mockup B (eyebrow mono "Admin", h1 "Novo aviso", CTA à direita).
- `vercel-composition-patterns`: `NoticeForm` compõe `NoticePreview` como componente filho com props explícitas (`title`, `message`), sem prop booleana de modo.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-notice-broadcast-visual.md` (baseline de layout, espaçamento, hierarquia e tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skills `frontend-design` e `impeccable` (qualidade de UI) e `playwright-cli` ou `claude-in-chrome` (conferir a tela renderizada em `/admin/avisos/novo`); se indisponíveis na execução, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** layout B (formulário em card à esquerda, preview do sino à direita, empilha abaixo de ~860px); `h1` "Novo aviso" com eyebrow mono "Admin"; CTA primário "Enviar aviso" alinhado à direita no card; tema VOLT dark padrão (primário `#39e58c`, card `#161616`, `rounded-md` 14px, `rounded-xl` 22px); toast de sucesso no topo direito

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual`. Confirmar com o usuário se existe fonte de design original (URL/export); se não houver, e sem ferramenta de fidelidade disponível, construir manualmente contra o mockup curado em `../specs/mockups/admin-notice-broadcast-visual.md` (norte, não pixel-final). Este passo nunca bloqueia.

- **Step 1: Write the failing test (formulário)**

```tsx
// apps/frontend/src/features/notices/components/notice-form.test.tsx
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from "sonner"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { NoticeForm } from "./notice-form"

const BROADCAST_PATH = "/api/v1/notifications/broadcast"
const EMPTY_PREVIEW = "Digite o título e a mensagem para ver a pré-visualização."

function titleInput() {
	return screen.getByLabelText(/Título/)
}

function messageInput() {
	return screen.getByLabelText(/Mensagem/)
}

function submitButton() {
	return screen.getByRole("button", { name: /Enviar aviso|Enviando/ })
}

async function fillValidNotice() {
	await userEvent.type(titleInput(), "Manutenção programada")
	await userEvent.type(messageInput(), "O sistema ficará fora do ar às 22h.")
}

beforeEach(() => {
	vi.mocked(toast.success).mockClear()
	vi.mocked(toast.error).mockClear()
})

describe("NoticeForm", () => {
	test("renderiza campos, contador, botão e pré-visualização vazia", () => {
		renderWithProviders(<NoticeForm />)

		expect(titleInput()).toBeInTheDocument()
		expect(messageInput()).toBeInTheDocument()
		expect(screen.getByText("0 / 500")).toBeInTheDocument()
		expect(submitButton()).toBeEnabled()
		expect(screen.getByText(EMPTY_PREVIEW)).toBeInTheDocument()
	})

	test("a pré-visualização acompanha o que o administrador digita", async () => {
		renderWithProviders(<NoticeForm />)

		await userEvent.type(titleInput(), "Manutenção")
		await userEvent.type(messageInput(), "Sistema fora do ar")

		const preview = screen.getByRole("list")
		expect(within(preview).getByText("Manutenção")).toBeInTheDocument()
		expect(within(preview).getByText("Sistema fora do ar")).toBeInTheDocument()
		expect(screen.queryByText(EMPTY_PREVIEW)).not.toBeInTheDocument()
	})

	test("o contador reflete a quantidade de caracteres da mensagem", async () => {
		renderWithProviders(<NoticeForm />)

		await userEvent.type(messageInput(), "abc")

		expect(screen.getByText("3 / 500")).toBeInTheDocument()
	})

	test("recusa envio vazio com mensagens claras e sem chamar a API", async () => {
		let requests = 0
		server.use(
			http.post(endpoint(BROADCAST_PATH), () => {
				requests += 1
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)

		await userEvent.click(submitButton())

		const alerts = await screen.findAllByRole("alert")
		expect(alerts.map((alert) => alert.textContent)).toEqual([
			"Informe o título do aviso.",
			"Informe a mensagem do aviso.",
		])
		expect(requests).toBe(0)
		expect(toast.success).not.toHaveBeenCalled()
	})

	test("recusa mensagem com mais de 500 caracteres", async () => {
		renderWithProviders(<NoticeForm />)
		await userEvent.type(titleInput(), "Aviso")
		fireEvent.change(messageInput(), { target: { value: "a".repeat(501) } })

		await userEvent.click(submitButton())

		expect(
			await screen.findByText("A mensagem deve ter no máximo 500 caracteres."),
		).toBeInTheDocument()
		expect(screen.getByText("501 / 500")).toBeInTheDocument()
	})

	test("sucesso: envia o corpo, mostra o toast com o total e limpa o formulário", async () => {
		let receivedBody: unknown
		server.use(
			http.post(endpoint(BROADCAST_PATH), async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Aviso enviado para 3 usuários."),
		)
		expect(receivedBody).toEqual({
			title: "Manutenção programada",
			message: "O sistema ficará fora do ar às 22h.",
		})
		await waitFor(() => expect(titleInput()).toHaveValue(""))
		expect(messageInput()).toHaveValue("")
		expect(screen.getByText("0 / 500")).toBeInTheDocument()
		expect(screen.getByText(EMPTY_PREVIEW)).toBeInTheDocument()
		expect(toast.error).not.toHaveBeenCalled()
	})

	test("sucesso com um único destinatário usa o singular", async () => {
		server.use(
			http.post(endpoint(BROADCAST_PATH), () =>
				HttpResponse.json({ recipients: 1 }, { status: 201 }),
			),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Aviso enviado para 1 usuário."),
		)
	})

	test("erro: mostra toast de erro e mantém o texto digitado", async () => {
		server.use(
			http.post(endpoint(BROADCAST_PATH), () =>
				HttpResponse.json({ message: "falha" }, { status: 500 }),
			),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Erro interno no servidor. Tente novamente em instantes.",
			),
		)
		expect(toast.success).not.toHaveBeenCalled()
		expect(titleInput()).toHaveValue("Manutenção programada")
		expect(messageInput()).toHaveValue("O sistema ficará fora do ar às 22h.")
	})

	test("desabilita o botão durante o envio e não envia duas vezes", async () => {
		let requests = 0
		let release: () => void = () => undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		server.use(
			http.post(endpoint(BROADCAST_PATH), async () => {
				requests += 1
				await gate
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() => expect(submitButton()).toBeDisabled())
		expect(submitButton()).toHaveTextContent("Enviando...")
		await userEvent.click(submitButton())
		expect(requests).toBe(1)

		release()
		await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
		await waitFor(() => expect(submitButton()).toBeEnabled())
	})

	test("acessibilidade: form rotulado, erros anunciados e campos inválidos marcados", async () => {
		renderWithProviders(<NoticeForm />)

		expect(
			screen.getByRole("form", { name: "Formulário de novo aviso" }),
		).toBeInTheDocument()

		await userEvent.click(submitButton())

		await screen.findAllByRole("alert")
		expect(titleInput()).toHaveAttribute("aria-invalid", "true")
		expect(messageInput()).toHaveAttribute("aria-invalid", "true")
		expect(titleInput()).toHaveAccessibleDescription("Informe o título do aviso.")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/components/notice-form.test.tsx`
Expected: FAIL - não foi possível resolver `./notice-form` (módulo inexistente).

- **Step 3: Write minimal implementation (formulário)**

```tsx
// apps/frontend/src/features/notices/components/notice-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldShell } from "@/components/ui/field-shell"
import { FormField } from "@/components/ui/form-field"
import { useBroadcastNotice } from "@/features/notices/api/use-broadcast-notice"
import { NoticePreview } from "@/features/notices/components/notice-preview"
import {
	NOTICE_MESSAGE_MAX,
	type NoticeInput,
	noticeSchema,
} from "@/features/notices/schemas/notice-schema"
import { cn } from "@/lib/cn"
import { ApiError } from "@/lib/errors"

const EMPTY_NOTICE: NoticeInput = { title: "", message: "" }
const FALLBACK_ERROR_MESSAGE = "Não foi possível enviar o aviso. Tente novamente."

function successMessage(recipients: number): string {
	return recipients === 1
		? "Aviso enviado para 1 usuário."
		: `Aviso enviado para ${recipients} usuários.`
}

function errorMessage(error: unknown): string {
	return error instanceof ApiError ? error.userMessage : FALLBACK_ERROR_MESSAGE
}

export function NoticeForm() {
	const titleId = useId()
	const messageId = useId()
	const counterId = useId()
	const { mutateAsync, isPending } = useBroadcastNotice()
	const {
		register,
		handleSubmit,
		reset,
		control,
		formState: { errors },
	} = useForm<NoticeInput>({
		resolver: zodResolver(noticeSchema),
		defaultValues: EMPTY_NOTICE,
	})
	const [title, message] = useWatch({ control, name: ["title", "message"] })

	async function onSubmit(values: NoticeInput) {
		try {
			const { recipients } = await mutateAsync(values)
			toast.success(successMessage(recipients))
			reset(EMPTY_NOTICE)
		} catch (error) {
			toast.error(errorMessage(error))
		}
	}

	const messageDescribedBy = errors.message
		? `${messageId}-error ${counterId}`
		: counterId

	return (
		<div className="grid gap-4 min-[860px]:grid-cols-[1.2fr_1fr]">
			<Card>
				<CardContent>
					<form
						onSubmit={handleSubmit(onSubmit)}
						noValidate
						className="flex flex-col gap-4"
						aria-label="Formulário de novo aviso"
					>
						<FormField
							id={titleId}
							label="Título"
							error={errors.title?.message}
							{...register("title")}
						/>
						<FieldShell
							id={messageId}
							label="Mensagem"
							error={errors.message?.message}
						>
							<textarea
								id={messageId}
								rows={4}
								aria-invalid={errors.message ? true : undefined}
								aria-describedby={messageDescribedBy}
								className="resize-none rounded-md border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
								{...register("message")}
							/>
							<span
								id={counterId}
								className={cn(
									"text-right text-xs text-muted-foreground",
									message.length > NOTICE_MESSAGE_MAX && "text-destructive",
								)}
							>
								{`${message.length} / ${NOTICE_MESSAGE_MAX}`}
							</span>
						</FieldShell>
						<div className="flex justify-end">
							<Button type="submit" disabled={isPending}>
								{isPending ? "Enviando..." : "Enviar aviso"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
			<NoticePreview title={title} message={message} />
		</div>
	)
}
```

Notas para o implementador: (a) o `FieldShell` renderiza o alerta de erro depois de `children`; o contador fica dentro dos `children`, então aparece acima do erro, o que é aceitável. (b) O `aria-describedby` do título vem do `FormField`.

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/features/notices/components/notice-form.test.tsx`
Expected: PASS (10 testes).

- **Step 5: Write the failing test (página)**

```tsx
// apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.test.tsx
import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/render"
import AdminNovoAvisoPage from "./page"

describe("AdminNovoAvisoPage", () => {
	test("renderiza o cabeçalho com eyebrow Admin, título e subtítulo", () => {
		renderWithProviders(<AdminNovoAvisoPage />)

		expect(screen.getByText("Admin")).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { level: 1, name: "Novo aviso" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Comunicado enviado a todos os usuários pelo sino de notificações.",
			),
		).toBeInTheDocument()
	})

	test("renderiza o formulário e a pré-visualização lado a lado", () => {
		renderWithProviders(<AdminNovoAvisoPage />)

		expect(
			screen.getByRole("form", { name: "Formulário de novo aviso" }),
		).toBeInTheDocument()
		expect(screen.getByText("Como o usuário verá")).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Enviar aviso" }),
		).toBeInTheDocument()
	})
})
```

- **Step 6: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run "src/app/(authenticated)/admin/avisos/novo/page.test.tsx"`
Expected: FAIL - não foi possível resolver `./page` (módulo inexistente).

- **Step 7: Write minimal implementation (página)**

```tsx
// apps/frontend/src/app/(authenticated)/admin/avisos/novo/page.tsx
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { NoticeForm } from "@/features/notices/components/notice-form"

export default function AdminNovoAvisoPage() {
	return (
		<PageContainer as="section" width="wide">
			<PageHeader
				eyebrow="Admin"
				title="Novo aviso"
				subtitle="Comunicado enviado a todos os usuários pelo sino de notificações."
			/>
			<NoticeForm />
		</PageContainer>
	)
}
```

- **Step 8: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run "src/app/(authenticated)/admin/avisos/novo/page.test.tsx"`
Expected: PASS (2 testes).

- **Step 9: Conferir a tela contra o mockup**

Se o passo 0 encontrou ferramenta de fidelidade (`playwright-cli`/`claude-in-chrome`), abrir `/admin/avisos/novo` como ADMIN e comparar com o mockup (duas colunas ~1.2fr/1fr, empilha abaixo de ~860px, card `rounded-xl`, preview com borda tracejada). Sem ferramenta, registrar que a conferência visual ficou manual. Ajustar apenas classes de estilo; o comportamento já está coberto pelos testes.

- **Step 10: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/frontend/src/features/notices/components/notice-form.tsx apps/frontend/src/features/notices/components/notice-form.test.tsx "apps/frontend/src/app/(authenticated)/admin/avisos/novo"
git commit -m "feat(notices): adiciona formulario e pagina Novo aviso"
```

## Critérios de Sucesso

- O administrador envia título e mensagem válidos e vê o toast com o total de destinatários; o formulário é limpo (FR-001, FR-003).
- Título ou mensagem vazios ou acima do limite exibem mensagem clara e não chamam a API.
- Enquanto o envio está em andamento o botão fica desabilitado com "Enviando..." e não há segunda requisição (FR-004).
- Falha no envio mostra toast de erro e mantém o texto digitado (FR-005).
- A pré-visualização ao lado do formulário acompanha a digitação (FR-013).
- O formulário tem rótulo acessível, erros com `role="alert"` e campos inválidos marcados com `aria-invalid`.
