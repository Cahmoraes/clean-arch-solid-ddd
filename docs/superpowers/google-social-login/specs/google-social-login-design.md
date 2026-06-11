---
created_at: "2026-05-09T09:48:36-03:00"
updated_at: "2026-05-09T10:10:18-03:00"
---

# Google Social Login — Design Spec

## Visão Geral

Adicionar suporte a login/cadastro via conta Google ao backend Fastify. O fluxo é **frontend-initiated**: o frontend usa o Google Identity Services para obter um **ID Token**, que é enviado ao backend para validação. O backend verifica o token com a API Google, resolve o usuário (busca, vincula ou cria), e emite os JWTs próprios da aplicação.

---

## Fluxo de Autenticação

```
Frontend                          Backend                         Google
   │                                │                                │
   │── Clique em "Sign in Google" ──│                                │
   │                                │                                │
   │──── Google Identity Services ──────────────────────────────────►│
   │◄───────────── ID Token (JWT) ──────────────────────────────────│
   │                                │                                │
   │── POST /sessions/google ──────►│                                │
   │   { idToken: "eyJ..." }        │                                │
   │                                │── verifyIdToken(idToken) ─────►│
   │                                │◄── { sub, email, name,         │
   │                                │     email_verified }           │
   │                                │                                │
   │                                │── Resolve usuário:             │
   │                                │   1. Busca por google_id       │
   │                                │   2. Busca por email verificado│
   │                                │   3. Cria novo usuário         │
   │                                │                                │
   │                                │── Emite JWT + Refresh Token    │
   │◄── { token, refreshToken } ────│                                │
```

**Rota:** `POST /sessions/google`
**Body:** `{ idToken: string }`
**Response (200):** `{ token: string, refreshToken: string }` — idêntica ao login tradicional

---

## Resolução do Usuário

A lógica de resolução ocorre sequencialmente:

1. **Busca por `google_id`** — se encontrar, faz login direto
2. **Busca por email** (somente se `email_verified === true`) — se encontrar, vincula o `google_id` ao usuário existente e faz login
3. **Cria novo usuário** — se não encontrar nenhum, cria usuário com `name` e `email` do Google, `google_id` preenchido, e `password_hash: null`

**Regra de integridade:** Um usuário deve ter pelo menos um método de autenticação — `password_hash` não-nulo **ou** `google_id` não-nulo.

---

## Mudanças no Schema Prisma

```prisma
model User {
  // campos existentes...
  password_hash       String?       // era non-null, agora nullable
  google_id           String?  @unique  // NOVO
}
```

Nova migração Prisma necessária.

---

## Domínio

### Value Object: `GoogleId`

- Wrapper opcional sobre `string`
- Validação: não pode ser string vazia se presente

### Entidade `User` — mudanças

- Nova propriedade opcional: `googleId?: GoogleId`
- `create()`: aceita `googleId` opcional; `password` passa a ser opcional; valida que ao menos um está presente
- `restore()`: reconstrói `googleId` quando presente no registro
- Novo método `linkGoogleAccount(googleId: GoogleId)`: vincula conta Google, dispara `GoogleAccountLinkedEvent`

### Erros de Domínio (novos)

| Classe | HTTP | Quando |
|--------|------|--------|
| `InvalidGoogleTokenError` | 401 | Token inválido ou expirado |
| `GoogleEmailNotVerifiedError` | 422 | `email_verified !== true` no payload Google |

### Domain Event (novo)

`GoogleAccountLinkedEvent` — publicado quando um usuário com conta existente vincula pela primeira vez sua conta Google.

---

## Camada de Aplicação

### Abstração: `GoogleAuthProvider`

```typescript
interface GoogleUserInfo {
  sub: string
  email: string
  name: string
  emailVerified: boolean
}

interface GoogleAuthProvider {
  verify(idToken: string): Promise<Either<Error, GoogleUserInfo>>
}
```

Localização: `src/session/application/provider/google-auth-provider.ts`

### Use Case: `AuthenticateWithGoogleUseCase`

