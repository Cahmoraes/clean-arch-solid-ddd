# Tarefas: Login Security Lockout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/login-security-lockout-design.md`
**PRD:** `../prd/prd-login-security-lockout.md`

**Goal:** Implementar bloqueio automático de conta após 3 tentativas de login inválidas, notificação por e-mail, desbloqueio via reset de senha ou ação admin, e substituição global de comparações `admin@admin.com` por campo `isSuperAdmin` no banco.

**Architecture:** O sistema usa Redis para rastrear o contador de tentativas (TTL deslizante de 15 min) e o estado de lock como cache de leitura rápida, enquanto o banco de dados (Prisma) é a fonte de verdade do status `locked`. O `AuthenticateUseCase` (session context) orquestra o bloqueio e dispara o `AccountLockedBySecurityEvent`, capturado pela nova notification que envia o e-mail com link de redefinição pré-gerado.

**Tech Stack:** TypeScript, Fastify, Inversify IoC, Prisma (PostgreSQL), Redis (via `CacheDB`), React Email, `DomainEventPublisher`, Either pattern.

---

## Tarefas

- [ ] 1. Prisma migration — `locked` no enum UserStatus + campo `isSuperAdmin` [RF-018, RF-019] → `task-01.md`
- [ ] 2. User domain — `isSuperAdmin` property + `LockedStatus` no State Pattern + método `lock()` [RF-002, RF-005, RF-016, RF-020] → `task-02.md`
- [ ] 3. Domain event `AccountLockedBySecurityEvent` [RF-008, RF-009] → `task-03.md`
- [ ] 4. `LoginAttemptStore` interface + `RedisLoginAttemptStore` + IoC [RF-001, RF-002, RF-003, RF-004] → `task-04.md`
- [ ] 5. `AuthenticateUseCase` — lógica de lockout completa [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007] → `task-05.md`
- [ ] 6. Eliminar `SUPER_ADMIN_EMAIL` magic string em promote/demote use cases [RF-017, RF-020] → `task-06.md`
- [ ] 7. `ForgotPasswordUseCase` — bloquear `suspended` silenciosamente [RF-012, RF-013] → `task-07.md`
- [ ] 8. `ResetPasswordUseCase` — desbloquear `locked` + rejeitar `suspended` [RF-011, RF-012, RF-013] → `task-08.md`
- [ ] 9. `ActiveUserUseCase` — limpar Redis lock ao ativar [RF-014, RF-015] → `task-09.md`
- [ ] 10. Template React Email `AccountLockedEmailTemplate` [RF-008, RF-009, RF-010] → `task-10.md`
- [ ] 11. `SendAccountLockedEmailNotification` + IoC + bootstrap [RF-008, RF-009, RF-010] → `task-11.md`
- [ ] 12. Validation gate — biome:fix + tsc:check + test:run + build [todos os RFs] → `task-12.md`
