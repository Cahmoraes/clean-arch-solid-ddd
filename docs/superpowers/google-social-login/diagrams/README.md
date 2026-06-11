---
created_at: "2026-05-10T06:55:00-03:00"
---

# Google OAuth — Diagrama de Sequência

Diagrama de sequência do fluxo de autenticação via Google OAuth implementado no backend.

O arquivo `.mmd` pode ser renderizado via [Mermaid Live Editor](https://mermaid.live) ou qualquer editor com suporte a Mermaid (VS Code, GitHub, Obsidian, etc).

```mermaid
sequenceDiagram
    autonumber
    actor Usuário
    participant Frontend
    participant Controller as AuthenticateWithGoogleController
    participant UseCase as AuthenticateWithGoogleUseCase
    participant GoogleProvider as GoogleAuthProviderImpl
    participant GoogleAPI as Google OAuth2 API
    participant UserRepo as UserRepository
    participant AuthToken as AuthToken (JWT)
    participant EventBus as DomainEventPublisher

    Usuário->>Frontend: Clica em "Entrar com Google"

    Note over Frontend: Google Identity Services SDK<br/>(executa no browser do usuário)
    Frontend->>+GoogleAPI: Solicita autenticação
    GoogleAPI-->>-Frontend: ID Token (JWT assinado pelo Google)

    Frontend->>+Controller: POST /sessions/google<br/>{ idToken: "eyJ..." }
    Note over Controller: Valida body com Zod<br/>z.string().min(1)

    Controller->>+UseCase: execute({ idToken })

    UseCase->>+GoogleProvider: verify(idToken)
    GoogleProvider->>+GoogleAPI: OAuth2Client.verifyIdToken(idToken, clientId)

    alt Token inválido ou expirado
        GoogleAPI-->>GoogleProvider: Lança exceção
        GoogleProvider-->>UseCase: failure(InvalidGoogleTokenError)
        UseCase-->>Controller: failure(InvalidGoogleTokenError)
        Controller-->>Frontend: 401 Unauthorized
        Frontend-->>Usuário: Exibe mensagem de erro
    else Token válido
        GoogleAPI-->>-GoogleProvider: { sub, email, name, email_verified }
        GoogleProvider-->>-UseCase: success({ sub, email, name, emailVerified })

        alt emailVerified === false
            UseCase-->>Controller: failure(GoogleEmailNotVerifiedError)
            Controller-->>Frontend: 422 Unprocessable Entity
            Frontend-->>Usuário: Email Google não verificado
        else emailVerified === true
            Note over UseCase: Resolução do usuário (3 etapas)
            UseCase->>+UserRepo: findByGoogleId(sub)

            alt Encontrou por google_id
                UserRepo-->>UseCase: User (já vinculado)
                Note over UseCase: Login direto — sem alterações
            else Não encontrou por google_id
                UserRepo-->>UseCase: null
                UseCase->>UserRepo: findByEmail(email)

                alt Encontrou por email (conta existente)
                    UserRepo-->>UseCase: User (criado por senha)
                    UseCase->>UseCase: user.linkGoogleAccount(googleId)
                    UseCase->>EventBus: publish(GoogleAccountLinkedEvent)
                    UseCase->>UserRepo: save(user)
                    UserRepo-->>UseCase: ok
                else Nenhum usuário encontrado
                    UserRepo-->>UseCase: null
                    UseCase->>UseCase: User.create({ name, email, googleId, password: null })
                    UseCase->>UserRepo: save(newUser)
                    UserRepo-->>-UseCase: ok
                end
            end

            UseCase->>+AuthToken: sign(userId) + generateRefreshToken()
            AuthToken-->>-UseCase: { token, refreshToken }

            UseCase-->>-Controller: success({ token, refreshToken })
            Controller-->>-Frontend: 200 OK { token, refreshToken }
            Frontend-->>Usuário: Redireciona para área autenticada
        end
    end
```

---

## Etapas explicadas

### Fase 1 — Obtenção do ID Token (Frontend ↔ Google)

> Etapas 1–3

O usuário clica no botão. O **Google Identity Services SDK** (rodando no browser) abre o fluxo de seleção de conta Google. O Google valida as credenciais e devolve um **ID Token** — um JWT assinado com as chaves privadas do Google contendo `sub`, `email`, `name` e `email_verified`.

---

### Fase 2 — Validação do Token (Backend ↔ Google)

> Etapas 4–9

O frontend envia `POST /sessions/google` com o ID Token. O **Controller** valida o body com Zod e chama o **UseCase**. O **GoogleAuthProviderImpl** usa a biblioteca `google-auth-library` (`OAuth2Client.verifyIdToken`) para confirmar a assinatura criptográfica do token diretamente com os servidores do Google.

| Situação | Resposta |
|----------|----------|
| Token inválido ou expirado | `401 Unauthorized` |
| Email não verificado no Google | `422 Unprocessable Entity` |

---

### Fase 3 — Resolução do Usuário (3 caminhos)

> Etapas 10–17

O UseCase tenta resolver o usuário em sequência, garantindo **zero contas duplicadas** para o mesmo email:

| Ordem | Busca | Ação |
|-------|-------|------|
| 1º | `findByGoogleId(sub)` | Login direto, sem alterações |
| 2º | `findByEmail(email)` | Vincula `google_id` + publica `GoogleAccountLinkedEvent` |
| 3º | Nenhum | Cria novo `User` com `password_hash: null` |

**Regra de integridade:** todo usuário tem ao menos um método de autenticação — `password_hash` não-nulo **ou** `google_id` não-nulo.

---

### Fase 4 — Emissão dos JWTs e Resposta

> Etapas 18–21

Independente do caminho de resolução, o **AuthToken** gera o `token` (JWT de acesso) e o `refreshToken` — **idênticos ao login tradicional por email/senha**. O frontend armazena os tokens e redireciona o usuário para a área autenticada.

---

## Arquivos relacionados

| Arquivo | Descrição |
|---------|-----------|
| [`../specs/google-social-login-design.md`](../specs/google-social-login-design.md) | Design spec completo |
| [`../prd/prd-google-social-login.md`](../prd/prd-google-social-login.md) | PRD com histórias de usuário |
| [`google-oauth-sequence.mmd`](./google-oauth-sequence.mmd) | Diagrama Mermaid (fonte) |
