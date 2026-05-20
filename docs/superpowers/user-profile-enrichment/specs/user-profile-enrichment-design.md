---
created_at: "2026-05-20T19:45:33-03:00"
updated_at: "2026-05-20T19:45:33-03:00"
---

# Design: Enriquecimento do Perfil do Usuário

## Visão Geral

Reformulação da tela `/perfil` para exibir dados mais completos do usuário (data de cadastro e status da conta — campos já existentes no backend) e permitir edição do nome via modal. Nenhuma migration de banco de dados é necessária.

## Escopo

**Incluído:**
- Expor `createdAt` e `status` no endpoint `GET /users/me`
- Criar endpoint `PATCH /users/me` para atualização do nome
- Redesenhar a tela `/perfil` com layout enriquecido (cartão compacto, avatar com iniciais, grid de dados, badges)
- Modal "Editar perfil" com campo nome e link para `/perfil/senha`
- Regenerar shared API types

**Excluído:**
- Upload de foto de perfil
- Campos novos no banco (telefone, endereço, etc.)
- Edição de e-mail ou role
- Enriquecimento da tela pública `/perfil/[userId]`

## Arquitetura

### Abordagem: Clean Architecture Mínima

Dados de `createdAt` e `status` já existem na entidade `User` e na tabela Prisma — basta expô-los no response do controller existente sem criar novos Use Cases. O `PATCH /users/me` segue o padrão Clean Architecture do projeto com um Use Case enxuto.

---

## Seção 1 — Backend

### 1A. Enriquecer `GET /users/me`

**Arquivo:** `apps/backend/src/user/infra/controller/my-profile.controller.ts`

Adicionar `createdAt` e `status` ao objeto de resposta. Os dados já são retornados pelo `MyProfileUseCase` via entidade `User` — apenas incluir no payload serializado:

```ts
// Adição ao response atual
createdAt: user.createdAt,
status: user.status,
```

Nenhum Use Case novo. Nenhuma migration.

### 1B. Novo `PATCH /users/me`

**Use Case:** `apps/backend/src/user/application/use-case/update-profile.usecase.ts`
- Input: `{ userId: string, name: string }`
- Busca o usuário pelo ID; retorna `UserNotFoundError` se não encontrar
- Atualiza o nome e persiste via repositório
- Retorna `Either<UserNotFoundError, { name: string }>`

**Repositório:** `apps/backend/src/user/application/repository/user.repository.ts`
- Adicionar método `update(id: string, data: { name: string }): Promise<void>`
- Implementar em `InMemoryUserRepository` e `PrismaUserRepository`

**Controller:** `apps/backend/src/user/infra/controller/update-my-profile.controller.ts`
- Rota: `PATCH /users/me` (protegida por JWT)
- Body: `{ name: string }` (validado pelo schema Fastify)
- Responde `200 { name }` em sucesso; `404` se usuário não encontrado

**IoC:**
- Registrar símbolo em `user-types.ts`
- Binding em `user-container.ts`
- Wiring em `setup-user-module.ts`

---

## Seção 2 — Shared API Types

Após as mudanças no backend, executar:

```bash
pnpm generate:types
```

**Mudanças esperadas em `packages/api-types/index.d.ts`:**

| Endpoint | Mudança |
|---|---|
| `GET /users/me` | Response adiciona `createdAt: string` e `status: "ACTIVE" \| "INACTIVE" \| "SUSPENDED"` |
| `PATCH /users/me` | Novo endpoint: body `{ name: string }`, response `{ name: string }` |

Nenhuma alteração manual — tipos gerados automaticamente.

---

## Seção 3 — Frontend

### 3A. Redesenho de `/perfil`

**Arquivo:** `apps/frontend/src/app/(authenticated)/perfil/page.tsx`

Layout: cartão único compacto com:
- **Header:** avatar circular com iniciais geradas do nome + nome + e-mail + badges (role e status)
- **Grid 2×2:** ID (monospace, truncado), Data de cadastro (formatada pt-BR), Check-ins (destaque numérico em largura dupla)
- **Footer:** botão "Editar perfil" → abre `EditProfileModal`

Formatação de `createdAt`: `new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })`

Cores dos badges de status:
- `ACTIVE` → verde (`#166534` / `#4ade80`)
- `INACTIVE` → cinza
- `SUSPENDED` → vermelho

### 3B. Hook de mutação

**Arquivo:** `apps/frontend/src/features/profile/api/index.ts`

Novo hook `useUpdateProfile()`:
- Chama `PATCH /users/me` com `{ name }`
- Em sucesso: invalida query `profileQueryKeys.me()` para refetch automático
- Expõe `isPending` para estado de loading no botão "Salvar"

### 3C. Modal de edição

**Arquivo:** `apps/frontend/src/features/profile/components/EditProfileModal.tsx`

Conteúdo:
1. **Campo nome** — input controlado, pre-populado com nome atual, validado pelo `updateProfileSchema` existente
2. **Seção segurança** — item com label "Senha" e link navegável para `/perfil/senha` (dinâmico: "Definir senha" se `hasPassword === false`, "Alterar senha" se true)
3. **Botões** — "Cancelar" (fecha modal) e "Salvar" (submete mutação, fecha em sucesso)

---

## Seção 4 — Testes

### Backend

| Teste | Arquivo |
|---|---|
| `UpdateProfileUseCase` — atualiza nome com sucesso | `update-profile.usecase.test.ts` |
| `UpdateProfileUseCase` — retorna `UserNotFoundError` se usuário não existe | `update-profile.usecase.test.ts` |
| `MyProfileUseCase` — `createdAt` e `status` presentes no retorno | Atualizar teste existente |

### Frontend

| Teste | Arquivo |
|---|---|
| `useUpdateProfile` — envia PATCH e invalida query `profile.me` | `features/profile/api/index.test.ts` |
| `EditProfileModal` — renderiza campo nome, link senha, botões Cancelar/Salvar | `EditProfileModal.test.tsx` |

### Shared Types
Sem testes — validados via `tsc:check`.

---

## Gate de Conclusão

```bash
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
pnpm --filter backend test:run
pnpm --filter frontend tsc:check
pnpm --filter frontend test
pnpm build
```

Todos devem passar com zero erros antes de considerar a tarefa concluída.

---

## Convenções Aplicadas

- Either pattern para erros de negócio no Use Case
- Inversify IoC para wiring do novo Use Case e Controller
- `@/` alias para imports internos
- Kebab-case para arquivos, PascalCase para classes
- TanStack Query com invalidação de cache após mutação
- shadcn/ui + Tailwind CSS para componentes frontend
