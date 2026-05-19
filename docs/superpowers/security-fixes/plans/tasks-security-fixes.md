# Tarefas: Security Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../../../../apps/backend/reports/security-review-2026-05-18.md`
**PRD:** N/A

> _Spec-only planning; no RF traceability available._

**Goal:** Corrigir as 2 vulnerabilidades HIGH (JWT key exposta no git + BOLA no MetricsController) e as 2 vulnerabilidades MEDIUM (rate limit ausente no reset-password + Swagger UI exposto em produção), mais a LOW (CRON_TIME_TO_UPDATE_CACHE sem default).

**Architecture:** Correções cirúrgicas em controllers existentes seguindo os padrões já estabelecidos no codebase (`UserProfileController` para ownership check, `ForgotPasswordController` para rate limit). A remoção da chave comprometida do git não requer mudança de arquitetura — apenas rotação do segredo, remoção do tracking e atualização do `.gitignore`.

**Tech Stack:** TypeScript, Fastify, Inversify, Zod, Vitest, Supertest

---

## Tarefas

- [x] 1. Rotação da PRIVATE_KEY e remoção dos .env do git → `task-01.md`
- [x] 2. Correção BOLA/IDOR no MetricsController → `task-02.md`
- [x] 3. Rate Limit no ResetPasswordController → `task-03.md`
- [x] 4. Swagger UI desabilitado em produção → `task-04.md`
- [x] 5. Default para CRON_TIME_TO_UPDATE_CACHE → `task-05.md`
