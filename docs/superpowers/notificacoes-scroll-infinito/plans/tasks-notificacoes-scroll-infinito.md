# Tarefas: Scroll Infinito no Dropdown de Notificações

**Spec:** `../specs/notificacoes-scroll-infinito-design.md`
**PRD:** `../prd/prd-notificacoes-scroll-infinito.md`

**Goal:** Adicionar scroll infinito ao dropdown de notificações do header: carga inicial de 10 itens, lotes seguintes de 5, reconciliando com notificações em tempo real (SSE) sem re-buscar dados já carregados.

**Architecture:** Backend estende `GET /api/v1/notifications` com `offset`/`limit` opcionais (retrocompatível com `page`). Frontend migra `useNotifications` de `useQuery` para `useInfiniteQuery`, com sentinela `IntersectionObserver` disparando `fetchNextPage` e reconciliação de SSE via `queryClient.setQueryData` no cache paginado.

**Tech Stack:** Node.js/TypeScript monorepo (Turborepo + pnpm). Backend: Fastify + Prisma + Inversify (Clean Architecture/DDD), testado com Vitest (`pnpm --filter backend test`). Frontend: Next.js + TanStack Query v5 + `openapi-fetch`, testado com Vitest + happy-dom (`pnpm --filter frontend test -- --run`).

---

## Tarefas

- [x] 1. Backend: suportar `offset`/`limit` em `GET /api/v1/notifications`, preservando `page` [FR-012, FR-013] → `task-01.md`
- [x] 2. Frontend: migrar `useNotifications` para `useInfiniteQuery` com paginação por offset/limit [FR-002, FR-003, FR-004, FR-005] → `task-02.md`
- [x] 3. Frontend: retry automático silencioso ao falhar a busca de um lote [FR-010, FR-011] → `task-03.md`
- [x] 4. Frontend: reconciliar notificações recebidas via SSE no cache paginado [FR-006, FR-007] → `task-04.md`
- [x] 5. Frontend: sentinela de scroll + spinner de rodapé no dropdown [FR-001, FR-008, FR-009] → `task-05.md`

## Verificação

Nenhuma task altera assinatura obrigatória/breaking — `offset`/`limit` (task-01) são campos opcionais aditivos em `FindManyNotificationsInput`/`GetNotificationsInput`, e os demais consumidores de `notification.repository.ts` (`mark-as-read`, `mark-all-as-read`, `get-unread-count`, o event handler de check-in) não passam nem precisam desses campos — continuam funcionando sem alteração. `notification-item.tsx` e `authenticated-shell.tsx` consomem apenas tipos/props que não mudam de forma (o formato de `NotificationItem` e a API pública de `NotificationBell` ficam estáveis).

Comandos de verificação completos (nenhum comando único cobre a suíte inteira neste monorepo):

- Backend, unitário/uso: `pnpm --filter backend test` (ou `pnpm --filter backend test:run`)
- Backend, fitness/dependências: `pnpm --filter backend test:fitness && pnpm --filter backend fit:validate-dependencies`
- Frontend, unitário: `pnpm --filter frontend test -- --run`
- Lint/tipos (obrigatório antes de finalizar, por `AGENTS.md`): `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
- Build final: `pnpm --filter backend build && pnpm --filter frontend build`

## Ondas de Execução

<!-- Nota: task-04 modifica o mesmo arquivo que a task-03 (use-notifications.ts, ver task-04 "Visão Geral")
     — depende de task-03, não de task-02, para evitar conflito de escrita em execução paralela. -->

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (parallel): 3, 5
- **Wave 4** (sequential): 4
