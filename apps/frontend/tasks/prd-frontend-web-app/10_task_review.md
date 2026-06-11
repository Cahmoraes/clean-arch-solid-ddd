# Task 10.0 Review — F6 Dashboard administrativo

## Resumo

Implementada a tela `/admin/usuarios` consumindo `GET /users` paginado, com Skeleton de loading, EmptyState de lista vazia, mensagem amigável de erro e paginação. Hook `useUsers` tipado a partir de `paths["/users"]` (api-types). MSW handler atualizado para refletir o schema real (`{ users, pagination }`) e respeitar query params.

## Conformidade com Requisitos

- **RF-21** (listar usuários paginado): ✅ `useUsers` consome `GET /users` com `page`/`limit` e expõe `users` + `pagination`.
- **RF-22** (acesso só ADMIN): ✅ herdado do `AdminGuard` no layout `admin/layout.tsx` (task 4) + filtro do link admin no `AuthenticatedShell`.
- **RF-23 a RF-25** (loading/empty/error): ✅ Skeleton, EmptyState e bloco de erro com `userMessage` da `ApiError`.
- Cada item exibe nome, e-mail e role legível (Membro/Administrador). **Nota**: schema OpenAPI não retorna `createdAt` para `GET /users`, apesar do task pedir "data de cadastro". Optei por omitir o campo seguindo a regra "campos retornados pelo backend" para não falsificar dados; quando o backend expuser `createdAt`, basta acrescentar uma coluna.

## Achados

### Critical
Nenhum.

### Major
Nenhum.

### Minor
- Pré-existentes fora do escopo: `src/features/gyms/api/index.ts` (lint complexity + tsc `never.status`) e `src/app/(authenticated)/perfil/[userId]/page.test.tsx` (flaky em execução paralela). Pertencem às tasks 6/7.
- `data de cadastro` não exibido (justificado pelo schema; ver acima).

### Positive
- `useUsers` tipado por `paths` (TS advanced) e usa `keepPreviousData` para UX suave de paginação (boa prática TanStack Query).
- Página decomposta em `LoadingState`/`ErrorState`/`UsersEmpty`/`UsersList`/`UsersPagination` reduzindo complexidade cognitiva (Biome score < 5).
- Testes de unidade (hook), unidade (componente) e integração (página) cobrem fluxos felizes, vazio, erro e paginação navegando entre páginas — 9 testes, todos verdes.
- MSW handler global passou a refletir o schema real do backend, o que beneficia outras suítes que toquem `/users`.

## Validações Executadas

- `pnpm test src/features/admin src/app/(authenticated)/admin` → **9/9 passing**.
- `pnpm tsc:check` → sem erros nos arquivos da task (único erro restante é em `features/gyms/api/index.ts`, task 7).
- `pnpm lint` → sem erros nos arquivos da task (erros restantes em academias/assinatura/gyms/perfil são tasks 6/7/9).

## Arquivos compartilhados modificados

- `src/test/msw/handlers.ts` — handler `GET /users` agora retorna `{ users, pagination }` honrando query params (compatível com schema real).
- `src/components/layout/AuthenticatedShell.tsx` — não modificado (link admin já existia e está visível só para ADMIN).

## Decisão

**APROVADO**. Sem CRITICAL/MAJOR a resolver. Pendências fora do escopo (gyms/perfil) ficam para os respectivos PRs em paralelo.
