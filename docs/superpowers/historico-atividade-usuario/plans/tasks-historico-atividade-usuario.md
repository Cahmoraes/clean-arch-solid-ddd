## Tarefas: Histórico de Atividade do Usuário

**Spec:** `../specs/historico-atividade-usuario-design.md`
**PRD:** `../prd/prd-historico-atividade-usuario.md`

**Goal:** Popular a aba "Atividade" do modal de detalhes do usuário (visão admin) com um feed real combinando eventos de conta (login, senha, Google, bloqueio, perfil, role, status) e check-ins, ordenados por data decrescente, limitados aos últimos 20 itens.

**Architecture:** Write path — cada use case de conta publica um domain event no `DomainEventPublisher` já existente (direto ou religando eventos hoje órfãos via `user.subscribe()`); um subscriber único (`RecordUserActivitySubscriber`) grava a atividade formatada em pt-BR numa nova tabela `UserActivityEvent`, sem nunca propagar falha para a use case chamadora. Read path — um DAO faz merge entre `UserActivityEvent` e `CheckIn` por `userId`, ordena desc e limita a 20; uma use case de leitura expõe isso via `GET /users/:id/activity`; o frontend busca via hook React Query e agrupa por data com ícone por categoria no `ActivityTab`.

**Tech Stack:** TypeScript, Inversify (DI), Prisma, Fastify (rotas), Vitest, React + React Query, Tailwind, componentes do design system do projeto (`EmptyState`, `Tabs`), `lucide-react`.

---

## Tarefas

- [x] 1. Domain events novos: `LoginSucceededEvent`, `UserRoleChangedEvent`, `UserStatusChangedEvent` [FR-005, FR-010, FR-011] → `task-01.md`
- [x] 2. `authenticate.usecase.ts` publica `LoginSucceededEvent` no login por credenciais [FR-005] → `task-02.md`
- [x] 3. `authenticate-with-google.usecase.ts` publica `LoginSucceededEvent` e religa `GoogleAccountLinkedEvent` [FR-005, FR-007] → `task-03.md`
- [x] 4. `update-my-profile.usecase.ts` religa `UserProfileUpdatedEvent` [FR-009] → `task-04.md`
- [x] 5. `update-user-profile.usecase.ts` religa `UserProfileUpdatedEvent` [FR-009] → `task-05.md`
- [x] 6. `promote-to-admin.usecase.ts` publica `UserRoleChangedEvent` [FR-010] → `task-06.md`
- [x] 7. `demote-from-admin.usecase.ts` publica `UserRoleChangedEvent` [FR-010] → `task-07.md`
- [x] 8. `suspend-user.usecase.ts` publica `UserStatusChangedEvent` [FR-011] → `task-08.md`
- [x] 9. `active-user.usecase.ts` publica `UserStatusChangedEvent` [FR-011] → `task-09.md`
- [x] 10. `bulk-change-user-status.usecase.ts` publica `UserStatusChangedEvent` por usuário efetivamente alterado [FR-011] → `task-10.md`
- [x] 11. Modelo `UserActivityEvent` (Prisma + migration) + `UserActivityRepository` (interface + implementação Prisma) [FR-001] → `task-11.md`
- [x] 12. `RecordUserActivitySubscriber` — assina os 7 eventos, formata descrição pt-BR, grava, falha não propaga [FR-006, FR-007, FR-008, FR-009, FR-014] → `task-12.md`
- [x] 13. `UserActivityDao` (interface + implementação Prisma) — merge `UserActivityEvent` + `CheckIn`, ordena desc, limita 20 [FR-001, FR-012] → `task-13.md`
- [x] 14. `GetUserActivityUseCase` (leitura, limit 20) [FR-001, FR-002, FR-013] → `task-14.md`
- [ ] 15. `GET /users/:id/activity` — controller + rota + DI [FR-001] → `task-15.md`
- [ ] 16. Hook `use-user-activity` (React Query) [FR-001] → `task-16.md`
- [x] 17. `ActivityTab` — agrupamento por data + ícone por categoria [FR-002, FR-003, FR-004, FR-013] → `task-17.md`
- [ ] 18. `user-detail-panel.tsx` busca e passa `events` para `ActivityTab` [FR-001] → `task-18.md`

## Comandos de Verificação (barreira de integração)

O repositório tem 9 configs de test-runner distintas — nenhum comando único é "a suíte inteira". Este plano só toca os workspaces `apps/backend` e `apps/frontend`; a barreira de integração de cada wave deve rodar exatamente estes comandos (escopados às pastas afetadas), não uma suíte global:

- Backend, testes unitários/app-domain: `npx vitest run --config ./test/vite.config.app-domain.ts` (a partir de `apps/backend/`) — cobre tasks 1-14.
- Backend, testes de integração Prisma: `npx vitest run --config ./test/vite.config.integration.ts` (a partir de `apps/backend/`) — cobre tasks 11 e 13.
- Backend, testes business-flow/e2e: `npx vitest run --config ./test/vite.config.business-flow.ts` (a partir de `apps/backend/`) — cobre task 15.
- Frontend: `vitest run` (a partir de `apps/frontend/`) — cobre tasks 16-18.

Não afetados por este plano (não rodar como parte desta feature): `apps/backend/test/vite.config.contract.ts`, `apps/backend/test/vite.config.fitness.ts`, e os dois `vitest.config.ts` de evidência QA em `docs/superpowers/user-soft-delete/` e `docs/superpowers/admin-analytics/`.

## Ondas de Execução

- **Wave 1** (parallel): 1, 4, 11, 17
- **Wave 2** (parallel): 2, 3, 5, 6, 7, 8, 9, 10, 13
- **Wave 3** (parallel): 12, 14
- **Wave 4** (sequential): 15
- **Wave 5** (sequential): 16
- **Wave 6** (sequential): 18
