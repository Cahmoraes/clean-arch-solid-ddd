# Tarefas: Home — Seção de Planos e Contato

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/home-planos-contato-design.md`
**PRD:** `../prd/prd-home-planos-contato.md`

**Goal:** Adicionar seção de planos (dados do backend via RSC + ISR) e seção de contato com formulário (react-hook-form + Zod + nodemailer) na página pública inicial da plataforma Volt.

**Architecture:** Backend expõe `GET /plans` (retorna DEMO_PLANS) e `POST /contact` (envia e-mail via nodemailer para contato@volt.com). Frontend usa RSC com ISR para planos (sem loading state) e Client Component para o formulário de contato. Componentes da home são independentes da tela interna `/assinatura`.

**Tech Stack:** Next.js 16 App Router (RSC + Client Components), Tailwind v4, shadcn/ui, react-hook-form, Zod, TanStack Query (`useMutation`), Fastify + Inversify IoC, nodemailer, Vitest + Testing Library + MSW.

---

## Tarefas

- [x] 1. Backend: endpoint `GET /plans` [FR-001] → `task-01.md`
- [x] 2. Backend: endpoint `POST /contact` [FR-014, FR-015] → `task-02.md`
- [x] 3. Frontend: componentes de planos (`PlanCardHero`, `PlanCardSecondary`, `PlansSectionHero`) [FR-002, FR-003, FR-006, FR-007, FR-016] → `task-03.md`
- [x] 4. Frontend: schema de contato + hook `useSendContact` [FR-009, FR-010] → `task-04.md`
- [ ] 5. Frontend: componentes `ContactSection` + `ContactForm` [FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-017] → `task-05.md`
- [ ] 6. Frontend: composição da home page + responsividade [FR-001, FR-004, FR-005, FR-007, FR-008, FR-016, FR-017, FR-018] → `task-06.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (parallel): 3, 4
- **Wave 3** (sequential): 5
- **Wave 4** (sequential): 6
