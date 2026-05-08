# Tarefas: Check-in Approve & Reject

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/checkin-approve-reject-design.md`
**PRD:** `../prd/prd-checkin-approve-reject.md`

**Goal:** Adicionar aprovação e rejeição de check-ins para administradores, com novo status `rejected`, padrão Status no domínio e botões de ação nas duas páginas do frontend.

**Architecture:** Backend usa padrão Status (igual ao UserStatus) para encapsular transições de estado na entidade CheckIn, garantindo invariância mútua entre `validatedAt` e `rejectedAt`. Frontend adiciona `useRejectCheckIn` hook, componente `CheckInActions` e atualiza ambas as páginas de check-in para exibir ações administrativas.

**Tech Stack:** TypeScript, Fastify, Prisma, Inversify, Zod, Next.js 15, TanStack Query, Zustand, shadcn/ui, Sonner (toasts)

---

## Tarefas

- [x] 1. Erros de domínio e eventos [RF-005] → `task-01.md`
- [x] 2. Value Object CheckInStatus (padrão Status) [RF-005, RF-006, RF-007, RF-008] → `task-02.md`
- [x] 3. Refatorar entidade CheckIn + testes de unidade [RF-005, RF-006, RF-007, RF-008] → `task-03.md`
- [x] 4. Atualizar repositório: interface + InMemory [RF-005] → `task-04.md`
- [x] 5. Migração Prisma: coluna rejected_at [RF-005] → `task-05.md`
- [x] 6. Atualizar PrismaCheckInRepository [RF-005] → `task-06.md`
- [x] 7. RejectCheckInUseCase + testes [RF-001, RF-002, RF-003, RF-004] → `task-07.md`
- [x] 8. RejectCheckInController + rota [RF-001, RF-002, RF-003] → `task-08.md`
- [x] 9. FetchCheckInsUseCase + ListCheckInsController: status no DTO e filtro rejected [RF-013, RF-014] → `task-09.md`
- [x] 10. IoC + bootstrap: registrar RejectCheckIn [RF-001] → `task-10.md`
- [x] 11. Frontend: camada de API (extended-paths + useRejectCheckIn) [RF-001, RF-002, RF-003, RF-004] → `task-11.md`
- [x] 12. Frontend: componente CheckInActions + badge Rejeitado [RF-009, RF-010, RF-011, RF-012, RF-017, RF-018, RF-019] → `task-12.md`
- [x] 13. Frontend: página /check-ins com ações de admin [RF-009, RF-010, RF-011, RF-012] → `task-13.md`
- [x] 14. Frontend: página /admin/check-ins com Aprovar + Rejeitar [RF-013, RF-014, RF-015, RF-016] → `task-14.md`
