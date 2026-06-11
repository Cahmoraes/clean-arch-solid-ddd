# Task 8: Integração Frontend — Botão "Entrar com Google" [US-001, US-002, US-003, US-004]

**Status:** DONE
**PRD:** `../prd/prd-google-social-login.md`
**Depende de:** Task 7 (endpoint `POST /sessions/google` no backend)

## Visão Geral

Implementar a integração do Google Sign-In no frontend Next.js. O usuário verá um botão "Entrar com Google" nas páginas de login (`/login`) e cadastro (`/cadastro`). O frontend usa a biblioteca Google Identity Services para obter o ID Token do Google e o envia para o backend via `POST /sessions/google`. O fluxo pós-login é idêntico ao login tradicional (JWT em memória + cookie httpOnly).

## Pré-requisitos

Antes de começar, executar na raiz do monorepo:

```bash
pnpm generate:types
```

Isso atualiza `packages/api-types` com o novo endpoint `/sessions/google`. Verificar que o tipo existe antes de prosseguir.

## Arquivos

- Modify: `apps/frontend/.env.local` e `apps/frontend/.env.local.example`
- Modify: `apps/frontend/package.json` (instalar `@react-oauth/google`)
- Modify: `apps/frontend/src/app/providers.tsx`
- Modify: `apps/frontend/src/features/auth/api/index.ts`
- Modify: `apps/frontend/src/features/auth/api/index.test.tsx`
- Create: `apps/frontend/src/features/auth/components/google-sign-in-button.tsx`
- Create: `apps/frontend/src/features/auth/components/google-sign-in-button.test.tsx`
- Modify: `apps/frontend/src/app/(public)/login/page.tsx`
- Modify: `apps/frontend/src/app/(public)/login/page.test.tsx`
- Modify: `apps/frontend/src/app/(public)/cadastro/page.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`

## Passos

### Step 1: Variável de ambiente

Em `apps/frontend/.env.local` e `.env.local.example`, adicionar:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=REDACTED_GOOGLE_CLIENT_ID
```

### Step 2: Instalar dependência

```bash
pnpm --filter frontend add @react-oauth/google
```

A biblioteca provê `GoogleOAuthProvider` (contexto) e `useGoogleLogin` / resposta de credencial (ID Token).

### Step 3: Adicionar `GoogleOAuthProvider` ao `providers.tsx`

Envolver o `QueryClientProvider` com o `GoogleOAuthProvider`:

```tsx
import { GoogleOAuthProvider } from "@react-oauth/google"

// No componente Providers:
<GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
  </QueryClientProvider>
</GoogleOAuthProvider>
```

**Nota:** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` é exposta ao browser via prefixo `NEXT_PUBLIC_`. O provider pode receber string vazia em ambientes sem a variável (o botão simplesmente não funcionará).

### Step 4: Adicionar hook `useLoginWithGoogle`

Em `apps/frontend/src/features/auth/api/index.ts`, adicionar:

```typescript
export interface LoginWithGoogleResult {
  token: string
  refreshToken: string
}

export function useLoginWithGoogle(): UseMutationResult<
  LoginWithGoogleResult,
  ApiError,
  string  // idToken
> {
  return useMutation<LoginWithGoogleResult, ApiError, string>({
    mutationFn: async (idToken: string) => {
      const { data, error } = await api.POST("/sessions/google", {
        body: { idToken },
      })
      if (error || !data) throw toApiError(error)
      useAuthStore.getState().setSession(data.token)
      return { token: data.token, refreshToken: data.refreshToken }
    },
  })
}
```

**Nota:** Verificar se o endpoint `/sessions/google` existe em `@repo/api-types` após `pnpm generate:types`. Se não existir, executar `pnpm generate:types` primeiro.

### Step 5: Criar `GoogleSignInButton`

**Arquivo:** `apps/frontend/src/features/auth/components/google-sign-in-button.tsx`

O componente deve:
- Usar `useGoogleLogin` do `@react-oauth/google` com `flow: "implicit"` NÃO funciona para ID token. Usar a abordagem `CredentialResponse` via `GoogleLogin` ou `useGoogleOneTapLogin`.

**Abordagem recomendada:** Usar o hook `useGoogleLogin` da biblioteca com `onSuccess` que recebe `CredentialResponse`. 

Porém, **atenção**: `useGoogleLogin` com `flow: "implicit"` retorna OAuth2 access token (não ID token). Para obter um ID token, usar o componente `GoogleLogin` da biblioteca ou configurar o `useGoogleOneTapLogin`. 

**Abordagem mais simples e correta:** Usar o componente `GoogleLogin` da biblioteca com a prop `onSuccess` que recebe um `CredentialResponse` contendo `credential` (o ID Token). Renderizar um botão customizado que invoca o popup do Google. 

Alternativamente, usar a Google Identity Services script diretamente via `window.google.accounts.id`:

```tsx
// Opção A: usar componente GoogleLogin da @react-oauth/google
// O CredentialResponse.credential é o ID Token
import { GoogleLogin } from "@react-oauth/google"

// Opção B: criar botão próprio que chama o popup programaticamente
// usando useGoogleLogin (retorna CodeResponse no fluxo "auth-code")
```

**Decisão de implementação:** Consulte a documentação atual de `@react-oauth/google` antes de implementar. Use `context7` para verificar a API. O ponto central é que o `idToken` enviado ao backend deve ser o JWT credential do Google (campo `credential` da `CredentialResponse`).