Localização: `src/session/application/use-case/authenticate-with-google.usecase.ts`

```
Input:  { idToken: string }
Output: Either<
  InvalidGoogleTokenError | GoogleEmailNotVerifiedError | UserNotFoundError,
  { token: string; refreshToken: string }
>
```

**Dependências injetadas:**
- `GoogleAuthProvider` — valida o ID Token
- `UserRepository` — busca/persistência de usuário
- `AuthToken` — geração de JWT (já existe)

**Fluxo interno:**
1. `googleAuthProvider.verify(idToken)` → falha → `InvalidGoogleTokenError`
2. Verificar `emailVerified === true` → falha → `GoogleEmailNotVerifiedError`
3. Buscar por `google_id` → encontrou → ir para passo 7
4. Buscar por `email` → encontrou → `user.linkGoogleAccount(googleId)` + `userRepository.save(user)`
5. Não encontrou → `User.create({ name, email, googleId })` + `userRepository.save(user)`
6. Verificar se usuário está `activated` → falha → erro
7. Gerar `jwi` + assinar `token` + `refreshToken` → retornar

---

## Camada de Infraestrutura

### Controller: `AuthenticateWithGoogleController`

Localização: `src/session/infra/controller/authenticate-with-google.controller.ts`

- Rota: `POST /sessions/google`
- Proteção: pública (sem `isProtected`)
- Valida body com Zod: `{ idToken: z.string().min(1) }`
- Mapeia erros: `InvalidGoogleTokenError` → 401, `GoogleEmailNotVerifiedError` → 422

### Provider: `GoogleAuthProviderImpl`

Localização: `src/session/infra/provider/google-auth-provider-impl.ts`

- Usa `google-auth-library` (`OAuth2Client.verifyIdToken`)
- Inicializa `OAuth2Client` com `env.GOOGLE_CLIENT_ID`
- Em caso de exceção do Google → retorna `failure(new InvalidGoogleTokenError())`

### Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud Console | Sim |

Adicionar ao `.env.example` e ao schema de validação de env (ex.: Zod/env).

### IoC — novos bindings em `session-container.ts`

```typescript
container.bind(SessionTypes.GoogleAuthProvider).to(GoogleAuthProviderImpl)
container.bind(SessionTypes.AuthenticateWithGoogleUseCase).to(AuthenticateWithGoogleUseCase)
```

Adicionar símbolos correspondentes em `session-types.ts`.

---

## Estratégia de Testes

### Testes Unitários (`authenticate-with-google.usecase.test.ts`)

Usa `InMemoryGoogleAuthProvider` (retorna payloads fixos) e `InMemoryUserRepository`.

| Cenário | Resultado esperado |
|---------|--------------------|
| Token válido, usuário novo | Cria usuário + retorna tokens |
| Token válido, `google_id` existente | Login direto + retorna tokens |
| Token válido, email existente sem `google_id` | Vincula `google_id` + retorna tokens |
| `email_verified: false` | `GoogleEmailNotVerifiedError` (422) |
| Token inválido/expirado | `InvalidGoogleTokenError` (401) |
| Usuário suspenso | Erro de usuário suspenso |

### Business Flow Test (`authenticate-with-google.business-flow-test.ts`)

| Cenário | Resultado esperado |
|---------|--------------------|
| `POST /sessions/google` com token mock válido | 200 + `{ token, refreshToken }` |
| `POST /sessions/google` com token inválido | 401 |
| Token emitido acessa rota protegida | 200 |

---

## Dependências Externas

| Pacote | Uso |
|--------|-----|
| `google-auth-library` | Validação de ID Token via `OAuth2Client.verifyIdToken` |

Instalar em `apps/backend`.

---

## Fora do Escopo

- Outros provedores OAuth (GitHub, Facebook, etc.)
- Fluxo de vinculação manual de conta Google (settings do usuário)
- Remoção/desvinculação de conta Google
- Definição de senha por usuários Google-only
- Login no frontend (implementação do Google Identity Services)
