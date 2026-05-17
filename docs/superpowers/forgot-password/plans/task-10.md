# Task 10: Frontend — página /redefinir-senha [RF-018, RF-019, RF-023]

**Status:** PENDING
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Cria a página `/redefinir-senha` que lê o token da query string `?token=`, exibe formulário para nova senha + confirmação, chama `useResetPassword`, e redireciona para `/login` após 3 segundos em caso de sucesso.

## Arquivos

- Create: `apps/frontend/src/app/(public)/redefinir-senha/page.tsx`

### Conformidade com as Skills Padrão

- `useSearchParams()` precisa de `Suspense` no Server Component pai (Next.js App Router)
- AGUARDE a Task 8 (tipos gerados) e Task 9 (hook `useResetPassword` criado) antes de implementar esta task

## Passos

- [ ] **Step 1: Criar o diretório da página**

```bash
mkdir -p apps/frontend/src/app/\(public\)/redefinir-senha
```

- [ ] **Step 2: Criar `apps/frontend/src/app/(public)/redefinir-senha/page.tsx`**

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useResetPassword } from "@/features/auth/api"
import {
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/features/auth/schemas"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") ?? ""
  const newPasswordId = useId()
  const confirmPasswordId = useId()
  const [success, setSuccess] = useState(false)
  const { mutateAsync, isPending } = useResetPassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) {
      toast.error("Link de recuperação inválido ou expirado. Solicite um novo.")
      return
    }
    try {
      await mutateAsync({ ...values, token })
      setSuccess(true)
      setTimeout(() => {
        router.replace("/login")
      }, 3000)
    } catch {
      toast.error(
        "Não foi possível redefinir a senha. O link pode ter expirado ou já foi utilizado. Solicite um novo.",
      )
    }
  }

  if (!token) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Link inválido
          </h1>
          <p className="text-sm text-muted-foreground">
            O link de recuperação está incompleto ou expirou. Solicite um novo
            link.
          </p>
        </header>
        <Link
          href="/recuperar-senha"
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          Solicitar novo link
        </Link>
      </section>
    )
  }

  if (success) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
            Senha redefinida!
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua senha foi alterada com sucesso. Redirecionando para o login em
            instantes…
          </p>
        </header>
        <Link
          href="/login"
          className="text-sm font-medium text-foreground underline underline-offset-4"
        >
          Ir para o login agora
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
          Redefinir senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Escolha uma nova senha para sua conta.
        </p>
      </header>

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        aria-busy={isPending}
      >
        <FormField
          id={newPasswordId}
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <FormField
          id={confirmPasswordId}
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Redefinindo…" : "Redefinir senha"}
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

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div aria-busy="true" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
```

- [ ] **Step 3: Verificar TypeScript do frontend**

```bash
cd apps/frontend
pnpm tsc:check
```

Esperado: zero erros. Se houver erros de tipo em `api.POST("/password/reset")`, é porque a Task 8 ainda não foi executada — execute a Task 8 primeiro.

- [ ] **Step 4: Verificar lint**

```bash
cd apps/frontend
pnpm lint:fix
```

Esperado: zero issues.

- [ ] **Step 5: Verificar build do frontend**

```bash
cd apps/frontend
pnpm build
```

Esperado: build termina sem erros. Confirme que as páginas `/recuperar-senha` e `/redefinir-senha` aparecem na saída do build.

- [ ] **Step 6: Executar testes do frontend**

```bash
cd apps/frontend
pnpm test
```

Esperado: todos os testes existentes passam (sem regressões).

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/\(public\)/redefinir-senha/page.tsx
git commit -m "feat(frontend): add reset password page

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 8: Verificação final — executar toda a suite de validação**

Na raiz do monorepo:

```bash
pnpm build
```

No backend:

```bash
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
pnpm --filter backend test:run
```

No frontend:

```bash
pnpm --filter frontend tsc:check
pnpm --filter frontend lint:fix
pnpm --filter frontend test
```

Esperado: todos os comandos passam com zero erros.

## Critérios de Sucesso

- RF-018: página `/redefinir-senha` existe e aceita query param `?token=`
- RF-019: quando `token` está ausente na URL, exibe aviso de "Link inválido"
- RF-023: após reset bem-sucedido, exibe mensagem de sucesso e redireciona para `/login` após 3 segundos
- Formulário valida nova senha (mínimo 6 caracteres) e confirmação antes de submeter
- `pnpm tsc:check`, `pnpm lint:fix`, `pnpm build` e `pnpm test` passam sem erros