O botão deve seguir o design system:
- Fundo branco, borda `border-border`, texto `text-foreground`  
- Border-radius: `rounded-full` (pill-shaped, 9999px — padrão do design)
- Ícone Google SVG inline (logo "G" colorido — único elemento com cor no design)
- Texto: "Entrar com Google"
- Estado loading e disabled análogos ao `Button` existente
- `data-testid="google-sign-in-button"`

```tsx
// Estrutura aproximada do componente
interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void
  onError?: (error: Error) => void
  disabled?: boolean
  isPending?: boolean
}

export function GoogleSignInButton({ onSuccess, onError, disabled, isPending }: GoogleSignInButtonProps) {
  // Integração com @react-oauth/google
  // Renderiza botão pill-shaped com ícone Google SVG e texto
}
```

### Step 6: Adicionar à página de login

Em `apps/frontend/src/app/(public)/login/page.tsx`:

1. Importar `useLoginWithGoogle` e `GoogleSignInButton`
2. Adicionar um separador visual "ou" entre o formulário e o botão Google:

```tsx
<div className="flex items-center gap-3">
  <div className="flex-1 border-t border-border" />
  <span className="text-xs text-muted-foreground">ou</span>
  <div className="flex-1 border-t border-border" />
</div>

<GoogleSignInButton
  onSuccess={async (idToken) => {
    await mutateAsyncGoogle(idToken)
    const redirect = searchParams?.get("redirect") ?? DEFAULT_REDIRECT
    router.replace(redirect)
  }}
  onError={(error) => toast.error(googleLoginErrorMessage(error))}
  isPending={isGooglePending}
/>
```

3. Tratar erros do Google:
```typescript
function googleLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Token Google inválido ou expirado."
    if (error.status === 422) return "O e-mail da conta Google não está verificado."
    return error.userMessage
  }
  return "Não foi possível concluir o login com Google. Tente novamente."
}
```

### Step 7: Adicionar à página de cadastro

Em `apps/frontend/src/app/(public)/cadastro/page.tsx`, adicionar o mesmo botão abaixo do formulário com separador "ou". Ao ter sucesso, redirecionar para `/academias` (o usuário já está autenticado — não precisa do fluxo de ativação por email).

### Step 8: Adicionar handler MSW

Em `apps/frontend/src/test/msw/handlers.ts`, adicionar:

```typescript
http.post(endpoint("/sessions/google"), () =>
  HttpResponse.json(
    { token: "stub-google-token", refreshToken: "stub-google-refresh" },
    { status: 200 },
  ),
),
```

### Step 9: Testes do hook `useLoginWithGoogle`

Em `apps/frontend/src/features/auth/api/index.test.tsx`, adicionar testes para `useLoginWithGoogle`:

```typescript
describe("useLoginWithGoogle", () => {
  test("deve popular o auth-store com token ao autenticar via Google", async () => {
    // MSW: POST /sessions/google → 200 com token
    // Chamar mutateAsync("fake-id-token")
    // Verificar auth-store.accessToken
  })

  test("deve lançar ApiError 401 quando token Google for inválido", async () => {
    // MSW: POST /sessions/google → 401
    // Verificar que rejeita com { status: 401 }
    // Verificar que auth-store.accessToken é null
  })

  test("deve lançar ApiError 422 quando email Google não for verificado", async () => {
    // MSW: POST /sessions/google → 422
    // Verificar que rejeita com { status: 422 }
  })
})
```

### Step 10: Testes do componente `GoogleSignInButton`

Em `apps/frontend/src/features/auth/components/google-sign-in-button.test.tsx`:

- Mockar `@react-oauth/google` para não depender da API real do Google
- Testar que o botão renderiza com `data-testid="google-sign-in-button"`
- Testar que `onSuccess` é chamado com o idToken ao clicar (mock do callback)
- Testar estado `disabled` e `isPending`

### Step 11: Atualizar testes da LoginPage

Em `apps/frontend/src/app/(public)/login/page.test.tsx`:

- Mockar `@react-oauth/google` (`vi.mock("@react-oauth/google", ...)`) para evitar dependência externa
- Adicionar teste: "exibe botão Entrar com Google" → `screen.getByTestId("google-sign-in-button")` está presente
- Adicionar teste: "redireciona após autenticação Google bem-sucedida"

## Gate de Qualidade

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
pnpm --filter frontend build
```

Todos devem passar com **zero** erros antes de considerar a task concluída.

## Observações Importantes

1. **Tipagem**: Se `POST /sessions/google` não aparecer em `@repo/api-types`, rodar `pnpm generate:types` na raiz após a Task 7 estar concluída e commitada.

2. **Mock de `@react-oauth/google` nos testes**: A biblioteca usa APIs do browser (popup OAuth). Sempre mockar nos testes unitários para evitar side effects:
   ```typescript
   vi.mock("@react-oauth/google", () => ({
     GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
     GoogleLogin: ({ onSuccess }: { onSuccess: Function }) => (
       <button onClick={() => onSuccess({ credential: "fake-id-token" })}>
         Google
       </button>
     ),
     useGoogleLogin: () => vi.fn(),
   }))
   ```

3. **Design**: O ícone Google SVG deve usar as cores originais do Google para o logo ("G"), pois é o único elemento com cor no design sistema (conforme DESIGN.md: "Ring Blue é a ÚNICA cor não-grayscale"). O restante do botão segue o sistema monocromático.

4. **Indentação**: O projeto frontend usa **tab** (não espaço), conforme configuração do Biome.

5. **Convenção de testes**: Usar `test` (nunca `it`), descrições em PT-BR.
