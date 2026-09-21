# Task 10: NoticeForm integra o seletor, o envio e o reset [FR-001, FR-005, FR-006]

**Status:** DONE
**Verified:** `bash -c cd apps/frontend && pnpm exec vitest run src/features/notices/components/notice-form.test.tsx` → exit 0
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-07, task-08, task-09

## Visão Geral

Fecha a feature no frontend: o `NoticeForm` renderiza o `AudienceSelector` entre "Mensagem" e o botão "Enviar aviso", ligado ao react-hook-form por `Controller` (campo `audience`, padrão "Todos" vindo de `defaultValues`). O envio já inclui o público (o `NoticeInput` inteiro vai para o hook, task-07); depois do sucesso `reset(EMPTY_NOTICE)` limpa título e mensagem e devolve o público a "Todos" (FR-005); o toast usa o `recipients` devolvido pela API, que já corresponde ao público escolhido (FR-006); a pré-visualização mostra o público escolhido (o `useWatch` de `audience` e a prop do preview foram ligados na task-09). O seletor fica desabilitado durante o envio. Trocar o público depois de digitar título e mensagem preserva o texto digitado (Review Focus): o `Controller` altera só o campo `audience`.

Estado herdado: `EMPTY_NOTICE = { title: "", message: "", audience: "ALL" }` (task-07); o caso de sucesso de `notice-form.test.tsx` já assere `audience: "ALL"` no corpo (task-07); o teste "a pré-visualização mostra o público padrão Todos assim que há texto" já existe (task-09). Esta task acrescenta o seletor e os testes de interação.

## Arquivos

- Modify: `apps/frontend/src/features/notices/components/notice-form.tsx`
- Test: `apps/frontend/src/features/notices/components/notice-form.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: um único `useWatch` para os campos observados, `Controller` só para o campo controlado (`audience`), `register` para os inputs nativos; sem estado duplicado fora do react-hook-form.
- `vercel-composition-patterns`: o formulário compõe `AudienceSelector` por props (`value`, `onChange`, `disabled`) via `Controller`, sem o seletor conhecer o react-hook-form.
- `wcag-audit-patterns`: o grupo "Público-alvo" fica dentro do formulário rotulado, navegável por teclado, e o botão e as opções ficam desabilitados durante o envio.
- `tanstack-query-best-practices`: o envio continua `mutateAsync` da mutation existente com `isPending` controlando o desabilitado; nenhuma chave de cache é afetada.
- `test-antipatterns`: os testes usam `renderWithProviders`, MSW real (`server.use`) para capturar o corpo, e `userEvent`; o único mock é o `sonner` já usado neste arquivo, para observar o toast.
- `no-workarounds`: o reset volta o público pelo `reset(EMPTY_NOTICE)` do react-hook-form, sem `setValue` manual nem `key` para remontar o formulário.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/notice-audience-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma configurada além dos skills `frontend-design`, `impeccable`, `tailwindcss`, `wcag-audit-patterns` e da automação de navegador (`playwright-cli`, `claude-in-chrome`) para conferir visualmente; se nada disso estiver disponível, construir manualmente a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** o seletor "Público-alvo" fica dentro do card do formulário (`rounded-xl`), entre "Mensagem" e o botão "Enviar aviso", com o mesmo `gap-4` do formulário; três cartões em linha (empilham abaixo de `sm`), selecionado com borda `primary` e anel de 1px; a pré-visualização à direita mostra "Público: X" em mono uppercase `primary`; tema escuro por padrão, tokens VOLT.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade Visual` acima (o autor do plano as descobriu uma vez, na hora do plano). Confirmar com o usuário se existe uma fonte de design original (URL, export ou screenshot) para esta tela; só isso precisa do usuário. Se houver fonte ou ferramenta, usar; se não, construir manualmente contra o mockup curado em `../specs/mockups/notice-audience-visual.md`, reaproveitando o layout, o espaçamento e os tokens já decididos. Este passo nunca bloqueia: "sem fonte, sem ferramenta" segue para a implementação manual.

