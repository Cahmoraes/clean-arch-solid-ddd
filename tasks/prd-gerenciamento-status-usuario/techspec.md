# Tech Spec — Gerenciamento de Status de Usuário (Admin)

## Resumo Executivo

A funcionalidade expande o bounded context `user/` em dois eixos: **backend** e **frontend**. No backend, é criado o `SuspendUserController` (análogo ao `ActivateUserController` existente), o campo `status` é adicionado ao contrato do `UserDAO`/`FetchUsersUseCase`, e os UseCases de mudança de status passam a invalidar o cache Redis de listagem. No frontend, o componente `UserRow` ganha um badge de status, um novo modal `UserDetailModal` exibe detalhes e os controles de ação, e dois novos hooks de mutação (`useActivateUser`, `useSuspendUser`) consomem os endpoints PATCH com optimistic update + invalidação da query de listagem.

A abordagem reutiliza integralmente os artefatos existentes: `SuspendUserUseCase`, `ActiveUserUseCase`, padrão de controller com `BaseController`, IoC Inversify, shadcn/ui `Dialog` + `AlertDialog`, e TanStack Query.

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

**Backend (novos ou modificados):**

| Componente | Tipo | Ação |
|---|---|---|
| `SuspendUserController` | Controller | **Novo** — PATCH `/users/suspend`, `onlyAdmin: true` |
| `ActivateUserController` | Controller | **Modificado** — adicionar `onlyAdmin: true` (fix de segurança) |
| `UserRoutes.SUSPEND_USER` | Constante | **Novo** — `/users/suspend` |
| `USER_TYPES.Controllers.SuspendUser` | IoC Symbol | **Novo** |
| `userModule` | IoC Module | **Modificado** — bind `SuspendUserController` |
| `setupUserModule` | Bootstrap | **Modificado** — resolve `SuspendUserController` |
| `UserDAO` / `FetchUsersData` | Interface | **Modificado** — adicionar campo `status: StatusTypes` |
| `PrismaUserDAO` | DAO | **Modificado** — incluir `status` no select Prisma |
| `UserDAOMemory` | DAO | **Modificado** — incluir `status` em `CreateUserInput` e fakes |
| `FetchUsersUseCase` | UseCase | **Modificado** — propagar `status` no output |
| `SuspendUserUseCase` | UseCase | **Modificado** — invalidar cache Redis após update |
| `ActiveUserUseCase` | UseCase | **Modificado** — invalidar cache Redis após update |

**Frontend (novos ou modificados):**

| Componente | Tipo | Ação |
|---|---|---|
| `UserRow` | Component | **Modificado** — adicionar badge de status |
| `UserDetailModal` | Component | **Novo** — modal com detalhes e ações |
| `useActivateUser` | Hook | **Novo** — mutation PATCH `/users/activate` |
| `useSuspendUser` | Hook | **Novo** — mutation PATCH `/users/suspend` |
| `AdminUsersPage` | Page | **Modificado** — gerenciar estado do modal selecionado |
| `api-types` | Package | **Regenerado** — após exportar novo spec do backend |

**Fluxo de dados (ação de suspensão):**
```
Admin clica "Inativar" → AlertDialog confirma → useSuspendUser.mutate(userId)
  → PATCH /users/suspend { userId }
    → SuspendUserController → SuspendUserUseCase
      → userRepository.update(user.suspend())
      → cacheDB.delete(`fetch-users:*`) (todas as páginas)
      → 200 OK
  ← onSuccess: setQueryData (status local) + invalidateQueries (listagem)
```

---

## Design de Implementação

### Interfaces Principais

**Atualização do `UserDAO` e `FetchUsersData`:**

```typescript
// user/application/persistence/dao/user-dao.ts
export interface FetchUsersData {
  id: string
  role: RoleTypes
  status: StatusTypes   // <- novo campo
  createdAt: string
  name: string
  email: string
}
```

**`SuspendUserController` — mesma estrutura do `ActivateUserController`:**

```typescript
// isProtected: true, onlyAdmin: true
// Body: { userId: string (UUID) }
// Resposta: 200 OK | 400 | 401 | 403 | 422
```

**Hooks de mutação no frontend:**

```typescript
// features/admin/api/use-activate-user.ts
export function useActivateUser(): UseMutationResult<void, ApiError, string>

// features/admin/api/use-suspend-user.ts
export function useSuspendUser(): UseMutationResult<void, ApiError, string>
```

Ambos aplicam optimistic update no item do cache e invalidam `adminUsersQueryKey` após `onSettled`.

### Modelos de Dados

**`FetchUsersUseCaseOutput.data` (backend):**

Adicionar `status: StatusTypes` ao `FetchUsersData` no UseCase de output. Nenhuma migração de banco necessária — o campo `status` já existe na tabela `users`.

**`AdminUser` (frontend):**

Derivado automaticamente de `api-types` após regeneração. Passará a incluir `status: "activated" | "suspended"`.

### Endpoints de API

| Método | Rota | Guard | Corpo | Resposta |
|---|---|---|---|---|
| `GET /users` | Listagem | `isProtected` | query: `page`, `limit` | `{ users: FetchUsersData[], pagination }` — **com `status`** |
| `PATCH /users/activate` | Ativar | `isProtected, onlyAdmin` | `{ userId: UUID }` | `200` |
| `PATCH /users/suspend` | Suspender | `isProtected, onlyAdmin` | `{ userId: UUID }` | `200` |

---

## Pontos de Integração

