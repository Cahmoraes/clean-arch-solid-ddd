---
created_at: "2026-05-31T09:30:00-03:00"
updated_at: "2026-05-31T09:30:00-03:00"
status: "ready-for-planning"
---

# Design Spec — Soft Delete de Usuário (Admin)

## Contexto

O painel de detalhes do usuário (`admin-user-detail-panel`) expõe a ação "Excluir", hoje
**desabilitada** porque não existe endpoint de exclusão no backend. Esta spec define a
implementação do **soft delete** (exclusão lógica): o usuário é marcado como excluído e
desaparece de todas as leituras da aplicação, mas permanece no banco para auditoria/recuperação.

A decisão por soft delete (em vez de hard delete) foi tomada pelo usuário para preservar
histórico e evitar violações de integridade referencial (check-ins, assinaturas).

## Objetivo

Permitir que um administrador exclua (logicamente) uma conta de usuário a partir do painel de
detalhes, com confirmação. Após a exclusão, o usuário some das listagens, das estatísticas e não
consegue mais autenticar — mas seus dados e relacionamentos permanecem íntegros no banco.

## Decisões (já acordadas)

1. **Soft delete**, não hard delete. O usuário "fica excluído mas não é deletado totalmente do banco".
2. **Bloquear auto-exclusão**: um admin não pode excluir a própria conta (evita lockout).
3. **Proteger super admin**: contas com `is_super_admin = true` não podem ser excluídas, nem por outro admin.
4. **Abordagem técnica**: campo `deleted_at DateTime?` no model `User` (mesma convenção já usada em
   `UserNotification`), preservando o State pattern de `status` (activated/suspended/locked). Soft
   delete é uma dimensão ortogonal ao status funcional, não um novo valor de status.
5. **Filtro no ponto único das leituras do repositório**: filtrar `deleted_at = null` em
   `userOfId`/`userOfEmail`/`userOfGoogleId`/`get` faz com que os ~22 call-sites (incluindo login,
   perfil, mutações) ignorem usuários excluídos automaticamente, sem alterar cada caso de uso.

## Estado atual do código (já existe — reutilizar)

- `DeleteUserUseCase` em `src/user/application/use-case/delete-user.usecase.ts` — **hoje faz HARD
  delete** e bloqueia exclusão se houver check-ins. Será reescrito para soft delete + guardas.
- `UserRepository.delete(user)` na interface, com implementações Prisma, InMemory e SQLite (hard delete).
- Testes unitários em `delete-user.usecase.test.ts` (precisarão ser atualizados).
- Binding `USER_TYPES.UseCases.DeleteUser` já registrado em `user-module.ts`.
- Erros de padrão já existentes para espelhar: `CannotDemoteSelfError`, `UserIsSuperAdminError`.

**Falta**: campo `deleted_at`, lógica de soft delete no domínio/repos, filtros de leitura,
`DeleteUserController` + rota + bootstrap, e toda a integração frontend.

## Backend — Mudanças

### 1. Schema Prisma + migração
- Adicionar `deleted_at DateTime? @map("deleted_at")` ao model `User`.
- Gerar migração (`prisma migrate dev --create-only`) + `prisma generate`.
- Aplicar com `prisma:migrate:dev` (requer Postgres ativo).

### 2. Entidade `User` (`src/user/domain/user.ts`)
- Campo `_deletedAt?: Date`; incluir em `UserConstructor`, `restore()` e `toPrimitive()`.
- Método `delete()` que marca `_deletedAt = new Date()` (e, se aplicável, `notify()` de
  `UserDeletedEvent`).
- Getter `isDeleted: boolean` (`this._deletedAt != null`).

### 3. Repositórios (Prisma, InMemory, SQLite)
- **Leituras** (`userOfId`, `userOfEmail`, `userOfGoogleId`, `get`): filtrar `deleted_at = null`
  (Prisma `where: { deleted_at: null }`; SQLite `WHERE deleted_at IS NULL`; InMemory `.filter`).
- **Soft delete**: o `DeleteUserUseCase` marca `user.delete()` e chama `update(user)` (que persiste
  `deleted_at`). O método físico `delete()` pode ser mantido para uso administrativo futuro ou removido.

### 4. DAOs (`prisma-user-dao.ts`, `user-dao-memory.ts`)
- `fetchAndCountUsers`: adicionar `deleted_at: null` à `buildWhereClause` (Prisma) e ao filtro (InMemory).
- `countUserStats`: excluir `deleted_at != null` de **todas** as contagens (total/members/admins/active/inactive).

### 5. `DeleteUserUseCase` (reescrita)
- Input: `{ userId: string; requesterId: string }`.
- Guardas (ordem):
  1. `userId === requesterId` → `CannotDeleteSelfError` (novo erro).
  2. `userOfId(userId)` ausente → `UserNotFoundError`.
  3. `user.isSuperAdmin` → `CannotDeleteSuperAdminError` (novo erro, ou reusar `UserIsSuperAdminError`).
