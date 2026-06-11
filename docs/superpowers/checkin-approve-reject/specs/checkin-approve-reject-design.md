---
created_at: "2026-05-08T14:28:50-03:00"
updated_at: "2026-05-08T14:28:50-03:00"
---

# Check-in Approve & Reject — Design Spec

## Problema

A página `/check-ins` e a página `/admin/check-ins` do frontend exibem o status dos check-ins mas não permitem que administradores tomem ações. O objetivo é adicionar a capacidade de aprovar e rejeitar check-ins pendentes (e reverter aprovações) diretamente pela interface.

---

## Decisões de Design

| Decisão | Escolha |
|---|---|
| O que significa "rejeitar" | Novo status `rejected` com histórico preservado |
| Onde aparecem os botões | Ambas as páginas: `/check-ins` e `/admin/check-ins` |
| Transições permitidas | `pending→validated`, `pending→rejected`, `validated→rejected` |
| Representação no banco | Campo `rejectedAt?: Date` na entidade + status computado |
| Padrão de implementação | Status Pattern (igual ao `UserStatus` do domínio de user) |

---

## Backend

### 1. Value Object: `CheckInStatus` (`check-in/domain/value-object/check-in-status.ts`)

Segue o mesmo padrão de `user/domain/value-object/status.ts`.

```
CheckInStatusTypes: "pending" | "validated" | "rejected"

abstract CheckInStatus
  abstract type: CheckInStatusTypes
  abstract validate(): Either<CheckInTimeExceededError | CheckInAlreadyRejectedError, true>
  abstract reject(): Either<never, true>

PendingStatus
  validate() → verifica janela de tempo → transição para ValidatedStatus (seta validatedAt)
  reject()   → transição para RejectedStatus (seta rejectedAt)

ValidatedStatus
  validate() → idempotente, retorna success
  reject()   → transição para RejectedStatus (seta rejectedAt, limpa validatedAt)

RejectedStatus
  validate() → failure(CheckInAlreadyRejectedError)
  reject()   → idempotente, retorna success

CheckInStatusFactory.create(checkIn, statusType): CheckInStatus
```

**Invariante garantida:** `validatedAt` e `rejectedAt` são mutuamente exclusivos.
- `ValidatedStatus.reject()` seta `rejectedAt` **e** limpa `validatedAt`
- `RejectedStatus.validate()` bloqueia a transição

### 2. Entidade `CheckIn` — alterações

- Remove `_isValidated: boolean` e o setter público de `validatedAt`
- Adiciona `_status: CheckInStatus` e `_rejectedAt?: Date`
- Expõe `_changeStatus(status: CheckInStatus)` — usado internamente pelo Status
- `validate()` e `reject()` delegam para `this._status`
- Propriedade computada `status: CheckInStatusTypes`
- `restore()` recebe `rejectedAt?: Date` e inicializa o status correto via `CheckInStatusFactory`
- `CheckInRestoreProps` e `CheckInCreateProps` atualizados

### 3. Novo erro: `CheckInAlreadyRejectedError`

- Arquivo: `check-in/domain/error/check-in-already-rejected-error.ts`
- HTTP status 422

### 4. Novo evento de domínio: `CheckInRejectedEvent`

- Arquivo: `check-in/domain/event/check-in-rejected-event.ts`
- Publicado dentro da entidade por `PendingStatus.reject()` e `ValidatedStatus.reject()` (seguindo o padrão de `CheckInCreatedEvent` publicado em `CheckIn.create()`)
- `RejectedStatus.reject()` **não** publica o evento (é idempotente — sem mudança de estado)

### 5. Novo Use Case: `RejectCheckInUseCase`

- Arquivo: `check-in/application/use-case/reject-check-in.usecase.ts`
- Recebe `{ checkInId: string }`
- Busca check-in por ID → chama `checkIn.reject()` → persiste → retorna `Either<CheckInNotFoundError, { rejectedAt: Date }>`
- **Sem limite de janela de tempo** — admin pode rejeitar a qualquer momento
- `reject()` é idempotente: rejeitar um check-in já rejeitado retorna success sem alterar o estado

### 6. Novo Controller: `RejectCheckInController`

- Arquivo: `check-in/infra/controller/reject-check-in.controller.ts`
- **PATCH `/check-ins/reject`** — `isProtected: true`, `onlyAdmin: true`
- Body: `{ checkInId: string }` (UUID)
- Response 200: `{ rejectedAt: ISOString }`
- Erros: 404 `CheckInNotFoundError`, 422 `CheckInAlreadyRejectedError`

