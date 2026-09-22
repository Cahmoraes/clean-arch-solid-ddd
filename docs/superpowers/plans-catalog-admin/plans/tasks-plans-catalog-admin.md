# Tarefas: Cadastro de Planos de Assinatura (Admin)

**Spec:** `../specs/plans-catalog-admin-design.md`
**PRD:** `../prd/prd-plans-catalog-admin.md`

**Tech Stack:** Backend: Node.js + TypeScript, Clean Architecture (Fastify HTTP layer via `HttpServer.register`, Prisma ORM), test runner Vitest. Narrow (single-file) form, confirmed by running it (collected exactly 1 file) — run from `apps/backend`: unit tests `npx vitest --run --config ./test/vite.config.app-domain.ts <path/to/file.test.ts>`; business-flow (HTTP) tests `npx vitest --run --config ./test/vite.config.business-flow.ts <path/to/file.business-flow-test.ts>` (same `--config <path> <file>` CLI shape as the confirmed app-domain form — inferred, not independently re-run against this second config; spot-check before relying on it at scale). `pnpm --filter backend test:fitness` for fitness functions (whole-suite fitness command, not narrowed per file). Frontend: Next.js + TypeScript, TanStack Query, react-hook-form + zod, shadcn/ui, test runner Vitest com `happy-dom`. Narrow form, confirmed by running it (collected exactly 1 file) — run from `apps/frontend`: `npx vitest run <path/to/file.test.tsx>`. Do not use `pnpm --filter backend test:run -- <path>` or `pnpm --filter frontend test -- --run <path>` to target a single file — `--filter`/`--` can swallow or misinterpret the path before the runner sees it (measured: collected the whole suite while naming one file).

---

## Tarefas

- [ ] 1. Entidade de domínio `Plan` [FR-001, FR-002, FR-003, FR-008] → `task-01.md`
- [ ] 2. Schema Prisma `Plan` + migration + seed [FR-001] → `task-02.md`
- [ ] 3. `PlanRepository` (interface, Prisma, InMemory) [FR-001, FR-004, FR-006, FR-007, FR-009, FR-010] → `task-03.md`
- [ ] 4. Criar plano — use case + `POST /admin/plans` [FR-001, FR-003, FR-012] → `task-04.md`
- [ ] 5. Editar plano — use case + `PUT /admin/plans/:id` [FR-004, FR-005, FR-012] → `task-05.md`
- [ ] 6. Inativar/reativar plano — use cases + `PATCH /admin/plans/:id/inactivate` e `/reactivate` [FR-006, FR-007, FR-008, FR-012] → `task-06.md`
- [ ] 7. Listar todos os planos (admin) — use case + `GET /admin/plans` [FR-009, FR-012] → `task-07.md`
- [ ] 8. Listar planos ativos (público) — use case + refatorar `GET /plans` [FR-010, FR-011] → `task-08.md`
- [ ] 9. Frontend: schema zod + hooks TanStack Query + mocks MSW de planos [FR-001, FR-002, FR-003, FR-004, FR-006, FR-007, FR-009] → `task-09.md`
- [ ] 10. Frontend: página `/admin/planos` (grid de cards, ações editar/inativar/reativar) [FR-009, FR-006, FR-007] → `task-10.md`
- [ ] 11. Frontend: formulário de criação/edição de plano (dialog) [FR-001, FR-002, FR-003, FR-004, FR-005] → `task-11.md`
- [ ] 12. Frontend: remover `DEMO_PLANS` e conectar `/assinatura` e a home a `GET /plans` [FR-010, FR-011] → `task-12.md`

## Restrições Globais

- `GET /plans` mantém exatamente o contrato `{ id, name, priceId, priceLabel, tagline, features[] }[]` (spec, "Características Arquiteturais" e "Endpoints")
- Nenhum endpoint permite exclusão física (hard delete) de `Plan` — a única forma de removê-lo da oferta é inativação via `is_active` (spec, Decisão D4)
- `PUT /admin/plans/:id` nunca altera `is_active` — mudança de status ocorre só pelas rotas `PATCH .../inactivate` e `PATCH .../reactivate` (spec, "Endpoints")
- Toda rota administrativa é registrada com `{ isProtected: true, onlyAdmin: true }` (spec, Decisão D3; convenção do repo)
- Todo arquivo novo do backend segue o layout `domain/ → application/ → infra/` e o IoC de 3 passos (service-identifier, container module, bootstrap) já padronizado em `apps/backend/AGENTS.md` (spec, "Manutenibilidade")
- `Plan.price_cents` é um inteiro em centavos, nunca negativo (spec, Decisão D2)

## Foco de Revisão

- `price_cents = 0` é um plano gratuito válido e não deve ser rejeitado pela validação de preço não-negativo → `task-01`
- Editar (`PUT`), inativar ou reativar um `id` de plano inexistente retorna um erro "não encontrado" explícito, nunca uma falha silenciosa ou um 500 → `task-05`
- O seed da migration não duplica os planos em reexecuções (idempotência) → `task-02`
- `GET /plans` com todos os planos inativos retorna uma lista vazia, não um erro → `task-08`
- Um usuário autenticado sem papel de admin recebe 403 (não 401) ao chamar qualquer rota `/admin/plans` → `task-04`
