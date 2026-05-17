# Tarefas: Forgot Password

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/forgot-password-design.md`
**PRD:** `../prd/prd-forgot-password.md`

**Goal:** Implementar recuperação de senha esquecida end-to-end: backend (2 Use Cases, 2 Controllers, token Redis, email) + frontend (2 páginas) + email template HTML.

**Architecture:** Bounded context `user/` recebe os novos Use Cases e Controllers, seguindo os padrões de `DefinePasswordUseCase` (CacheDB + Redis) e `SendPasswordAlertEmailNotification` (domainEvent + React Email). Token de reset (256-bit CSPRNG) armazenado como SHA-256 hash no Redis com TTL de 15 minutos. Sessões revogadas via extensão do `RevokedTokenDAO` com chave user-level no Redis.

**Tech Stack:** Node.js, TypeScript, Fastify, Inversify IoC, Redis (ioredis/CacheDB), `@react-email/render`, React, Next.js 16, TanStack Query, react-hook-form + zod, shadcn/ui.

---

## Tarefas

- [x] 1. Extend RevokedTokenDAO para revogação em massa por usuário [RF-012] → `task-01.md`
- [x] 2. PasswordResetTokenStore – interface e implementação Redis [RF-003, RF-004, RF-005, RF-010] → `task-02.md`
- [x] 3. ForgotPasswordUseCase + testes unitários [RF-001, RF-002, RF-003, RF-004, RF-006, RF-007] → `task-03.md`
- [x] 4. ResetPasswordUseCase + testes unitários [RF-008, RF-009, RF-010, RF-011, RF-012, RF-013] → `task-04.md`
- [x] 5. Email template + SendPasswordResetEmailNotification + bootstrap [RF-014, RF-015, RF-016] → `task-05.md`
- [x] 6. Controllers, rotas, rate-limit config e IoC wiring [RF-001, RF-002, RF-007, RF-008, RF-009] → `task-06.md`
- [x] 7. Business flow tests (HTTP integration) [RF-001, RF-002, RF-006, RF-007, RF-008, RF-009, RF-010, RF-012, RF-013] → `task-07.md`
- [x] 8. Gerar tipos compartilhados (@repo/api-types) → `task-08.md`
- [ ] 9. Frontend – página /recuperar-senha + link na página de login [RF-017, RF-018, RF-023] → `task-09.md`
- [ ] 10. Frontend – página /redefinir-senha [RF-019, RF-020, RF-021, RF-022] → `task-10.md`
