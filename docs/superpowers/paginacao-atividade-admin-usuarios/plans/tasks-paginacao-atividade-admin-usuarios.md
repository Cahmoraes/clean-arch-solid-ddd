# Tarefas: Paginação da Atividade no Admin

**Spec:** `../specs/paginacao-atividade-admin-usuarios-design.md`
**PRD:** N/A

**Goal:** Limitar o card de atividade do drawer em `/admin/usuarios` a 5 itens e criar uma nova rota com a lista completa paginada, reaproveitando o padrão já usado em `/perfil`.

**Architecture:** Estende o endpoint `GET /users/:userId/activity` (já existente, admin-only) para aceitar `page` e retornar `pagination` (hoje calculados e descartados). O frontend reaproveita 100% dos componentes já existentes (`ActivityTab`, `NumberedPagination`, hook `useUserActivity`) — sem nova abstração.

**Tech Stack:** Fastify + Inversify + Prisma (backend), Next.js 16 App Router + TanStack Query + shadcn/ui (frontend).

---

## Tarefas

- [x] 1. Backend: endpoint admin aceita `page` e retorna `pagination` → `task-01.md`
- [ ] 2. Frontend: hook `useUserActivity` encaminha `page` na variante admin → `task-02.md`
- [ ] 3. Frontend: card resumido no drawer de `/admin/usuarios` → `task-03.md`
- [ ] 4. Frontend: nova rota `/admin/usuarios/[userId]/atividade` → `task-04.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (parallel): 3, 4

## Verificação (barreira de integração)

O repo tem múltiplos configs de teste (`vitest.config.ts` por app + configs específicos do backend) — nenhum comando único cobre "a suíte inteira". Comandos relevantes para esta feature:

- Backend: `pnpm --filter backend test:run` (unitário) e `pnpm --filter backend test:business-flow` (HTTP/integração — cobre `get-user-activity.business-flow-test.ts`)
- Frontend: `pnpm --filter frontend test -- --run` (cobre `use-user-activity.test.tsx`, `user-detail-panel.test.tsx` e a nova `page.test.tsx`)
- Typecheck: `pnpm --filter backend tsc:check` e `pnpm --filter frontend tsc:check`
- Lint: `pnpm --filter backend biome:fix` e `pnpm --filter frontend lint:fix`
- Build: `pnpm --filter backend build` e `pnpm --filter frontend build`

## Notas de Reach (mudanças aditivas confirmadas)

- `use-user-activity.ts`: `perfil/page.tsx` e `activity-tab.tsx` importam apenas o tipo `UserActivityPagination` e a assinatura de `useUserActivity` — nenhum dos dois muda; a variante `"me"` (perfil) é inalterada.
- `user-detail-panel.tsx`: `UserDetailPanelProps` (consumida por `user-detail-container.tsx` e pelo teste de QA de outra feature) não muda — apenas o conteúdo interno da aba "Atividade" é alterado.
- `get-user-activity.controller.ts`: `user-module.ts` injeta `GetUserActivityController` pelo mesmo construtor — inalterado.