- **Step 1: Write the failing test**

Review Focus: trocar o público depois de digitar título e mensagem preserva o texto digitado

Em `apps/frontend/src/features/notices/components/notice-form.test.tsx`, adicionar o helper logo abaixo de `submitButton`:

```tsx
function audienceRadio(name: string) {
	return screen.getByRole("radio", { name })
}
```

Adicionar dentro do `describe("NoticeForm", ...)`:

```tsx
	test("FR-001: renderiza o grupo Público-alvo com Todos marcado ao abrir", () => {
		renderWithProviders(<NoticeForm />)

		expect(
			screen.getByRole("group", { name: "Público-alvo" }),
		).toBeInTheDocument()
		expect(audienceRadio("Todos")).toBeChecked()
		expect(audienceRadio("Alunos")).not.toBeChecked()
		expect(audienceRadio("Administradores")).not.toBeChecked()
	})

	test("FR-005: escolher Alunos e enviar inclui audience MEMBERS no corpo", async () => {
		let receivedBody: unknown
		server.use(
			http.post(endpoint(BROADCAST_PATH), async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json({ recipients: 2 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(audienceRadio("Alunos"))
		await userEvent.click(submitButton())

		await waitFor(() => expect(toast.success).toHaveBeenCalled())
		expect(receivedBody).toEqual({
			title: "Manutenção programada",
			message: "O sistema ficará fora do ar às 22h.",
			audience: "MEMBERS",
		})
	})

	test("FR-005: após o sucesso o público volta a Todos e título e mensagem são limpos", async () => {
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()
		await userEvent.click(audienceRadio("Administradores"))
		expect(audienceRadio("Administradores")).toBeChecked()

		await userEvent.click(submitButton())

		await waitFor(() => expect(titleInput()).toHaveValue(""))
		expect(messageInput()).toHaveValue("")
		expect(audienceRadio("Todos")).toBeChecked()
		expect(audienceRadio("Administradores")).not.toBeChecked()
	})

	test("FR-006: o toast usa o número de destinatários devolvido para o público escolhido", async () => {
		server.use(
			http.post(endpoint(BROADCAST_PATH), () =>
				HttpResponse.json({ recipients: 2 }, { status: 201 }),
			),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()
		await userEvent.click(audienceRadio("Alunos"))

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Aviso enviado para 2 usuários.",
			),
		)
	})

	test("a pré-visualização mostra o público escolhido e atualiza ao trocar (coberto na task 9)", async () => {
		renderWithProviders(<NoticeForm />)
		await userEvent.type(titleInput(), "Manutenção")
		expect(screen.getByText("Público: Todos")).toBeInTheDocument()

		await userEvent.click(audienceRadio("Alunos"))

		expect(screen.getByText("Público: Alunos")).toBeInTheDocument()
		expect(screen.queryByText("Público: Todos")).not.toBeInTheDocument()

		await userEvent.click(audienceRadio("Administradores"))

		expect(screen.getByText("Público: Administradores")).toBeInTheDocument()
	})

	test("Review Focus: trocar o público depois de digitar título e mensagem preserva o texto digitado", async () => {
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(audienceRadio("Alunos"))
		await userEvent.click(audienceRadio("Administradores"))
		await userEvent.click(audienceRadio("Todos"))

		expect(titleInput()).toHaveValue("Manutenção programada")
		expect(messageInput()).toHaveValue("O sistema ficará fora do ar às 22h.")
		expect(
			screen.getByText(
				`${"O sistema ficará fora do ar às 22h.".length} / 500`,
			),
		).toBeInTheDocument()
		expect(screen.queryByRole("alert")).not.toBeInTheDocument()
	})

	test("erro: mantém o público escolhido junto com o texto digitado", async () => {
		server.use(
			http.post(endpoint(BROADCAST_PATH), () =>
				HttpResponse.json({ message: "falha" }, { status: 500 }),
			),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()
		await userEvent.click(audienceRadio("Alunos"))

		await userEvent.click(submitButton())

		await waitFor(() => expect(toast.error).toHaveBeenCalled())
		expect(audienceRadio("Alunos")).toBeChecked()
		expect(titleInput()).toHaveValue("Manutenção programada")
	})

	test("desabilita as opções de público durante o envio", async () => {
		let release: () => void = () => undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		server.use(
			http.post(endpoint(BROADCAST_PATH), async () => {
				await gate
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() => expect(audienceRadio("Alunos")).toBeDisabled())
		expect(audienceRadio("Todos")).toBeDisabled()

		release()
		await waitFor(() => expect(audienceRadio("Alunos")).toBeEnabled())
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/components/notice-form.test.tsx`
Expected: FAIL. O formulário ainda não renderiza o seletor: os 8 testes novos falham, pois todos consultam `getByRole("radio", ...)` ou `getByRole("group", { name: "Público-alvo" })` e dão `Unable to find an accessible element with the role "radio"` (ou `"group"`). Os testes anteriores (inclusive o da pré-visualização, da task-09) continuam passando.

