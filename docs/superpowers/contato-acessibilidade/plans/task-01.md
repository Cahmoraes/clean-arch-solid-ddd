# Task 1: Indicador de obrigatoriedade + foco reforçado nos campos do formulário

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/contato-acessibilidade-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Os 3 campos do formulário de contato (Nome, Email, Mensagem) são obrigatórios, mas nada indica isso visualmente ou via `aria-required` antes do envio (achado 3.3.2 da auditoria WCAG). Esta task adiciona um indicador sutil (traço de 2px sob o rótulo, cor `--color-primary`) + `aria-required="true"` + texto oculto `sr-only` "(obrigatório)" aos 3 campos, e reforça o contraste do anel de foco (`focus-visible`) em inputs, textarea e botão — de `ring-ring/50` (50% opacidade) para `ring-primary` (opacidade plena), sem alterar os componentes base `Input`/`Button` globalmente (a mudança fica nos usos locais, via `className`).

## Arquivos

- Modify: `apps/frontend/src/components/ui/form-field.tsx`
- Modify: `apps/frontend/src/components/ui/field-shell.tsx`
- Modify: `apps/frontend/src/features/contact/components/contact-form.tsx`
- Test: `apps/frontend/src/features/contact/components/contact-form.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: classes utilitárias novas (`focus-visible:ring-primary`, indicador `sr-only` + traço) devem seguir as convenções Tailwind v4 já em uso no projeto (tokens do tema, `cn`/`tailwind-merge`).
- `shadcn`: `FormField`/`Input`/`Button` seguem o padrão de componente shadcn (forwardRef + `cn(base, className)`); o novo prop `required` deve preservar essa convenção sem quebrar a composição existente.
- `wcag-audit-patterns`: a implementação precisa satisfazer exatamente os critérios 3.3.2 (rótulos/instruções) e 2.4.7/1.4.11 (foco visível com contraste) conforme a auditoria que originou esta feature.
- `test-antipatterns`: os novos testes devem seguir os padrões já usados no arquivo (queries por `getByLabelText`/`getByRole`, sem detalhes de implementação, sem mocks desnecessários).
- `typescript-advanced`: `FormFieldProps`/a assinatura de `FieldShell` ganham um novo campo opcional (`required?: boolean`) — manter a tipagem estrita e retrocompatível (prop opcional, sem quebrar consumidores existentes de `FormField`/`FieldShell` fora do contato).

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/contato-acessibilidade-visual.md` (indicador "traço" sob o rótulo + `sr-only`; anel de foco reforçado)
- **Fonte de design original:** nenhuma; seguir o mockup curado (definido via companion visual do brainstorming)
- **Confirmar com o usuário:** não aplicável — não há fonte de design externa para esta tela, já confirmado durante o brainstorming
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code/teste visual conectada neste repo no momento do plano; construir manualmente a partir do mockup curado
- **Decisões visuais já tomadas (não refazer):** traço de 2px em `--color-primary` sob o rótulo dos 3 campos obrigatórios (sem asterisco, sem frase "campos obrigatórios"); `aria-required="true"` + `<span className="sr-only">` com o texto "(obrigatório)"; anel de foco em opacidade plena (`ring-primary`, não `ring-ring/50`) em inputs, textarea e botão

## Passos

- **Step 1: Escrever o teste que falha — indicação de obrigatoriedade nos 3 campos**

```tsx
// apps/frontend/src/features/contact/components/contact-form.test.tsx
// adicionar dentro do describe("ContactForm", () => { ... }), após o teste
// "exibe campos lado a lado com autocomplete e botão full-width"

test("indica os 3 campos obrigatórios via aria-required e texto para leitor de tela", () => {
	const { Wrapper } = makeWrapper()
	render(<ContactForm />, { wrapper: Wrapper })
	expect(screen.getByLabelText(/nome/i)).toHaveAttribute("aria-required", "true")
	expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute("aria-required", "true")
	expect(screen.getByLabelText(/mensagem/i)).toHaveAttribute("aria-required", "true")
	expect(screen.getAllByText("(obrigatório)")).toHaveLength(3)
})
```

- **Step 2: Rodar o teste para confirmar que falha**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx -t "indica os 3 campos obrigatórios"`
Expected: FAIL — `aria-required` ausente / `(obrigatório)` não encontrado (0 elementos)

- **Step 3: Adicionar o prop `required` em `FormField`**

```tsx
// apps/frontend/src/components/ui/form-field.tsx
"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"

