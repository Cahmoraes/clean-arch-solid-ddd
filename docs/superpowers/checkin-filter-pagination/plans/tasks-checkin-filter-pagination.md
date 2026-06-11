# Tarefas: Filtro e Paginação de Check-ins

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/checkin-filter-pagination-design.md`
**PRD:** `../prd/prd-checkin-filter-pagination.md`

**Goal:** Adicionar filtro por status (pills) e paginação via URL search params nas telas de check-ins do usuário (`/check-ins`) e do admin (`/admin/check-ins`).

**Architecture:** Novo hook `useCheckInFilters` lê/escreve `status` e `page` via `useSearchParams` + `useRouter` do Next.js. Novo componente stateless `CheckInFilterBar` renderiza os pills com shadcn/ui `Button`. Ambas as páginas são atualizadas para usar o hook + componente, envoltas em `<Suspense>` (obrigatório para `useSearchParams` no App Router). O backend já suporta os params `status` e `page` — nenhuma mudança backend necessária.

**Tech Stack:** Next.js App Router, React (`Suspense`, `useCallback`), TanStack Query (`keepPreviousData`), shadcn/ui `Button`, Vitest + Testing Library.

---

## Tarefas

- [x] 1. Hook `useCheckInFilters` — leitura/escrita de filtro e página via URL [RF-006, RF-007, RF-010, RF-011, RF-012, RF-013] → `task-01.md`
- [x] 2. Componente `CheckInFilterBar` — pills de filtro por status [RF-001, RF-002, RF-003] → `task-02.md`
- [x] 3. Tela de check-ins do usuário — integrar filtro, paginação URL e empty state contextual [RF-004, RF-005, RF-008, RF-009, RF-014] → `task-03.md`
- [x] 4. Tela de check-ins do admin — integrar filtro, paginação e empty state contextual [RF-004, RF-005, RF-008, RF-009, RF-014] → `task-04.md`
