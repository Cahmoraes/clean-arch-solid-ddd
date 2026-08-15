# Tarefas: Histórico de Atividade no Perfil

**Spec:** `../specs/historico-atividade-perfil-design.md`
**PRD:** `../prd/prd-historico-atividade-perfil.md`

**Goal:** Expor o histórico de atividades do usuário autenticado em `GET /users/me/activity` (mirror do endpoint admin) e apresentar esse feed na tela `/perfil`, transformada em página tabbed ("Visão geral" | "Atividade"), reutilizando integralmente o read path e o componente de feed já existentes.

**Architecture:** Backend ganha um controller próprio `GetMyActivityController` em `/users/me/activity` (`isProtected: true`, `userId` de `req.user.sub.id`) que delega ao `GetUserActivityUseCase` existente — sem tocar no write path nem no endpoint admin. Frontend move `ActivityTab`, `activity-format` e `useUserActivity` para o módulo compartilhado `features/activity/`, generaliza o hook para `userId` opcional (`undefined` → `/users/me/activity`), e a página `/perfil` passa a renderizar abas com o feed lazy-load na aba "Atividade".

**Tech Stack:** Backend: Fastify, Inversify, zod, OpenAPI (openapi-typescript). Frontend: Next.js, React, TanStack Query, shadcn/ui (Tabs, Card), Tailwind, vitest + MSW.

---

## Tarefas

- [x] 1. Endpoint `GET /users/me/activity` no backend [FR-002, FR-003] → `task-01.md`
- [x] 2. Mover `ActivityTab` e helpers de formatação para `features/activity/` [FR-004, FR-005, FR-008, FR-009, FR-010, FR-011, FR-012] → `task-02.md`
- [x] 3. Mover e generalizar o hook `useUserActivity` para `features/activity/` [FR-002, FR-007] → `task-03.md`
- [x] 4. Página `/perfil` tabbed com aba "Atividade" [FR-001, FR-003, FR-006, FR-007] → `task-04.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (sequential): 3
- **Wave 3** (sequential): 4

## Barreira de Integração (por wave)

Não há um único comando de suite completo no repo (9 configurações de runner). A barreira de integração roda, uma vez por wave, o conjunto completo abaixo nos workspaces afetados — nunca repita esses comandos dentro dos steps das tasks:

- Backend (`apps/backend`): `pnpm --filter backend biome:fix`, `pnpm --filter backend tsc:check`, `pnpm --filter backend test:run`, `pnpm --filter backend test:business-flow`, `pnpm --filter backend build`
- Frontend (`apps/frontend`): `pnpm --filter frontend lint:fix`, `pnpm --filter frontend tsc:check`, `pnpm --filter frontend test`, `pnpm --filter frontend build`
- Wave 1 também valida o contrato OpenAPI: `pnpm generate:types` (executado no Step 9 da task-01) seguido de `pnpm --filter backend test:contract` e `pnpm --filter backend tsc:check`.