- Ação: `user.delete()` + `update(user)` (soft delete). **Remover** o bloqueio por check-ins (não há
  mais violação de FK).
- Invalidar caches: `deleteByPattern("fetch-users:*")` + `delete(USER_STATS_CACHE_KEY)`.
- Publicar `UserDeletedEvent` (opcional, se houver consumidores).

### 6. Camada HTTP
- `DeleteUserController`: `DELETE /users/:userId`, `isProtected: true`, `onlyAdmin: true`.
  - `userId` do path param; `requesterId` de `req.user.sub.id`.
  - Mapear erros: `CannotDeleteSelfError`/`CannotDeleteSuperAdminError` → 403/409;
    `UserNotFoundError` → 404; sucesso → 204 (No Content) ou 200.
- Constante `UserRoutes.DELETE = `${PREFIX}/:userId``.
- Binding `USER_TYPES.Controllers.DeleteUser` + registro em `setup-user-module.ts`.

### 7. Login / autenticação
- Coberto automaticamente: `authenticate.usecase.ts` faz `userOfEmail` → com o filtro de leitura,
  usuário excluído retorna `null` → `InvalidCredentialsError`. Idem Google login (`userOfGoogleId`/`userOfEmail`).
- Adicionar teste explícito garantindo que usuário soft-deleted não autentica.

### 8. Testes backend
- Atualizar `delete-user.usecase.test.ts`: soft delete (usuário some das leituras), guardas
  (self, super admin), check-ins **não** bloqueiam mais.
- `delete-user.business-flow-test.ts`: 401 sem token; 403 user comum; 403/409 auto-exclusão e super admin;
  204 sucesso; usuário some do `GET /users` e do `GET /users/stats`.
- Testes de repositório/DAO: leituras e contagens ignoram soft-deleted.

## Frontend — Mudanças

### 1. Tipos
- `pnpm generate:types` após o backend, expondo `DELETE /users/{userId}`.

### 2. Hook `useDeleteUser`
- Local: `src/features/admin/api/use-delete-user.ts`.
- Mutation `DELETE /users/{userId}`; `onSettled` invalida `ADMIN_USERS_QUERY_KEY` + `USER_STATS_QUERY_KEY`.
- Tratar erros (403 auto-exclusão/super admin) com mensagem amigável.

### 3. Diálogo de confirmação
- Adicionar diálogo destrutivo em `confirmation-dialogs.tsx` (padrão `AlertDialog` já usado para
  suspender/promover/revogar). Texto enfático ("Esta ação não pode ser desfeita pela interface").

### 4. Botão "Excluir" (`user-actions-footer.tsx`)
- Habilitar; abrir confirmação; ao confirmar, chamar `useDeleteUser`.
- Ocultar/desabilitar contextualmente quando o alvo for o próprio admin logado ou um super admin
  (espelhar as guardas do backend para evitar erro previsível).
- Após sucesso, limpar a seleção e fechar o painel (o usuário some da lista).
- **Já corrigido nesta sessão (visual)**: a borda verde (variant default `primary`) e o texto;
  o botão atualmente está desabilitado com tooltip "Exclusão de usuário disponível em breve".

### 5. Testes frontend
- `use-delete-user.test.ts` (sucesso, invalidação de queries, erro 403).
- `user-actions-footer.test.tsx`: botão habilitado abre confirmação; oculto para self/super admin.

## Pontos de atenção

- **Migração**: requer Postgres ativo (`docker:up` + `prisma:migrate:dev`).
- **`generate:types`**: exporta o spec OpenAPI do backend (pode exigir o backend de pé).
- **Filtro de leitura é transversal**: validar via testes de regressão que nenhum fluxo legítimo
  (perfil próprio, mutações admin sobre usuários ativos) quebra. O `DeleteUserUseCase` busca o
  usuário via `userOfId` **antes** de marcá-lo como excluído, então o fluxo de exclusão funciona.
- **Reexclusão**: excluir um usuário já excluído → `userOfId` retorna `null` → `UserNotFoundError` (idempotência aceitável).

## Fora de Escopo

- Tela/fluxo de restauração de usuários excluídos (pode ser feature futura).
- Hard delete / purga definitiva (LGPD/retenção) — feature separada.
- Anonimização de dados pessoais do usuário excluído.
- Exclusão em massa (multi-seleção).

## Validação (gates)

- Backend: `biome:fix` + `tsc:check` + `test:run` + `test:business-flow` + `build` + `fit:validate-dependencies`.
- Frontend: `lint:fix` + `tsc:check` + `test` + `build`.
