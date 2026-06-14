# Task 5: Frontend — `ContactSection` + `ContactForm` [FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-017]

**Status:** PENDING
**PRD:** `../prd/prd-home-planos-contato.md`
**Spec:** `../specs/home-planos-contato-design.md`
**Depends on:** task-04

## Visão Geral

Criar dois componentes para a seção de contato:

- `ContactSection` — RSC wrapper com heading, subtítulo e grid 2 colunas em desktop (`md:grid-cols-2`): coluna esquerda com texto informativo e e-mail de contato; coluna direita com o formulário.
- `ContactForm` — Client Component com `react-hook-form` + `zodResolver` + `useSendContact`. Exibe loading no botão durante envio, toast de sucesso + reset dos campos no sucesso, e erro inline quando `isError = true`.

O `FormField` de `@/components/ui/form-field` é usado para `nome` e `email`. O campo `mensagem` usa `<textarea>` nativo com as mesmas classes de input do design system (o `FormField` não suporta `textarea`).

## Arquivos

- Create: `apps/frontend/src/features/contact/components/contact-section.tsx`
- Create: `apps/frontend/src/features/contact/components/contact-form.tsx`
- Create: `apps/frontend/src/features/contact/components/contact-form.test.tsx`

### Conformidade com as Skills Padrão

- `no-workarounds`: ao depurar erro de `zodResolver`, verificar se `@hookform/resolvers` está instalado antes de criar workaround
- `typescript-advanced`: tipar `ContactFormInput` via `z.infer<>`; não redeclarar o tipo inline
- `vercel-react-best-practices`: `"use client"` apenas no `ContactForm`; `ContactSection` permanece RSC; `noValidate` no `<form>` para delegar validação ao Zod
- `vercel-composition-patterns`: `ContactSection` importa `ContactForm` (RSC pode renderizar CC); sem estado no `ContactSection`
- `tailwindcss`: usar `grid gap-8 md:grid-cols-2` para layout responsivo; não usar `flex` para o grid 2 colunas (FR-017)
- `shadcn`: usar `Button`, `FormField` e `Label` de `@/components/ui/` — não reimplementar
- `tanstack-query-best-practices`: consumir `isPending`, `isError`, `isSuccess` do hook; não criar estado local duplicado para esses

## Passos

### Step 1: Escrever testes de `ContactForm` (falha primeiro)

**Crie** `apps/frontend/src/features/contact/components/contact-form.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { ContactForm } from "./contact-form"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { Wrapper }
}

describe("ContactForm", () => {
  test("exibe três campos: nome, e-mail e mensagem", () => {
    const { Wrapper } = makeWrapper()
    render(<ContactForm />, { wrapper: Wrapper })

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument()
  })

  test("exibe erro de validação quando nome tem menos de 2 caracteres", async () => {
    const { Wrapper } = makeWrapper()
    render(<ContactForm />, { wrapper: Wrapper })

    await userEvent.type(screen.getByLabelText(/nome/i), "J")
    await userEvent.click(screen.getByRole("button", { name: /enviar/i }))

    await waitFor(() => {
      expect(screen.getByText(/nome deve ter pelo menos 2 caracteres/i)).toBeInTheDocument()
    })
  })

  test("exibe erro de validação quando e-mail é inválido", async () => {
    const { Wrapper } = makeWrapper()
    render(<ContactForm />, { wrapper: Wrapper })

    await userEvent.type(screen.getByLabelText(/nome/i), "João Silva")
    await userEvent.type(screen.getByLabelText(/e-mail/i), "nao-e-email")
    await userEvent.type(screen.getByLabelText(/mensagem/i), "Olá")
    await userEvent.click(screen.getByRole("button", { name: /enviar/i }))

    await waitFor(() => {
      expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument()
    })
  })

  test("desabilita o botão e exibe 'Enviando…' durante o envio", async () => {
    server.use(
      http.post(`${apiBaseUrl}/contact`, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ message: "ok" }, { status: 200 })
      }),
    )

    const { Wrapper } = makeWrapper()
    render(<ContactForm />, { wrapper: Wrapper })

    await userEvent.type(screen.getByLabelText(/nome/i), "João Silva")
    await userEvent.type(screen.getByLabelText(/e-mail/i), "joao@example.com")
    await userEvent.type(screen.getByLabelText(/mensagem/i), "Olá, tenho uma dúvida.")
    await userEvent.click(screen.getByRole("button", { name: /enviar/i }))

    expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled()
  })

  test("limpa os campos após envio bem-sucedido", async () => {
    server.use(
      http.post(`${apiBaseUrl}/contact`, () =>
        HttpResponse.json({ message: "ok" }, { status: 200 }),
      ),
    )

    const { Wrapper } = makeWrapper()
    render(<ContactForm />, { wrapper: Wrapper })

    await userEvent.type(screen.getByLabelText(/nome/i), "João Silva")
    await userEvent.type(screen.getByLabelText(/e-mail/i), "joao@example.com")
    await userEvent.type(screen.getByLabelText(/mensagem/i), "Olá.")
    await userEvent.click(screen.getByRole("button", { name: /enviar/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toHaveValue("")
      expect(screen.getByLabelText(/e-mail/i)).toHaveValue("")
      expect(screen.getByLabelText(/mensagem/i)).toHaveValue("")
    })
  })

  test("exibe mensagem de erro inline quando o envio falha", async () => {
    server.use(
      http.post(`${apiBaseUrl}/contact`, () =>
        HttpResponse.json({ message: "erro" }, { status: 500 }),
      ),
    )

    const { Wrapper } = makeWrapper()
    render(<ContactForm />, { wrapper: Wrapper })

    await userEvent.type(screen.getByLabelText(/nome/i), "João")
    await userEvent.type(screen.getByLabelText(/e-mail/i), "joao@example.com")
    await userEvent.type(screen.getByLabelText(/mensagem/i), "Olá.")
    await userEvent.click(screen.getByRole("button", { name: /enviar/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/não foi possível enviar sua mensagem/i),
      ).toBeInTheDocument()
    })
  })
})
```

