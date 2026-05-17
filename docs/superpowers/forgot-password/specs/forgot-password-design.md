---
created_at: "2026-05-17T15:17:07-03:00"
updated_at: "2026-05-17T15:19:11-03:00"
---

# Forgot Password — Design Spec

## Overview

Feature de recuperação de senha esquecida com escopo completo: backend (API REST), frontend (Next.js) e template de e-mail HTML. O fluxo segue as recomendações OWASP: token CSPRNG de uso único, armazenado com hash no Redis, expiração de 15 minutos, sem enumeração de usuários e com rate limiting por IP e por e-mail.

---

## Arquitetura Geral

```
POST /password/forgot          POST /password/reset
        │                               │
ForgotPasswordController    ResetPasswordController
        │                               │
ForgotPasswordUseCase       ResetPasswordUseCase
        │                        │           │
   Redis (token)            Redis (validate   RevokedTokenDAO
   Mailer (email)            + delete)        (revoga todas as sessões)
                                  │
                             Password VO (bcrypt)
                             UserRepository
                             Mailer (alerta de senha alterada)
```

---

## Backend

### Novos arquivos

```
src/user/
├── application/
│   ├── use-case/
│   │   ├── forgot-password.usecase.ts
│   │   └── reset-password.usecase.ts
│   └── persistence/
│       └── password-reset-token-store.ts   ← interface (porta)
├── infra/
│   ├── controller/
│   │   ├── forgot-password.controller.ts
│   │   └── reset-password.controller.ts
│   ├── gateway/
│   │   └── redis-password-reset-token-store.ts
│   └── email/
│       └── send-password-reset-email.notification.ts
```

### Rotas

| Método | Rota               | Auth    | Rate limit                        |
|--------|--------------------|---------|-----------------------------------|
| POST   | /password/forgot   | público | 5 req/15min por IP, 3 req/1h por e-mail |
| POST   | /password/reset    | público | limite geral                      |

### Token de Reset (Redis)

1. Gera `rawToken = crypto.randomBytes(32).toString('hex')` (256 bits, CSPRNG)
2. Calcula `tokenHash = SHA-256(rawToken)`
3. Armazena `pwd-reset:{tokenHash}` → `{userId}` com TTL 900s (15 min)
4. Armazena `pwd-reset:uid:{userId}` → `{tokenHash}` para invalidar token anterior ao emitir novo
5. Envia link: `{APP_URL}/reset-password?token={rawToken}`

O token raw nunca é persistido — apenas o hash. Na validação, recebe-se o `rawToken`, calcula-se o hash e busca-se no Redis.

### ForgotPasswordUseCase

- Recebe `{ email: string }`
- Busca usuário no repositório
- **Sempre retorna `success(null)`** (sem revelar se o e-mail existe)
- Se o usuário existir:
  - Verifica rate limit por e-mail (Redis counter `rl:forgot:email:{email}`, max 3/1h)
  - Invalida token anterior via `pwd-reset:uid:{userId}`
  - Gera novo token e persiste no Redis (via `PasswordResetTokenStore`)
  - Dispara `SendPasswordResetEmailNotification`
- Retorna `Either<never, null>`

### ResetPasswordUseCase

- Recebe `{ token: string, newPassword: string }`
- Calcula hash do token, busca `pwd-reset:{hash}` no Redis → obtém `userId`
- Se não encontrar: retorna `failure(new InvalidTokenError())`
- Busca usuário via `UserRepository`
- Atualiza senha (via `Password` Value Object com bcrypt)
- Deleta chaves Redis: `pwd-reset:{hash}` e `pwd-reset:uid:{userId}`
- Revoga todas as sessões ativas via `RevokedTokenDAO.revokeAllForUser(userId, ttl)`
- Dispara `SendPasswordAlertEmailNotification` (já existente)
- Retorna `Either<InvalidTokenError | UserNotFoundError, null>`

### Extensão do RevokedTokenDAO para revogação em massa

O `RevokedTokenDAO` atual só revoga uma sessão por vez (por JWI). Para invalidar todas as sessões do usuário após o reset, a interface ganha um novo método:

```ts
interface RevokedTokenDAO {
  // métodos existentes...
  revokeAllForUser(userId: string, ttl: number): Promise<void>
  isAllRevokedForUser(userId: string): Promise<boolean>
}
```

**Implementação no `RedisRevokedTokenDAO`:**
- `revokeAllForUser`: armazena `user:revoked:{userId}` → `"1"` no Redis com TTL = lifetime máximo do access token
- `isAllRevokedForUser`: verifica se a chave `user:revoked:{userId}` existe

