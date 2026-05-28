---
created_at: "2026-05-28T10:00:45-03:00"
updated_at: "2026-05-28T10:00:45-03:00"
---

# Login Security Lockout — Design Spec

## Visão Geral

Mecanismo de segurança que bloqueia a conta de um usuário após 3 tentativas de login inválidas dentro de uma janela de 15 minutos. O usuário recebe um e-mail de alerta com link para redefinição de senha. O desbloqueio ocorre exclusivamente via troca de senha (pelo próprio usuário) ou via ação manual do admin. Usuários bloqueados permanentemente pelo admin não podem usar o fluxo de redefinição de senha para recuperar acesso.

---

## Modelo de Domínio

### UserStatus — novo estado `locked`

O enum `UserStatus` é estendido de `activated | suspended` para:

| Valor | Significado | Pode redefinir senha? |
|---|---|---|
| `activated` | Conta ativa | Sim |
| `locked` | Bloqueada por segurança (3 tentativas falhas) | Sim — e o reset desbloqueia |
| `suspended` | Bloqueada pelo admin | Não |

### Campo `isSuperAdmin` na entidade User

Campo booleano adicionado ao schema Prisma e à entidade `User`:

```prisma
model User {
  // ... campos existentes
  isSuperAdmin Boolean @default(false)
}
```

- Setado como `true` na seed/migration data para o root admin (`admin@admin.com`)
- Exposto como propriedade `isSuperAdmin` na entidade `User`
- **Todos** os lugares do backend que comparam `user.email === 'admin@admin.com'` são substituídos por `user.isSuperAdmin`
- Usuários com `isSuperAdmin = true` são isentos do contador de tentativas falhas e jamais entram no estado `locked`

### State Pattern — transições novas e modificadas

As transições existentes são preservadas. Novas transições:

| De | Para | Ator | Condição |
|---|---|---|---|
| `activated` | `locked` | Sistema | 3ª tentativa falha dentro da janela de 15 min |
| `locked` | `activated` | Usuário | Reset de senha bem-sucedido |
| `locked` | `activated` | Admin | Ação de ativar usuário (`PATCH /users/activate`) |
| `locked` | `suspended` | Admin | Ação de suspender usuário (`PATCH /users/suspend`) |

As classes `ActivatedStatus` e `SuspendedStatus` do State Pattern ganham suporte para aceitar transições a partir de `locked`.

---

## Redis — Chaves Novas

| Chave | TTL | Propósito |
|---|---|---|
| `login:failed:{email}` | 15 min (renova a cada falha) | Contador de tentativas falhas na janela |
| `login:locked:{userId}` | Sem TTL | Cache rápido do estado `locked` (DB é fonte de verdade) |

O contador `login:failed:{email}` usa sliding TTL: cada nova tentativa falha renova os 15 minutos. Ao atingir 3, o sistema bloqueia e deleta o contador.

---

## Fluxos

### 1. Fluxo de Autenticação (AuthenticateUseCase — modificado)

```
POST /sessions { email, password }

1. Busca usuário por email
2. Se não encontrado: executa fake bcrypt (anti-timing), retorna erro genérico 401
3. Se user.isSuperAdmin: pula verificações de lock, segue fluxo normal
4. Verifica Redis login:locked:{userId}
   └─ Se existe: executa bcrypt mesmo assim (anti-timing), retorna erro genérico 401
5. Executa bcrypt.compare(password, user.password)
6. Se senha inválida:
   a. Incrementa login:failed:{email} com TTL de 15 min
   b. Se contador == 3:
      - user.status → locked (persiste no DB)
      - Seta login:locked:{userId} no Redis (sem TTL)
      - Deleta login:failed:{email}
      - Gera token de reset de senha (PasswordResetTokenStore, TTL 15 min)
      - Publica AccountLockedBySecurityEvent(userId, email, resetToken)
   c. Retorna erro genérico 401 "Credenciais inválidas"
7. Se senha válida:
   - Deleta login:failed:{email}
   - Segue fluxo normal (gera JWT + refreshToken)
```

**Invariante de segurança:** O bcrypt **sempre executa**, independente do estado da conta. Isso garante tempo de resposta constante (~100ms) e impede timing attacks e user enumeration.

**Resposta de erro:** Todos os casos de falha retornam `401 { "message": "Credenciais inválidas" }` — sem distinção entre usuário inexistente, senha errada, conta `locked` ou conta `suspended`.

### 2. Fluxo de Notificação por E-mail

```
AccountLockedBySecurityEvent(userId, email, resetToken)
  └─ SendAccountLockedEmailNotification
      └─ MailerGateway.send(AccountLockedEmailTemplate, {
           email,
           resetLink: /password/reset?token={resetToken}
         })
```

O evento carrega o `resetToken` pré-gerado para que o e-mail já contenha o link de redefinição. O template inclui:
- Alerta de tentativas de acesso suspeitas detectadas
- Informação de que o acesso foi bloqueado por segurança
- CTA: "Redefinir senha e recuperar acesso" (link com token)
- Rodapé: orientação para contato com suporte se não foi o próprio usuário

### 3. Fluxo de Desbloqueio pelo Usuário (ResetPasswordUseCase — modificado)