### Step 2: Rodar testes e confirmar que falham

```bash
pnpm --filter frontend test -- --run contact-form
```

Esperado: FAIL — "Cannot find module './contact-form'".

### Step 3: Criar `ContactForm`

**Crie** `apps/frontend/src/features/contact/components/contact-form.tsx`:

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
      <FormField
        id="contact-nome"
        label="Nome"
        type="text"
        placeholder="Seu nome"
        {...register("nome")}
        error={errors.nome?.message}
      />
      <FormField
        id="contact-email"
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        {...register("email")}
        error={errors.email?.message}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-mensagem"
          className="text-sm font-medium text-foreground"
        >
          Mensagem
        </label>
        <textarea
          id="contact-mensagem"
          placeholder="Como podemos ajudar?"
          rows={4}
          className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("mensagem")}
        />
        {errors.mensagem?.message && (
          <p className="text-xs text-destructive" role="alert">
            {errors.mensagem.message}
          </p>
        )}
      </div>

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Não foi possível enviar sua mensagem. Tente novamente.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  )
}
```

### Step 4: Rodar testes e confirmar que passam

```bash
pnpm --filter frontend test -- --run contact-form
```

Esperado: PASS — todos os 5 testes passam.

### Step 5: Criar `ContactSection`

**Crie** `apps/frontend/src/features/contact/components/contact-section.tsx`:

```tsx
import { ContactForm } from "./contact-form"

export function ContactSection() {
  return (
    <section
      aria-labelledby="contact-heading"
      className="mx-auto w-full max-w-xl"
    >
      <h2
        id="contact-heading"
        className="mb-2 font-display text-3xl font-bold tracking-tight text-foreground"
      >
        Fale conosco
      </h2>
      <p className="mb-8 text-base text-muted-foreground">
        Tem alguma dúvida? Envie uma mensagem e nossa equipe responde em até 24h
        úteis.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Nossa equipe está pronta para ajudar. Se preferir, entre em contato
            direto por e-mail.
          </p>
          <a
            href="mailto:contato@volt.com"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-surface-3"
          >
            contato@volt.com
          </a>
        </div>

        <ContactForm />
      </div>
    </section>
  )
}
```

### Step 6: Verificar lint e tipos

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero issues.

### Step 7: Commit

```bash
git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd add \
  apps/frontend/src/features/contact/components/contact-form.tsx \
  apps/frontend/src/features/contact/components/contact-form.test.tsx \
  apps/frontend/src/features/contact/components/contact-section.tsx

git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd commit -m "feat(contact): adiciona ContactForm e ContactSection"
```

## Critérios de Sucesso

- Formulário exibe campos nome, e-mail (via `FormField`) e mensagem (textarea) (FR-009)
- Validação Zod client-side: nome ≥ 2 chars, e-mail válido, mensagem não vazia (FR-010)
- Botão exibe "Enviando…" e fica desabilitado durante `isPending` (FR-011)
- Em sucesso: toast de confirmação + campos resetados (FR-012)
- Em erro: mensagem inline com `role="alert"` (FR-013)
- `ContactSection` usa `grid md:grid-cols-2` — 2 colunas em desktop, 1 em mobile (FR-017)
- `pnpm --filter frontend lint:fix` e `tsc:check` passam sem erros
- Todos os 5 testes passam