**Extensão do `CheckSessionRevoked`:**
- Recebe também `userId` (já disponível em `request.user.sub.id` após verificação JWT)
- Além de verificar o JWI individual, verifica `isAllRevokedForUser(userId)`
- Se qualquer uma das verificações retornar verdadeiro → sessão rejeitada (401)

### Rate Limiting

- **Por IP**: configurado via opção `rateLimit` da rota no `ForgotPasswordController`, usando a entrada `FORGOT_PASSWORD` adicionada em `RATE_LIMIT_CONFIG` (5 req / 15min).
- **Por e-mail**: lógica manual dentro do `ForgotPasswordUseCase` usando o cliente Redis existente (counter com TTL de 1h, max 3 tentativas).

### Configuração adicionada em `rate-limit-config.ts`

```ts
FORGOT_PASSWORD: {
  MAX: 5,
  TIME_WINDOW: 15 * 60 * 1000, // 15 minutos
}
```

---

## Email Template

**Arquivo:** `src/user/infra/email/send-password-reset-email.notification.ts`

- Assunto: `"Recuperação de senha"`
- HTML inline (mesmo padrão do `SendWelcomeEmailNotification`)
- Fallback texto puro
- Variáveis: `{ to, name, resetLink }`
- Conteúdo:
  - Saudação com nome do usuário
  - Botão/link: `{APP_URL}/reset-password?token={rawToken}`
  - Aviso: *"Este link expira em 15 minutos"*
  - Aviso de segurança: *"Se você não solicitou isso, ignore este e-mail"*

---

## Frontend (Next.js)

### Página `/forgot-password`

- Formulário com campo de e-mail
- Submete `POST /password/forgot`
- Resposta de sucesso exibe mensagem genérica: *"Se este e-mail estiver cadastrado, você receberá um link em breve"* (independente do e-mail existir ou não)
- Estados: idle → loading → success | error
- TanStack Query mutation

### Página `/reset-password`

- Lê `token` da query string
- Formulário com campos: nova senha + confirmação
- Validação client-side: senhas coincidem, mínimo 8 caracteres
- Submete `POST /password/reset` com `{ token, newPassword }`
- Sucesso: mensagem + redirect automático para `/login` após 3s
- Token inválido/expirado: mensagem de erro com link para `/forgot-password`

### Página de Login

- Adicionar link "Esqueceu sua senha?" apontando para `/forgot-password`

### Tipos

- Gerados via OpenAPI a partir do backend (`@repo/api-types`)

---

## Segurança

| Aspecto | Decisão |
|---------|---------|
| Token | CSPRNG 256 bits, armazenado apenas como SHA-256 hash |
| TTL | 15 minutos |
| Uso único | Token deletado do Redis após uso bem-sucedido |
| Invalidação ao emitir novo | Token anterior removido via chave `pwd-reset:uid:{userId}` |
| Enumeração | Resposta idêntica para e-mail existente e inexistente |
| Sessões | Todas as sessões JWT revogadas via `RevokedTokenDAO.revokeAllForUser()` + verificação user-level em `CheckSessionRevoked` |
| Rate limit IP | 5 req / 15min (via `@fastify/rate-limit`) |
| Rate limit e-mail | 3 req / 1h (Redis counter manual no UseCase) |
| E-mail de alerta | `SendPasswordAlertEmailNotification` já existente disparado após reset |

---

## Testes

### Unit tests (`*.test.ts`)

**`forgot-password.usecase.test.ts`:**
- E-mail não encontrado → retorna `success(null)` sem enviar e-mail
- E-mail encontrado → token gerado, salvo no Redis, e-mail disparado
- Token anterior invalidado ao gerar novo

**`reset-password.usecase.test.ts`:**
- Token válido → senha atualizada, Redis limpo, sessões revogadas, alerta enviado
- Token inválido → `InvalidTokenError`
- Token expirado (simulado via TTL) → `InvalidTokenError`

### Business flow tests (`*.business-flow-test.ts`)

**`forgot-password.business-flow-test.ts`:**
- POST com e-mail válido → 200
- POST com e-mail inexistente → 200 (mesmo body)
- Rate limit excedido → 429

**`reset-password.business-flow-test.ts`:**
- Fluxo completo: solicitar reset → usar token → login com nova senha funciona
- Token expirado → 400
- Token reutilizado → 400

### Frontend (`*.test.tsx` Vitest)

- Render das páginas, estado de loading, mensagens de sucesso/erro
