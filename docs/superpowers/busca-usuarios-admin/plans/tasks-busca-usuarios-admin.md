# Tarefas: Busca de Usuários por Nome ou Email (Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/busca-usuarios-admin-design.md`
**PRD:** N/A

**Goal:** Adicionar campo de busca server-side na rota `/admin/usuarios` que filtra usuários por nome ou email usando LIKE case-insensitive com paginação preservada.

**Architecture:** Adicionar `query?: string` em toda a cadeia backend (DAO interface → implementações → use case → controller). O frontend adiciona `useDebounce` + campo de busca na página, repassando o termo debounced ao hook `useUsers()` que inclui `query` no query param da chamada HTTP. Paginação reseta para página 1 a cada nova busca.

**Tech Stack:** Backend: Fastify, Inversify, Prisma (PostgreSQL), Zod, Vitest. Frontend: Next.js 16, React 19, TanStack Query, shadcn/ui Input, Vitest + Testing Library + MSW.

---

## Tarefas

- [x] 1. Backend DAO — Interface + UserDAOMemory → `task-01.md`
- [x] 2. Backend DAO — PrismaUserDAO → `task-02.md`
- [x] 3. Backend UseCase + Controller + testes de business flow → `task-03.md`
- [x] 4. Regenerar tipos da API (pnpm generate:types) → `task-04.md`
- [x] 5. Frontend — useDebounce + useUsers → `task-05.md`
- [x] 6. Frontend — AdminUsersPage UI de busca → `task-06.md`
