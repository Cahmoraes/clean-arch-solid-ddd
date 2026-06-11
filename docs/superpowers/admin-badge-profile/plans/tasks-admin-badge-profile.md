# Tarefas: admin-badge-profile

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/admin-badge-profile-design.md`
**PRD:** N/A

Spec-only planning; no RF traceability available.

**Goal:** Exibir um badge "ADMIN" (ícone escudo + texto) ao lado do título "Meu perfil" na página `/perfil`, visível somente para usuários com `role === 'ADMIN'`.

**Architecture:** Criar o componente presentacional `AdminBadge` em `src/components/ui/`. Na `ProfilePage`, ler `user.role` do `useAuthStore` (Zustand, síncrono) e renderizar o badge condicionalmente. Nenhuma alteração de backend ou chamada extra à API é necessária.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Vitest + Testing Library + MSW

---

## Tarefas

- [x] 1. Criar componente AdminBadge → `task-01.md`
- [x] 2. Integrar AdminBadge na página de perfil → `task-02.md`