```
POST /password/reset { token, newPassword }

1. Valida token no Redis (já existente)
2. Busca usuário pelo token
3. Verifica user.status:
   └─ suspended → rejeita com InvalidTokenError (edge case: admin suspendeu enquanto token estava ativo)
4. Troca a senha
5. user.status → activated (se estava locked)
6. Deleta login:locked:{userId} do Redis
7. Revoga todas as sessões ativas (comportamento já existente)
```

### 4. Fluxo de Forgot Password (ForgotPasswordUseCase — modificado)

```
POST /password/forgot { email }

1. Busca usuário por email
2. Se não encontrado: retorna 200 genérico (anti-enumeração) — sem e-mail enviado
3. Se user.status === suspended: retorna 200 genérico — sem e-mail enviado (não revela status)
4. Se user.status === locked OU activated: segue fluxo normal (gera token, envia e-mail)
```

### 5. Fluxo de Desbloqueio pelo Admin (ActivateUserUseCase — modificado)

```
PATCH /users/activate { userId }

1. Lógica existente (verifica permissão admin, atualiza status)
2. NOVO: Deleta login:locked:{userId} do Redis (garante sincronia do cache)
```

### 6. Fluxo de Suspensão pelo Admin (SuspendUserUseCase — modificado)

```
PATCH /users/suspend { userId }

1. Lógica existente ampliada para aceitar locked → suspended (além de activated → suspended)
2. Nenhuma alteração no Redis necessária (suspended não usa o cache de lock)
```

---

## Arquitetura — Artefatos por Camada

### Domain (user/)

| Artefato | Tipo | Ação |
|---|---|---|
| `user/domain/value-object/status.ts` | Value Object | Adicionar estado `locked` + transições |
| `user/domain/user.ts` | Entity | Adicionar `isSuperAdmin`, método `lock()`, getter `isLocked` |
| `user/domain/events/account-locked.event.ts` | Domain Event | **Novo** — payload: `{ userId, email, resetToken }` |

### Application (user/)

| Artefato | Tipo | Ação |
|---|---|---|
| `user/application/use-case/reset-password.usecase.ts` | Use Case | Modificar: checar `suspended`, desbloquear `locked` |
| `user/application/use-case/forgot-password.usecase.ts` | Use Case | Modificar: bloquear silenciosamente `suspended` |
| `user/application/use-case/active-user.usecase.ts` | Use Case | Modificar: limpar Redis lock cache |
| `user/application/use-case/suspend-user.usecase.ts` | Use Case | Modificar: aceitar `locked → suspended` |

### Application (session/)

| Artefato | Tipo | Ação |
|---|---|---|
| `session/application/use-case/authenticate.usecase.ts` | Use Case | Modificar: contador + lockout logic |

### Infra (user/)

| Artefato | Tipo | Ação |
|---|---|---|
| `user/infra/email/templates/account-locked-email.tsx` | React Email | **Novo** — template de alerta de bloqueio |
| `user/infra/notifications/send-account-locked-email.notification.ts` | Notification | **Novo** — subscriber do AccountLockedBySecurityEvent |

### Shared

| Artefato | Tipo | Ação |
|---|---|---|
| `shared/infra/cache/login-attempt-store.ts` | Interface | **Novo** — abstrai o contador Redis (incrementar, buscar, deletar) |
| `shared/infra/cache/redis-login-attempt-store.ts` | Impl Redis | **Novo** — implementação com TTL sliding |

### Prisma

| Artefato | Ação |
|---|---|
| `prisma/schema.prisma` | Adicionar `isSuperAdmin Boolean @default(false)` + valor `locked` no enum `UserStatus` |
| Migration | Adicionar coluna + atualizar enum + data migration: `UPDATE users SET is_super_admin = true WHERE email = 'admin@admin.com'` |

---

## Segurança

### Anti-enumeração
Todas as respostas de falha no login retornam `401 { "message": "Credenciais inválidas" }`, independente do motivo. O `ForgotPasswordUseCase` retorna `200` genérico para `suspended` e e-mails inexistentes — sem revelar o status da conta.

### Anti-timing attack
`bcrypt.compare()` executa em todos os casos (usuário inexistente, locked, senha errada). Nenhum "early return" antes do hash.

### Proteção do root admin
`user.isSuperAdmin === true` isenta o usuário do contador de tentativas e do bloqueio automático.

### Resiliência do Redis
Se o Redis estiver indisponível durante o login, o use case faz fallback para `user.status` no DB. O contador de tentativas é perdido durante a indisponibilidade — comportamento aceitável (preferível a bloquear logins legítimos).

### Edge case: suspensão durante token ativo
Se um token de reset foi gerado quando o status era `locked` e o admin muda para `suspended` antes do uso, o `ResetPasswordUseCase` revalida o status no momento da execução e rejeita com `InvalidTokenError`.

---

## Fora de Escopo

- MFA / CAPTCHA progressivo
- Desbloqueio automático por tempo (o bloqueio é permanente até ação explícita)
- Rate limiting por IP (já coberto pelo plugin HTTP existente)
- Log de auditoria de tentativas de login
- Notificação ao admin sobre contas bloqueadas
- SMS ou outros canais de notificação
