# Tarefas: Google Social Login

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/google-social-login-design.md`
**PRD:** `../prd/prd-google-social-login.md`

**Goal:** Permitir que usuários se cadastrem e façam login via conta Google, sem necessidade de senha.

**Architecture:** Novo `AuthenticateWithGoogleUseCase` no bounded context `session` recebe um ID Token do Google, valida via `GoogleAuthProvider` (abstração), resolve o usuário (busca, vincula ou cria), e emite JWTs da aplicação. A entidade `User` passa a suportar `googleId` opcional e `password` opcional, mantendo a invariante de que ao menos um método de autenticação deve existir.

**Tech Stack:** google-auth-library, Fastify, Inversify, Prisma, Zod, Vitest

---

## Tarefas

- [x] 1. Schema Prisma + Variável de Ambiente [RF-011, RF-012] → `task-01.md`
- [x] 2. Value Object GoogleId + Erros de Domínio + Evento [RF-003, RF-004, RF-010, RF-011] → `task-02.md`
- [x] 3. Entidade User — suporte a googleId e password opcional [RF-007, RF-008, RF-009, RF-012, RF-013, RF-014] → `task-03.md`
- [x] 4. Repositórios — userOfGoogleId + password nullable [RF-007, RF-008, RF-011] → `task-04.md`
- [ ] 5. GoogleAuthProvider — abstração e implementações [RF-003, RF-004] → `task-05.md`
- [ ] 6. AuthenticateWithGoogleUseCase [RF-001, RF-002, RF-007, RF-008, RF-009, RF-010] → `task-06.md`
- [ ] 7. Controller + Rotas + IoC + Business Flow Tests [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-015] → `task-07.md`
