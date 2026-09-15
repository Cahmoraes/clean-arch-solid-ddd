# Tarefas: Modernização do layout de usuários

**Spec:** `../specs/user-management-layout-design.md`
**PRD:** `../prd/prd-user-management-layout.md`

**Goal:** Modernizar a rota de usuários com split-view desktop, drawer responsivo, filtros claros, detalhe contextual e acessibilidade preservando os contratos existentes.

**Architecture:** Reutilizar a composição atual da rota admin, hooks TanStack Query e componentes shadcn/Tailwind. Separar a evolução por clusters de comportamento para manter tarefas independentes onde possível e integrar a página somente após os componentes estarem prontos.

**Tech Stack:** node · Next.js 16.2.4 · React 19.2.4 · shadcn/ui · Tailwind CSS v4 · TanStack Query 5.100.14 · Vitest 4.1.5/happy-dom · MSW 2.14.2 · Playwright 1.59.1

As alterações de props são aditivas e opcionais; os importadores históricos em artefatos de
QA não precisam ser modificados. A barreira usa o conjunto de comandos frontend abaixo,
sem executar os runners de backend não relacionados:

- `pnpm --filter frontend lint:fix`
- `pnpm --filter frontend tsc:check`
- `pnpm --filter frontend test -- --run`
- `pnpm --filter frontend build`
- `pnpm --filter frontend exec playwright test e2e/admin-user-management-layout.spec.ts`

---

## Tarefas

- [ ] 1. Refinar filtros segmentados e busca de usuários [FR-001, FR-002, FR-003, FR-004] → `task-01.md`
- [ ] 2. Implementar seleção persistente e navegação da lista [FR-005, FR-006, FR-007, FR-008] → `task-02.md`
- [ ] 3. Organizar painel de detalhe e abas de contexto [FR-009, FR-010, FR-011] → `task-03.md`
- [ ] 4. Adaptar detalhe para drawer responsivo e restauração de foco [FR-012, FR-013, FR-014] → `task-04.md`
- [ ] 5. Integrar estados, anúncios acessíveis e cobertura final da página [FR-015, FR-016] → `task-05.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3
- **Wave 2** (sequential): 4
- **Wave 3** (sequential): 5
