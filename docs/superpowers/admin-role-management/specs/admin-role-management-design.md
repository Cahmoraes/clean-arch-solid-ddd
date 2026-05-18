---
created_at: "2026-05-18T12:32:50-03:00"
updated_at: "2026-05-18T12:32:50-03:00"
---

# Admin Role Management

Permite que administradores promovam usuários comuns ao papel de administrador e revoguem privilégios de administradores existentes, diretamente pelo painel `/admin/usuarios`.

## Contexto

A tela `/admin/usuarios` lista todos os usuários do sistema. Ao clicar em um usuário, um modal exibe seus detalhes e os botões de ativar/inativar. Esta feature adiciona uma seção "Permissões" ao modal com ações de gerenciamento de role.

O sistema já possui um admin fixo (`admin@admin.com`) que não pode ter seus privilégios removidos por nenhuma ação.

---

## Regras de Negócio

### Promoção a Administrador (`promote-to-admin`)

- Requer que o usuário alvo esteja com `status = activated`
- Requer que o role atual seja `MEMBER`
- O email `admin@admin.com` nunca pode ser alvo desta ação (já é admin permanente)
- Somente administradores autenticados podem executar esta ação

### Remoção de Administrador (`demote-from-admin`)

- Requer que o usuário alvo tenha `role = ADMIN`
- O email `admin@admin.com` é protegido — não pode ser demovido
- Um administrador não pode remover seus próprios privilégios (auto-demoção proibida)
- Somente administradores autenticados podem executar esta ação

---

## Arquitetura

### Backend

Dois novos Use Cases dedicados, seguindo o padrão existente de `activate-user` e `suspend-user`:

#### `PromoteToAdminUseCase`
- **Entrada:** `{ userId: string }`
- **Saída:** `Either<PromoteToAdminError, { userId: string }>`
- **Validações:** usuário existe, está ativo, é MEMBER, não é admin@admin.com
- **Efeito:** chama `user.updateRole("ADMIN")`, persiste via repositório, publica `UserRoleChangedEvent`

#### `DemoteFromAdminUseCase`
- **Entrada:** `{ userId: string, requesterId: string }`
- **Saída:** `Either<DemoteFromAdminError, { userId: string }>`
- **Validações:** usuário existe, é ADMIN, não é admin@admin.com, não é o próprio requester
- **Efeito:** chama `user.updateRole("MEMBER")`, persiste via repositório, publica `UserRoleChangedEvent`

#### Novos Controllers

| Controller | Rota | Proteção |
|---|---|---|
| `PromoteToAdminController` | `PATCH /users/promote-admin` | `isProtected: true`, `onlyAdmin: true` |
| `DemoteFromAdminController` | `PATCH /users/demote-admin` | `isProtected: true`, `onlyAdmin: true` |

Ambos recebem `{ userId: string }` no body e retornam `200` com `{ userId }` em caso de sucesso.

#### Novos Erros de Domínio

| Classe | Situação |
|---|---|
| `UserAlreadyAdminError` | Tentar promover usuário já administrador |
| `UserIsNotAdminError` | Tentar demover usuário que não é administrador |
| `UserIsSuperAdminError` | Tentar operar sobre `admin@admin.com` |
| `UserIsNotActiveError` | Tentar promover usuário inativo — **criar novo** |
| `CannotDemoteSelfError` | Admin tentando se auto-demover |

#### Modificações na Entidade `User`

Adicionar método `updateRole(role: RoleTypes): void` que substitui o VO `Role` interno. O método é uma mutação direta no agregado, compatível com o padrão `Observable` existente.

#### IoC

