# Tarefas: Calendario de Feriados

**Spec:** `../specs/calendario-feriados-design.md`
**PRD:** `../prd/prd-calendario-feriados.md`

**Goal:** Entregar uma rota autenticada `/calendario` com item no menu principal e consulta client-only de feriados nacionais via BrasilAPI.

**Architecture:** A feature fica restrita ao frontend: o shell autenticado ganha o link, a rota `/calendario` renderiza a experiência visual aprovada e um hook de TanStack Query busca/normaliza feriados por ano diretamente da BrasilAPI. Nenhum backend, OpenAPI, migration ou persistência própria é alterado.

**Tech Stack:** node · Next.js App Router/React · Vitest com Testing Library (`pnpm --filter frontend exec vitest run <arquivo>`)

---

## Tarefas

- [ ] 1. Adicionar item Calendário ao menu autenticado [FR-001, FR-002, FR-003] → `task-01.md`
- [ ] 2. Criar consulta client-only de feriados nacionais [FR-004, FR-007, FR-008, FR-009, FR-010, FR-011] → `task-02.md`
- [ ] 3. Implementar tela autenticada de calendário por ano [FR-002, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011] → `task-03.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (sequential): 3

## Verificação da Barreira

Como a feature altera apenas o frontend e a mudança em `AuthenticatedShell` é aditiva (novo item no array de navegação, sem alterar assinatura/export do componente), a barreira deve validar:

- `pnpm --filter frontend lint:fix`
- `pnpm --filter frontend tsc:check`
- `pnpm --filter frontend test -- --run`
- `pnpm --filter frontend build`
- `pnpm biome:fix`
- `pnpm tsc:check`
- `pnpm test:run`
- `pnpm build`
