# Tarefas: Security Hardening — Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** N/A — originado do relatório `apps/backend/reports/security-review-2026-05-11.md`
**PRD:** N/A

> Spec-only planning; no RF traceability available.

**Goal:** Corrigir 12 vulnerabilidades de segurança identificadas no relatório de revisão de 2026-05-11, indo de CRITICAL (bcrypt fraco, escalada de privilégio) até LOW (headers Nginx, portas Docker).

**Architecture:** Correções cirúrgicas em controllers, env schema, auth adapter e arquivos de configuração. Nenhuma nova abstração introduzida — cada fix é um patch mínimo no local exato do achado.

**Tech Stack:** TypeScript, Fastify 5, Zod 4, jsonwebtoken 9, bcryptjs 3, Inversify, Prisma, Docker Compose, Nginx

---

## Tarefas

- [x] 1. Corrigir bcrypt cost factor inseguro (PASSWORD_SALT=2) → `task-01.md`
- [x] 2. Remover campo `role` do schema público de criação de usuário → `task-02.md`
- [x] 3. Limpar credenciais Supabase expostas no .env.example → `task-03.md`
- [x] 4. Corrigir CORS para allowlist explícita via CORS_ORIGINS → `task-04.md`
- [x] 5. Corrigir IDOR no UserProfileController → `task-05.md`
- [x] 6. Adicionar `onlyAdmin: true` ao FetchUsersController → `task-06.md`
- [x] 7. Restringir algoritmo JWT a HS256 → `task-07.md`
- [x] 8. Remover JWT default key inseguro ('private-key-example') → `task-08.md`
- [x] 9. Aumentar comprimento mínimo de senha de 6 para 8 chars → `task-09.md`
- [x] 10. Restringir portas Docker ao loopback (127.0.0.1) → `task-10.md`
- [x] 11. Adicionar security headers ao Nginx → `task-11.md`
- [x] 12. Mover @faker-js/faker para devDependencies → `task-12.md`