### 7. Repositório

Sem mudança na interface — `save()` já persiste a entidade inteira.

Migração Prisma: adiciona coluna `rejectedAt DateTime?` na tabela `CheckIn`.

### 8. `GET /check-ins` — extensão

- O filtro de status passa a aceitar `"rejected"` além de `"pending"` e `"validated"`
- A resposta de cada item inclui o campo `status: "pending" | "validated" | "rejected"` calculado

### 9. Registro IoC

- Novo símbolo `CHECKIN_TYPES.RejectCheckInUseCase`
- Novo símbolo `CHECKIN_TYPES.RejectCheckInController`
- Bindings adicionados no container do módulo `check-in`
- Controller registrado no bootstrap

---

## Testes de Unidade (Backend)

### Entidade `CheckIn` — cenários obrigatórios

| Cenário | Verificação |
|---|---|
| `pending.reject()` | status = `"rejected"`, `rejectedAt` setado, `validatedAt` = undefined |
| `pending.validate()` | status = `"validated"`, `validatedAt` setado, `rejectedAt` = undefined |
| `validated.reject()` | status = `"rejected"`, `rejectedAt` setado, `validatedAt` limpo |
| `rejected.validate()` | retorna `failure(CheckInAlreadyRejectedError)` |
| `rejected.reject()` | idempotente — retorna success, estado não muda |
| Invariante mútua | nunca ambos `validatedAt` e `rejectedAt` setados simultaneamente |

### `RejectCheckInUseCase`

- Rejeita check-in pendente com sucesso
- Rejeita check-in validado com sucesso (reversão)
- Falha com `CheckInNotFoundError` para ID inexistente
- Falha com `CheckInAlreadyRejectedError` ao tentar rejeitar um já rejeitado

---

## Frontend

### Página `/check-ins`

Detecta se o usuário logado é admin via contexto de auth existente.

| Status do check-in | Usuário normal | Admin |
|---|---|---|
| `pending` | Badge amarelo "Pendente" | Badge + botões Aprovar + Rejeitar |
| `validated` | Badge verde "Validado" | Badge + botão Rejeitar |
| `rejected` | Badge cinza "Rejeitado" | Badge (sem ações) |

### Página `/admin/check-ins`

- Mostra check-ins `pending` e `validated` (acionáveis)
- Check-ins `rejected` ficam ocultos — já foram resolvidos
- **Pendente:** botões Aprovar + Rejeitar
- **Validado:** botão Rejeitar

### Novos arquivos/componentes

| Arquivo | Responsabilidade |
|---|---|
| `hooks/use-reject-check-in.ts` | Mutation `PATCH /check-ins/reject` com invalidação de cache |
| `components/check-in-actions.tsx` | Renderiza os botões corretos baseado em `status` + `isAdmin` |

### Badge de status

Estende o componente existente com variante `rejected` (cinza/neutro).

### API types (`@repo/api-types`)

- `CheckIn.status` atualizado para `"pending" | "validated" | "rejected"`
- Novo endpoint `PATCH /check-ins/reject`: body `{ checkInId: string }`, response `{ rejectedAt: string }`
- Gerado via `pnpm generate:types` após atualizar o backend

### Cache & estado

- `useRejectCheckIn` invalida `checkInsKeys.all` após sucesso
- Toast de sucesso ("Check-in rejeitado") e erro seguindo padrão do `ValidateButton` existente
- Botões desabilitados durante a operação (loading state)

---

## Fluxo de Dados

```
Admin clica "Rejeitar"
  → useRejectCheckIn.mutate({ checkInId })
  → PATCH /check-ins/reject
  → RejectCheckInController
  → RejectCheckInUseCase
  → checkIn.reject()              ← RejectedStatus.reject() ou PendingStatus.reject()
  → validatedAt limpo se necessário
  → CheckInRejectedEvent publicado
  → checkInRepository.save(checkIn)
  → response { rejectedAt }
  → cache invalidado
  → UI re-renderiza com badge "Rejeitado"
```

---

## Fora de Escopo

- Notificação para o usuário quando seu check-in for rejeitado
- Motivo/comentário ao rejeitar
- Histórico de mudanças de status (audit log completo)
