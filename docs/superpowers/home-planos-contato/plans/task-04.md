# Task 4: Frontend — Schema de Contato + Hook `useSendContact` [FR-009, FR-010]

**Status:** PENDING
**PRD:** `../prd/prd-home-planos-contato.md`
**Spec:** `../specs/home-planos-contato-design.md`
**Depends on:** task-02

## Visão Geral

Criar a infraestrutura de dados da feature de contato no frontend: o schema Zod `contactFormSchema` (valida `nome`, `email`, `mensagem`) e o hook `useSendContact` (TanStack Query `useMutation` que dispara `POST /contact` via `fetch` nativo — o endpoint foi criado na task-02).

Usa `fetch` nativo ao invés de `api.POST()` porque o endpoint `/contact` não está no schema OpenAPI gerado em `@repo/api-types` — evitar a dependência circular de gerar tipos antes de implementar.

## Arquivos

- Create: `apps/frontend/src/features/contact/schemas/index.ts`
- Create: `apps/frontend/src/features/contact/api/use-send-contact.ts`
- Create: `apps/frontend/src/features/contact/api/use-send-contact.test.tsx`

### Conformidade com as Skills Padrão

- `zod`: usar `.min()`, `.email()` com mensagens em português; exportar o tipo inferido com `z.infer<>`
- `tanstack-query-best-practices`: `useMutation` com `mutationKey`, `retry: 0` (sem retries em formulários de contato), tipagem genérica completa `<void, ApiError, ContactFormInput>`
- `no-workarounds`: não usar `as any` ao tipar o `fetch` response — converter o erro para `ApiError` explicitamente
- `typescript-advanced`: tipar `ContactFormInput` com `z.infer<>`, não redeclarar manualmente
- `super.verification-before-completion`: rodar `pnpm --filter frontend tsc:check`, `pnpm --filter frontend lint:fix` e `pnpm --filter frontend test -- --run` antes de marcar DONE

## Passos

### Step 1: Criar o schema Zod

**Crie** `apps/frontend/src/features/contact/schemas/index.ts`:

```typescript
import { z } from "zod"

export const contactFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Informe um e-mail válido."),
  mensagem: z.string().min(1, "Mensagem é obrigatória."),
})

export type ContactFormInput = z.infer<typeof contactFormSchema>
```

### Step 2: Escrever testes do schema (falha → passa inline)

Os testes do schema validam as regras do Zod sem precisar de render. **Crie** a seção de testes do schema em `use-send-contact.test.tsx` (criado no step 4):

> Esses testes serão adicionados ao arquivo de teste do hook na Step 4.

### Step 3: Escrever os testes do hook `useSendContact` (falha primeiro)

**Crie** `apps/frontend/src/features/contact/api/use-send-contact.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { contactFormSchema } from "../schemas"
import { useSendContact } from "./use-send-contact"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { Wrapper }
}

describe("contactFormSchema", () => {
  test("aceita payload válido", () => {
    const result = contactFormSchema.safeParse({
      nome: "João Silva",
      email: "joao@example.com",
      mensagem: "Olá, tenho uma dúvida.",
    })
    expect(result.success).toBe(true)
  })

  test("rejeita nome com menos de 2 caracteres", () => {
    const result = contactFormSchema.safeParse({
      nome: "J",
      email: "joao@example.com",
      mensagem: "Olá",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.nome).toBeDefined()
    }
  })

  test("rejeita e-mail inválido", () => {
    const result = contactFormSchema.safeParse({
      nome: "João",
      email: "nao-e-email",
      mensagem: "Olá",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  test("rejeita mensagem vazia", () => {
    const result = contactFormSchema.safeParse({
      nome: "João",
      email: "joao@example.com",
      mensagem: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.mensagem).toBeDefined()
    }
  })
})

describe("useSendContact", () => {
  test("resolve void quando POST /contact retorna 200", async () => {
    server.use(
      http.post(`${apiBaseUrl}/contact`, () =>
        HttpResponse.json({ message: "Mensagem enviada com sucesso." }, { status: 200 }),
      ),
    )

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useSendContact(), { wrapper: Wrapper })

    result.current.mutate({
      nome: "João Silva",
      email: "joao@example.com",
      mensagem: "Tenho uma dúvida.",
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  test("expõe isError quando POST /contact retorna 500", async () => {
    server.use(
      http.post(`${apiBaseUrl}/contact`, () =>
        HttpResponse.json({ message: "erro" }, { status: 500 }),
      ),
    )

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useSendContact(), { wrapper: Wrapper })

    result.current.mutate({
      nome: "João",
      email: "joao@example.com",
      mensagem: "Olá",
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

### Step 4: Rodar testes e confirmar que falham

```bash
pnpm --filter frontend test -- --run use-send-contact
```

Esperado: FAIL — "Cannot find module './use-send-contact'".

### Step 5: Criar o hook `useSendContact`

**Crie** `apps/frontend/src/features/contact/api/use-send-contact.ts`:

```typescript
import { type UseMutationResult, useMutation } from "@tanstack/react-query"
import { ApiError } from "@/lib/errors"
import type { ContactFormInput } from "../schemas"

export const CONTACT_MUTATION_KEY = ["contact", "send"] as const

export function useSendContact(): UseMutationResult<void, ApiError, ContactFormInput> {
  return useMutation<void, ApiError, ContactFormInput>({
    mutationKey: CONTACT_MUTATION_KEY,
    retry: 0,
    mutationFn: async (input) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
      const response = await fetch(`${apiUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) {
        throw new ApiError(
          response.status,
          "contact_failed",
          "Não foi possível enviar a mensagem. Tente novamente.",
        )
      }
    },
  })
}
```

### Step 6: Rodar testes e confirmar que passam

```bash
pnpm --filter frontend test -- --run use-send-contact
```

Esperado: PASS — todos os 6 testes passam (4 do schema + 2 do hook).

### Step 7: Verificar lint e tipos

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero issues.

### Step 8: Commit

```bash
git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd add \
  apps/frontend/src/features/contact/schemas/index.ts \
  apps/frontend/src/features/contact/api/use-send-contact.ts \
  apps/frontend/src/features/contact/api/use-send-contact.test.tsx

git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd commit -m "feat(contact): adiciona schema Zod e hook useSendContact"
```

## Critérios de Sucesso

- `contactFormSchema` valida nome ≥ 2 chars, email válido, mensagem não vazia (FR-009, FR-010)
- `useSendContact` dispara `POST /contact` com `fetch` nativo; `retry: 0`; retorna `void` em sucesso
- `isError` é `true` quando o backend retorna status não-OK
- `pnpm --filter frontend lint:fix` e `tsc:check` passam sem erros
- Todos os 6 testes passam
