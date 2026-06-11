# Task 9: Frontend — página /recuperar-senha + link na tela de login [RF-018, RF-019, RF-021, RF-022]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Cria a página `/recuperar-senha` com formulário de e-mail, mutation `useForgotPassword`, schema zod de validação, e adiciona o link "Esqueceu sua senha?" na tela de login. Segue o padrão de `login/page.tsx`: react-hook-form, zodResolver, `sonner` toast, `ApiError`.

## Arquivos

- Modify: `apps/frontend/src/features/auth/schemas/index.ts`
- Modify: `apps/frontend/src/features/auth/api/index.ts`
- Create: `apps/frontend/src/app/(public)/recuperar-senha/page.tsx`
- Modify: `apps/frontend/src/app/(public)/login/page.tsx`

### Conformidade com as Skills Padrão

- test-antipatterns: page components não precisam de unit tests — cobertos pelos E2E tests (Task 7)
- AGUARDE a Task 8 terminar (tipos gerados) antes de usar `api.POST("/password/forgot")`

## Passos

- [ ] **Step 1: Adicionar schema de recuperação de senha**

Abra `apps/frontend/src/features/auth/schemas/index.ts` e adicione ao final:

```ts
export const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido."),
})

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "A confirmação não corresponde à nova senha.",
  })

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
```

- [ ] **Step 2: Adicionar mutations `useForgotPassword` e `useResetPassword`**

Abra `apps/frontend/src/features/auth/api/index.ts` e adicione os imports:

```ts
import type { ForgotPasswordInput, ResetPasswordInput } from "@/features/auth/schemas"
```

E ao final do arquivo, adicione as duas mutations:

```ts
export function useForgotPassword(): UseMutationResult<void, ApiError, ForgotPasswordInput> {
  return useMutation<void, ApiError, ForgotPasswordInput>({
    mutationFn: async (input) => {
      const { error } = await api.POST("/password/forgot", {
        body: input,
      })
      if (error) throw toApiError(error)
    },
  })
}

export function useResetPassword(): UseMutationResult<void, ApiError, ResetPasswordInput & { token: string }> {
  return useMutation<void, ApiError, ResetPasswordInput & { token: string }>({
    mutationFn: async ({ token, newPassword }) => {
      const { error } = await api.POST("/password/reset", {
        body: { token, newPassword },
      })
      if (error) throw toApiError(error)
    },
  })
}
```

**Nota:** `api.POST("/password/forgot")` e `api.POST("/password/reset")` só estarão disponíveis após a Task 8 (geração de tipos). Se os tipos ainda não foram gerados, o TypeScript dará erro — resolva após a Task 8.

- [ ] **Step 3: Criar a página `/recuperar-senha`**

Crie o diretório e o arquivo:

```bash
mkdir -p apps/frontend/src/app/\(public\)/recuperar-senha
```

Crie `apps/frontend/src/app/(public)/recuperar-senha/page.tsx`:

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useForgotPassword } from "@/features/auth/api"
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/features/auth/schemas"

export default function RecuperarSenhaPage() {
  const emailId = useId()
  const [submitted, setSubmitted] = useState(false)
  const { mutateAsync, isPending } = useForgotPassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      await mutateAsync(values)
      setSubmitted(true)
    } catch {
      toast.error("Não foi possível processar sua solicitação. Tente novamente.")
    }
  }

  if (submitted) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Verifique seu e-mail
          </h1>
          <p className="text-sm text-muted-foreground">
            Se esse e-mail estiver cadastrado na plataforma, você receberá um
            link de recuperação em breve. O link expira em 15 minutos.
          </p>
        </header>
        <Link
          href="/login"
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          Voltar para o login
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
          Recuperar senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </header>

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        aria-busy={isPending}
      >
        <FormField
          id={emailId}
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Enviando…" : "Enviar link de recuperação"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Adicionar link "Esqueceu sua senha?" na página de login**

Abra `apps/frontend/src/app/(public)/login/page.tsx`. Após o `FormField` de senha e antes do botão de submit, adicione o link:

Localize o trecho:

```tsx
<FormField
  id={passwordId}
  label="Senha"
  type="password"
  autoComplete="current-password"
  error={errors.password?.message}
  {...register("password")}
/>

{submissionMessage ? (
```

Substitua por:

```tsx
<FormField
  id={passwordId}
  label="Senha"
  type="password"
  autoComplete="current-password"
  error={errors.password?.message}
  {...register("password")}
/>

<div className="flex justify-end">
  <Link
    href="/recuperar-senha"
    className="text-sm font-medium text-foreground underline underline-offset-4"
  >
    Esqueceu sua senha?
  </Link>
</div>

{submissionMessage ? (
```

- [ ] **Step 5: Verificar TypeScript do frontend**

```bash
cd apps/frontend
pnpm tsc:check
```

Esperado: zero erros. Se houver erros de tipo em `api.POST("/password/forgot")`, é porque a Task 8 ainda não foi executada — execute a Task 8 primeiro.

- [ ] **Step 6: Verificar lint**

```bash
cd apps/frontend
pnpm lint:fix
```

Esperado: zero issues.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/features/auth/schemas/index.ts \
        apps/frontend/src/features/auth/api/index.ts \
        apps/frontend/src/app/\(public\)/recuperar-senha/page.tsx \
        apps/frontend/src/app/\(public\)/login/page.tsx
git commit -m "feat(frontend): add forgot password page and login link

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-018: página `/recuperar-senha` existe com formulário de e-mail
- RF-019: após submit, exibe mensagem genérica de sucesso (sem indicar se email existe ou não)
- RF-021: link "Esqueceu sua senha?" está visível na tela de login
- RF-022: formulário valida formato de e-mail antes de submeter
- `pnpm tsc:check` e `pnpm lint:fix` sem erros