- Novos símbolos em `src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Novos bindings em `src/shared/infra/ioc/module/user/user-module.ts`
- Wiring em `src/bootstrap/setup-user-module.ts`

---

### Frontend

#### Novos Hooks (`src/features/admin/api/`)

**`use-promote-to-admin.ts`**
- Chama `PATCH /users/promote-admin` com `{ userId }`
- Optimistic update: atualiza `role` para `"ADMIN"` no cache `admin-users`
- Rollback automático em erro
- Invalida `ADMIN_USERS_QUERY_KEY` ao concluir

**`use-demote-from-admin.ts`**
- Chama `PATCH /users/demote-admin` com `{ userId }`
- Optimistic update: atualiza `role` para `"MEMBER"` no cache `admin-users`
- Rollback automático em erro
- Invalida `ADMIN_USERS_QUERY_KEY` ao concluir

#### Modificações em `user-detail-modal.tsx`

Nova seção **"Permissões"** adicionada abaixo da seção "Gerenciar Status":

```
── Gerenciar Status ──────────────────────
  [Inativar Usuário]  (regras existentes)
  [Ativar Usuário]    (regras existentes)

── Permissões ────────────────────────────
  [⭐ Tornar Administrador]  (condicionado)
  [🔻 Remover Administrador] (condicionado)
```

**Regras de visibilidade dos novos botões:**

| Botão | Condição de exibição |
|---|---|
| "Tornar Administrador" | `status === "activated"` AND `role === "MEMBER"` |
| "Remover Administrador" | `role === "ADMIN"` AND `user.id !== loggedUser.id` AND `user.email !== "admin@admin.com"` |

**Confirmações (AlertDialog):**

- **Tornar Administrador:** "Tornar administrador? [nome] terá acesso total ao painel administrativo. Esta ação pode ser revertida." — botão de confirmação azul.
- **Remover Administrador:** "Remover privilégios de admin? [nome] perderá acesso ao painel administrativo e voltará a ser membro." — botão de confirmação laranja.

**Tratamento de erros:** erros da API são exibidos inline no modal (padrão já existente).

---

## Fluxo de Dados

```
[Admin clica "Tornar Admin"]
  → AlertDialog de confirmação
  → Confirmar
  → usePromoteToAdmin.mutate(userId)
  → Optimistic update: role → "ADMIN" no cache
  → PATCH /users/promote-admin { userId }
  → Backend: valida + persiste + publica evento
  → 200 OK → invalida cache admin-users
  → Modal atualiza exibição (badge + botões)
```

---

## Tratamento de Erros

| Erro HTTP | Causa | Exibição |
|---|---|---|
| 400 `UserAlreadyAdminError` | Usuário já é admin | Mensagem inline no modal |
| 400 `UserIsNotAdminError` | Alvo não é admin | Mensagem inline no modal |
| 400 `UserIsSuperAdminError` | Operação sobre admin@admin.com | Mensagem inline no modal |
| 400 `UserIsNotActiveError` | Promoção de usuário inativo | Mensagem inline no modal |
| 400 `CannotDemoteSelfError` | Auto-demoção | Mensagem inline no modal |
| 401 | Não autenticado | Redirect para login |
| 403 | Não é admin | Mensagem inline no modal |

---

## Testes

### Backend — Unit (`*.test.ts`)

**`PromoteToAdminUseCase`:**
- ✅ Promove membro ativo com sucesso
- ❌ Retorna erro se usuário não existe
- ❌ Retorna erro se usuário está inativo
- ❌ Retorna erro se usuário já é admin
- ❌ Retorna erro se email é admin@admin.com

**`DemoteFromAdminUseCase`:**
- ✅ Demove admin com sucesso
- ❌ Retorna erro se usuário não existe
- ❌ Retorna erro se usuário não é admin
- ❌ Retorna erro se email é admin@admin.com
- ❌ Retorna erro se userId === requesterId (auto-demoção)

### Backend — Business Flow (`*.business-flow-test.ts`)

- ✅ `PATCH /users/promote-admin` autenticado como admin → 200
- ✅ `PATCH /users/demote-admin` autenticado como admin → 200
- ❌ Sem autenticação → 401
- ❌ Autenticado como MEMBER → 403
- ❌ Promover admin@admin.com → 400
- ❌ Demover a si mesmo → 400

### Frontend — Unit (Vitest)

- `usePromoteToAdmin`: optimistic update aplicado, rollback em erro da API
- `useDemoteFromAdmin`: optimistic update aplicado, rollback em erro da API
- `UserDetailModal`: renderiza "Tornar Admin" para membro ativo, "Remover Admin" para admin não-self não-superadmin, nenhum para usuário inativo, nenhum para admin@admin.com