- **Step 3: Write minimal implementation**

Substituir `apps/frontend/src/features/notices/components/notice-form.tsx` pelo conteúdo abaixo (mudanças em relação ao estado atual: import de `Controller` e de `AudienceSelector`, e o bloco `Controller` entre o `FieldShell` e o botão):

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldShell } from "@/components/ui/field-shell"
import { FormField } from "@/components/ui/form-field"
import { useBroadcastNotice } from "@/features/notices/api/use-broadcast-notice"
import { AudienceSelector } from "@/features/notices/components/audience-selector"
import { NoticePreview } from "@/features/notices/components/notice-preview"
import {
	NOTICE_MESSAGE_MAX,
	type NoticeInput,
	noticeSchema,
} from "@/features/notices/schemas/notice-schema"
import { cn } from "@/lib/cn"
import { ApiError } from "@/lib/errors"

const EMPTY_NOTICE: NoticeInput = { title: "", message: "", audience: "ALL" }
const FALLBACK_ERROR_MESSAGE =
	"Não foi possível enviar o aviso. Tente novamente."

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
	const [title, message, audience] = useWatch({
		control,
		name: ["title", "message", "audience"],
	})

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
						<Controller
							control={control}
							name="audience"
							render={({ field }) => (
								<AudienceSelector
									value={field.value}
									onChange={field.onChange}
									disabled={isPending}
								/>
							)}
						/>
						<div className="flex justify-end">
							<Button type="submit" disabled={isPending}>
								{isPending ? "Enviando..." : "Enviar aviso"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
			<NoticePreview title={title} message={message} audience={audience} />
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/features/notices/components/notice-form.test.tsx`
Expected: PASS (todos os testes anteriores do arquivo mais os 8 novos desta task; nenhum teste anterior precisa ser alterado além do que a task-07 e a task-09 já ajustaram).

Depois, conferir visualmente contra o mockup (Step 0): três cartões em linha entre "Mensagem" e o botão, empilhados em tela estreita; selecionado com borda e anel `primary`; a pré-visualização mostra "PÚBLICO: ..." acompanhando a escolha; foco visível ao navegar por Tab e setas.

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/notices/components/notice-form.tsx apps/frontend/src/features/notices/components/notice-form.test.tsx
git commit -m "feat(notice-audience): NoticeForm integra o seletor de publico"
```

## Critérios de Sucesso

- O formulário abre com "Todos" marcado e oferece exatamente um público entre "Todos", "Alunos" e "Administradores" (FR-001).
- Escolher "Alunos" e enviar faz o `POST` com `audience: "MEMBERS"`; ao concluir com sucesso o público volta a "Todos" e título e mensagem ficam vazios (FR-005).
- O toast informa o número de destinatários devolvido pela API para o público escolhido (FR-006).
- Trocar o público depois de digitar título e mensagem não altera o texto digitado.
- Em caso de erro no envio, o público escolhido e o texto permanecem; durante o envio as opções ficam desabilitadas.