export interface FormFieldProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
	id: string
	label: ReactNode
	error?: string | null
	containerClassName?: string
	required?: boolean
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
	({ id, label, error, containerClassName, required, ...inputProps }, ref) => {
		const errorId = error ? `${id}-error` : undefined
		return (
			<div className={cn("flex flex-col gap-2", containerClassName)}>
				<label
					htmlFor={id}
					className="inline-flex flex-col gap-1 text-sm font-medium text-foreground"
				>
					{label}
					{required ? (
						<>
							<span className="sr-only">(obrigatório)</span>
							<span
								aria-hidden="true"
								className="h-0.5 w-3.5 rounded-full bg-primary"
							/>
						</>
					) : null}
				</label>
				<Input
					ref={ref}
					id={id}
					aria-required={required || undefined}
					aria-invalid={Boolean(error) || undefined}
					aria-describedby={errorId}
					{...inputProps}
				/>
				{error ? (
					<p id={errorId} role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
			</div>
		)
	},
)
FormField.displayName = "FormField"
```

- **Step 4: Adicionar o prop `required` em `FieldShell`**

```tsx
// apps/frontend/src/components/ui/field-shell.tsx
"use client"

import type { ReactNode } from "react"

export const MASKED_INPUT_CLASS = [
	"flex h-10 w-full rounded-md border border-input bg-background px-4 py-2 text-base text-foreground",
	"placeholder:text-muted-foreground",
	"transition-colors",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
	"disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

export function FieldShell({
	id,
	label,
	error,
	required,
	children,
}: {
	id: string
	label: ReactNode
	error?: string | null
	required?: boolean
	children: ReactNode
}) {
	return (
		<div className="flex flex-col gap-2">
			<label
				htmlFor={id}
				className="inline-flex flex-col gap-1 text-sm font-medium text-foreground"
			>
				{label}
				{required ? (
					<>
						<span className="sr-only">(obrigatório)</span>
						<span
							aria-hidden="true"
							className="h-0.5 w-3.5 rounded-full bg-primary"
						/>
					</>
				) : null}
			</label>
			{children}
			{error ? (
				<p id={`${id}-error`} role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	)
}
```

- **Step 5: Ligar `required` + `aria-required` no textarea em `contact-form.tsx`**

```tsx
// apps/frontend/src/features/contact/components/contact-form.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FieldShell } from "@/components/ui/field-shell"
import { FormField } from "@/components/ui/form-field"
import { useSendContact } from "../api/use-send-contact"
import { type ContactFormInput, contactFormSchema } from "../schemas"

export function ContactForm() {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ContactFormInput>({
		resolver: zodResolver(contactFormSchema),
	})
	const { mutateAsync, isPending, isError } = useSendContact()

	const onSubmit = handleSubmit(async (values) => {
		try {
			await mutateAsync(values)
			toast.success("Mensagem enviada! Retornaremos em breve.")
			reset()
		} catch {
			// erro exibido inline via isError
		}
	})

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<FormField
					id="contact-nome"
					label="Nome"
					type="text"
					placeholder="Seu nome"
					autoComplete="name"
					required
					className="focus-visible:ring-primary focus-visible:ring-offset-2"
					{...register("nome")}
					error={errors.nome?.message}
				/>
				<FormField
					id="contact-email"
					label="E-mail"
					type="email"
					placeholder="seu@email.com"
					autoComplete="email"
					required
					className="focus-visible:ring-primary focus-visible:ring-offset-2"
					{...register("email")}
					error={errors.email?.message}
				/>
			</div>
			<FieldShell
				id="contact-mensagem"
				label="Mensagem"
				required
				error={errors.mensagem?.message}
			>
				<textarea
					id="contact-mensagem"
					placeholder="Como podemos ajudar?"
					rows={4}
					aria-required="true"
					aria-invalid={errors.mensagem ? true : undefined}
					aria-describedby={
						errors.mensagem ? "contact-mensagem-error" : undefined
					}
					className="resize-none rounded-md border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					{...register("mensagem")}
				/>
			</FieldShell>
			{isError && (
				<p className="text-sm text-destructive" role="alert">
					Não foi possível enviar sua mensagem. Tente novamente.
				</p>
			)}
			<Button
				type="submit"
				disabled={isPending}
				className="mt-2 w-full focus-visible:ring-primary focus-visible:ring-offset-2"
			>
				{isPending ? "Enviando…" : "Enviar mensagem"}
			</Button>
		</form>
	)
}
```

- **Step 6: Rodar o teste para confirmar que passa**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx -t "indica os 3 campos obrigatórios"`
Expected: PASS

- **Step 7: Escrever o teste que falha — anel de foco reforçado**

```tsx
// apps/frontend/src/features/contact/components/contact-form.test.tsx
// adicionar logo após o teste do Step 1

test("reforça o anel de foco (contraste) nos campos e no botão", () => {
	const { Wrapper } = makeWrapper()
	render(<ContactForm />, { wrapper: Wrapper })
	expect(screen.getByLabelText(/nome/i)).toHaveClass("focus-visible:ring-primary")
	expect(screen.getByLabelText(/e-mail/i)).toHaveClass("focus-visible:ring-primary")
	expect(screen.getByLabelText(/mensagem/i)).toHaveClass("focus-visible:ring-primary")
	expect(screen.getByRole("button", { name: /enviar/i })).toHaveClass(
		"focus-visible:ring-primary",
	)
	expect(screen.getByLabelText(/nome/i)).not.toHaveClass("focus-visible:ring-ring/50")
})
```

- **Step 8: Rodar o teste para confirmar que falha**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx -t "reforça o anel de foco"`
Expected: FAIL — os campos ainda têm `focus-visible:ring-ring/50` (classe base do `Input`/`Button`), não `focus-visible:ring-primary`

- **Step 9: Confirmar que o `className` passado a `FormField`/`Input` já mescla corretamente via `cn`/`tailwind-merge`**

Nenhum código adicional é necessário aqui: `FormField` já repassa `className` (parte de `...inputProps`, ver Step 3) para `<Input>`, e `Input` (`apps/frontend/src/components/ui/input.tsx`) já faz `className={cn(<classes base>, className)}` — como `cn` usa `tailwind-merge`, `focus-visible:ring-primary` (Step 5) substitui `focus-visible:ring-ring/50` da base sem duplicar a classe. O mesmo vale para `Button` (`apps/frontend/src/components/ui/button.tsx`, `className={cn(buttonVariants({ variant, size }), className)}`). O teste do Step 7 já deve passar após o Step 5 — este passo é apenas a verificação de que nenhum ajuste extra em `input.tsx`/`button.tsx` é necessário (eles não são modificados nesta task).

- **Step 10: Rodar o teste para confirmar que passa**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx -t "reforça o anel de foco"`
Expected: PASS

- **Step 11: Rodar toda a suíte deste arquivo para confirmar que nada quebrou**

Run: `cd apps/frontend && npx vitest run src/features/contact/components/contact-form.test.tsx`
Expected: PASS — todos os testes do arquivo (os 7 pré-existentes + os 2 novos)

- **Step 12: Commit** *(sequential execution only — em uma wave paralela, o orquestrador commita na barreira de integração. Se seu prompt disser que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/components/ui/form-field.tsx apps/frontend/src/components/ui/field-shell.tsx apps/frontend/src/features/contact/components/contact-form.tsx apps/frontend/src/features/contact/components/contact-form.test.tsx
git commit -m "feat: indicador de obrigatoriedade e foco reforcado no formulario de contato"
```

## Critérios de Sucesso

- Os 3 campos (Nome, Email, Mensagem) têm `aria-required="true"` no elemento de input/textarea.
- Cada rótulo obrigatório contém um texto oculto "(obrigatório)" acessível a leitor de tela, sem asterisco nem frase visível "campos obrigatórios".
- Inputs, textarea e botão de envio usam `focus-visible:ring-primary` (opacidade plena) em vez de `focus-visible:ring-ring/50`.
- `FormField`/`FieldShell` continuam funcionando sem o prop `required` (retrocompatibilidade com outros usos no app) — nenhum teste fora deste cluster foi alterado.
- Nenhuma mudança em `apps/frontend/src/components/ui/input.tsx` ou `apps/frontend/src/components/ui/button.tsx` (o reforço de foco é local ao contato, não global).
- Todos os testes de `contact-form.test.tsx` passam (7 existentes + 2 novos).
