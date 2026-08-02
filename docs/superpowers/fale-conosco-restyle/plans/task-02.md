# Task 2: Form — campos lado a lado + autocomplete + botão full-width

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/fale-conosco-restyle-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Ajusta a apresentação de `contact-form.tsx`: os campos Nome e E-mail passam a dividir a linha no desktop (`grid gap-4 sm:grid-cols-2`), Mensagem e botão ficam em linha cheia (botão `w-full`), e os campos ganham `autocomplete="name"`/`autocomplete="email"` (melhoria WCAG 1.3.5). A lógica de envio (react-hook-form + zod + `useSendContact`) permanece intacta; os 6 testes existentes continuam passando e um novo teste cobre o autocomplete.

## Arquivos

- Modify: `apps/frontend/src/features/contact/components/contact-form.tsx`
- Test: `apps/frontend/src/features/contact/components/contact-form.test.tsx` (estender)

### Conformidade com as Skills Padrão

- `tailwindcss`: aplicar `grid gap-4 sm:grid-cols-2` e `w-full` com os tokens do tema (mobile-first)
- `shadcn`: manter o uso de `FormField`/`FieldShell`/`Button` conforme os padrões do repo

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/fale-conosco-restyle-visual.md` (baseline de layout/spacing/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (resposta esperada na execução: não)
- **Ferramentas de fidelidade visual:** nenhuma configurada no repo; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** Nome + E-mail em `sm:grid-cols-2` no desktop; Mensagem em linha cheia; botão full-width (`w-full`); mobile 1 coluna empilhada.

## Passos

- **Step 0: Confirmar fonte de design & ferramentas de fidelidade**

  Ler a fonte de design e as ferramentas registradas acima. Confirmar com o usuário se existe uma fonte de design original (esperado: não). Sem fonte/ferramenta, construir manualmente a partir do mockup curado em `../specs/mockups/fale-conosco-restyle-visual.md`.

- **Step 1: Escrever o teste que falha**

  Adicionar ao final do `describe` em `apps/frontend/src/features/contact/components/contact-form.test.tsx`:

  ```tsx
  	test("campos nome e e-mail definem autocomplete para preenchimento automático", () => {
  		const { Wrapper } = makeWrapper()
  		render(<ContactForm />, { wrapper: Wrapper })
  		expect(screen.getByLabelText(/nome/i)).toHaveAttribute("autocomplete", "name")
  		expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute(
  			"autocomplete",
  			"email",
  		)
  	})
  ```

- **Step 2: Rodar o teste para verificar que falha**

  Run: `pnpm --filter frontend test -- --run src/features/contact/components/contact-form.test.tsx`
  Expected: FAIL — o novo teste falha porque os campos ainda não têm o atributo `autocomplete`.

- **Step 3: Escrever a implementação mínima**

  Substituir o conteúdo de `apps/frontend/src/features/contact/components/contact-form.tsx` por:

  ```tsx
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
  					{...register("nome")}
  					error={errors.nome?.message}
  				/>
  				<FormField
  					id="contact-email"
  					label="E-mail"
  					type="email"
  					placeholder="seu@email.com"
  					autoComplete="email"
  					{...register("email")}
  					error={errors.email?.message}
  				/>
  			</div>
  			<FieldShell
  				id="contact-mensagem"
  				label="Mensagem"
  				error={errors.mensagem?.message}
  			>
  				<textarea
  					id="contact-mensagem"
  					placeholder="Como podemos ajudar?"
  					rows={4}
  					aria-invalid={errors.mensagem ? true : undefined}
  					aria-describedby={
  						errors.mensagem ? "contact-mensagem-error" : undefined
  					}
  					className="resize-none rounded-md border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  					{...register("mensagem")}
  				/>
  			</FieldShell>
  			{isError && (
  				<p className="text-sm text-destructive" role="alert">
  					Não foi possível enviar sua mensagem. Tente novamente.
  				</p>
  			)}
  			<Button type="submit" disabled={isPending} className="mt-2 w-full">
  				{isPending ? "Enviando…" : "Enviar mensagem"}
  			</Button>
  		</form>
  	)
  }
  ```

  Observações:
  - `FormField` estende `InputHTMLAttributes` e repassa `autoComplete` ao `<input>` via spread.
  - `Button` não define `w-*` na base — `w-full` produz o botão em linha cheia.
  - A lógica (`useForm`, `mutateAsync`, `toast`, `isError`) é idêntica à versão anterior.

- **Step 4: Rodar o teste para verificar que passa**

  Run: `pnpm --filter frontend test -- --run src/features/contact/components/contact-form.test.tsx`
  Expected: PASS — 7 testes (os 6 existentes + o novo de autocomplete).

- **Step 5: Rodar os gates de qualidade**

  Run: `pnpm --filter frontend lint:fix`
  Expected: Biome com zero problemas.
  Run: `pnpm --filter frontend tsc:check`
  Expected: sem erros de tipo.
  Run: `pnpm --filter frontend test -- --run`
  Expected: suite completa do frontend passa (inclui o novo `contact-section.test.tsx` da task-01, sem regressão).
  Run: `pnpm --filter frontend build`
  Expected: build Next.js sem erros.

- **Step 6: Commit**

  ```bash
  git add apps/frontend/src/features/contact/components/contact-form.tsx apps/frontend/src/features/contact/components/contact-form.test.tsx
  git commit -m "feat(contact): side-by-side fields, autocomplete and full-width submit"
  ```

  Nota: por política do workspace, pedir permissão antes de commitar.

## Critérios de Sucesso

- Nome e E-mail lado a lado no desktop (`sm:grid-cols-2`); Mensagem e botão em linha cheia; mobile 1 coluna.
- Campos nome/e-mail com `autocomplete="name"`/`autocomplete="email"`.
- Lógica de envio intacta: 6 testes existentes continuam passando + novo teste de autocomplete.
- Biome, tsc e suite de testes sem regressão.
