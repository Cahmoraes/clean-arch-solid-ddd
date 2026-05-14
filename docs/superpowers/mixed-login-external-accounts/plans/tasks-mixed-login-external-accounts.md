# Tarefas: mixed-login-external-accounts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/mixed-login-external-accounts-design.md`
**PRD:** `../prd/prd-mixed-login-external-accounts.md`

**Goal:** Desbloquear o fluxo de senha para contas autenticadas por provider externo sem perder o fluxo atual de troca de senha e sem criar contas duplicadas.

**Architecture:** O backend fica dividido em duas frentes: primeiro corrigir o fluxo atual de senha/login local; depois expor capacidades de credencial, endurecer o linking por provider e adicionar o fluxo autenticado de reautenticação + definição da primeira senha. O frontend consome os novos contratos OpenAPI para trocar entre “Definir senha” e “Alterar senha”, enquanto a cobertura final usa um seam determinístico de desenvolvimento para validar a jornada mista com Playwright sem depender do popup real do Google.

**Tech Stack:** Fastify, Inversify, Zod, Google Auth Provider in-memory para dev/test, Redis/CacheDB, Next.js 16, React 19, TanStack Query, React Hook Form, `@repo/api-types`, Vitest, Playwright

---

## Tarefas

- [x] 1. Endurecer fluxos atuais de senha e login local [RF-008, RF-009, RF-010] → `task-01.md`
- [ ] 2. Expor capacidades de credencial e bloquear linking inseguro [RF-001, RF-011] → `task-02.md`
- [ ] 3. Implementar reautenticação e definição da primeira senha no backend [RF-004, RF-005, RF-006, RF-007, RF-012, RF-013] → `task-03.md`
- [ ] 4. Regenerar contratos e adaptar frontend de perfil, senha e login [RF-002, RF-003, RF-007, RF-010, RF-012] → `task-04.md`
- [ ] 5. Cobrir a jornada mista com testes determinísticos e Playwright [RF-007, RF-012, RF-013] → `task-05.md`

