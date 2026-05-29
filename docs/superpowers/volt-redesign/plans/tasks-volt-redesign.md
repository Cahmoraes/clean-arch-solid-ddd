# Tarefas: VOLT Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended) or super.executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/volt-redesign-design.md`
**PRD:** `../prd/prd-volt-redesign.md`

**Goal:** Rebranding completo GymPass → VOLT e redesign do frontend fiel aos mockups do Claude Design, retheme via tokens mantendo shadcn/ui.

**Architecture:** Substituir a camada de tokens em `globals.css` pelo design VOLT (mapeado nos nomes semânticos `--color-*` que o shadcn já consome, com tokens estendidos), adicionar 3 fontes via `next/font/google`, e reconstruir os componentes/telas ricos com utilities Tailwind sobre esses tokens. Sem novas dependências; sem mudança de backend/API.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (`@theme`), shadcn/ui, next-themes, TanStack Query, Zustand, lucide-react, Vitest (happy-dom), Playwright.

---

## Tarefas

- [x] 1. Fundação de tokens VOLT + fontes + tema dark [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007] → `task-01.md`
- [x] 2. Rebranding GymPass → VOLT (marca, metadados, internos) [RF-008, RF-009, RF-010] → `task-02.md`
- [x] 3. Primitivos VOLT: BrandMark, Eyebrow, Avatar, RoleBadge/StatusBadge [RF-008, RF-017] → `task-03.md`
- [x] 4. Componentes de composição: SegmentedControl, PageHeader, SearchBar, StatCard [RF-016, RF-017, RF-018] → `task-04.md`
- [ ] 5. ThemeToggle deslizante (substitui o FAB) [RF-002] → `task-05.md`
- [ ] 6. Redesign do shell autenticado (sidebar dark + topbar + responsivo) [RF-011, RF-012, RF-013, RF-022] → `task-06.md`
- [ ] 7. Redesign do shell público + tela de Login [RF-014, RF-015, RF-023] → `task-07.md`
- [ ] 8. Redesign do Dashboard (stat-grid, week-chart, rank-list, atividade) [RF-016, RF-024] → `task-08.md`
- [ ] 9. Redesign Admin Usuários (page-header, segmented, search, user-row) [RF-017] → `task-09.md`
- [ ] 10. Redesign Admin Check-ins (segmented, checkin-row, ações inline) [RF-018] → `task-10.md`
- [ ] 11. Redesign Perfil (profile-card, metric-card, streak) [RF-019] → `task-11.md`
- [ ] 12. Redesign Assinatura (billing-banner, plan-grid) [RF-020] → `task-12.md`
- [ ] 13. Redesign Academias (gym-grid, gym-card) [RF-021, RF-024] → `task-13.md`
- [ ] 14. Polimento global: movimento, acessibilidade, responsividade e gate final [RF-025, RF-026, RF-027, RF-028] → `task-14.md`