**Redis Cache:**
- `FetchUsersUseCase` grava e lê em `fetch-users:{page}:{limit}`
- `SuspendUserUseCase` e `ActiveUserUseCase` devem injetar `CacheDB` e chamar `cacheDB.deleteByPattern("fetch-users:*")` (ou `cacheDB.delete` com chaves explícitas, dependendo da API disponível)
- Verificar se `CacheDB` expõe `deleteByPattern` ou somente `delete` — usar `delete` com wildcard ou iterar paginações conhecidas se necessário

**`api-types`:**
- Após implementar o backend, executar `pnpm generate:types` para regenerar `packages/api-types/index.d.ts`
- O frontend consume os tipos via `paths["/users"]["get"]["responses"][200]` — a atualização é automática

---

## Abordagem de Testes

### Testes Unidade

**Backend:**
- `SuspendUserUseCase` — já possui `suspend-user.usecase.test.ts`; verificar se cobre o caso de cache invalidation (adicionar cenário com `CacheDB` mockado)
- `ActiveUserUseCase` — idem para `active-user.usecase.test.ts`

**Frontend:**
- `useActivateUser` e `useSuspendUser` — testes com `renderHook` + MSW para mockar a API
- `UserDetailModal` — testes com `@testing-library/react`: renderização condicional dos botões por status e role, abertura do `AlertDialog` ao clicar "Inativar"
- `UserRow` — testar exibição do badge correto para cada valor de status

### Testes de Integração

**Backend (business-flow):**
- `suspend-user.business-flow-test.ts` (novo) — espelhando `activate-user.business-flow-test.ts`:
  - `200` ao suspender usuário existente
  - `401` sem JWT
  - `403` com JWT de não-admin
  - `400` com `userId` inválido
  - `422` com `userId` inexistente
- `activate-user.business-flow-test.ts` — adicionar cenário `403` para não-admin (cobrindo o fix de `onlyAdmin: true`)

### Testes de E2E

Não requeridos nesta fase — a cobertura de business-flow + unit tests é suficiente para o escopo. Playwright pode ser adicionado em iteração futura para o fluxo completo Admin.

---

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Backend — DAO e UseCase** (`FetchUsersData.status`, `PrismaUserDAO`, `UserDAOMemory`, cache invalidation em `SuspendUser`/`ActiveUser`) — fundação dos dados
2. **Backend — SuspendUserController + fix ActivateUserController** (nova rota, IoC, bootstrap) — expõe a API
3. **Regenerar `api-types`** (`pnpm generate:types`) — desbloqueia tipagem do frontend
4. **Frontend — hooks** (`useActivateUser`, `useSuspendUser`) — camada de dados isolada
5. **Frontend — `UserDetailModal`** (modal com AlertDialog de confirmação) — UI principal
6. **Frontend — `UserRow` badge** + **`AdminUsersPage`** (estado do modal selecionado)
7. **Testes** — unit + business-flow para todos os novos artefatos

### Dependências Técnicas

- Redis em execução (já provisionado via `compose.yaml`)
- `CacheDB` deve suportar deleção por padrão/wildcard — confirmar API disponível antes de implementar cache invalidation nos UseCases

---

## Monitoramento e Observabilidade

- O decorator `@Logger` já aplicado em `ActivateUserController.init()` deve ser replicado em `SuspendUserController.init()`
- Logs de warn já existentes em `FetchUsersUseCase` para falha de cache cobrem eventuais erros de invalidação
- Nenhum dashboard Grafana adicional requerido para este escopo

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Rota de suspensão | `PATCH /users/suspend` | Simetria com `/users/activate` — consistência da API |
| Confirmação de inativação | `AlertDialog` (shadcn/ui) | Componente já disponível no projeto, acessível e padronizado |
| Sincronização de estado | Optimistic update + invalidação | UX imediata no modal + eventual consistência na listagem |
| Cache invalidation | Backend nos UseCases | Garante consistência independente de qual cliente consome a API |

### Riscos Conhecidos

- **`CacheDB.deleteByPattern`**: verificar se a interface expõe deleção por wildcard ou se será necessário `delete` para múltiplas chaves manualmente. Se não disponível, implementar somente `delete` de páginas visitadas recentemente (risco baixo — TTL garante eventual consistência)
- **Optimistic update conflito**: se o request falhar após update optimista, o rollback via `onError` deve restaurar o estado anterior — TanStack Query suporta via `context` no `useMutation`

### Conformidade com Skills Padrões

As seguintes skills do projeto são relevantes para a implementação:

- `no-workarounds` — obrigatório ao corrigir o `onlyAdmin` ausente e na implementação do cache invalidation
- `systematic-debugging` — usar se houver falhas na invalidação de cache
- `tdd` — aplicar para os novos UseCases e hooks
- `react` — guia de padrões para `UserDetailModal` e hooks de mutação
- `shadcn` — para uso correto de `Dialog` e `AlertDialog`
- `tanstack-query-best-practices` — para optimistic update e invalidação de queries

### Arquivos relevantes e dependentes

**Backend:**
- `apps/backend/src/user/application/persistence/dao/user-dao.ts`
- `apps/backend/src/user/application/use-case/suspend-user.usecase.ts`
- `apps/backend/src/user/application/use-case/active-user.usecase.ts`
- `apps/backend/src/user/application/use-case/fetch-users.usecase.ts`
- `apps/backend/src/user/infra/controller/activate-user.controller.ts`
- `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`
- `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts`
- `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- `apps/backend/src/bootstrap/setup-user-module.ts`

**Frontend:**
- `apps/frontend/src/features/admin/api/use-users.ts`
- `apps/frontend/src/features/admin/components/user-row.tsx`
- `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- `packages/api-types/index.d.ts` (gerado)
