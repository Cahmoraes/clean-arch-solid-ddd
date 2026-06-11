# Tarefas: Migração Winston → Pino

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/winston-to-pino-migration-design.md`
**PRD:** N/A

**Goal:** Substituir o WinstonAdapter pelo PinoAdapter na camada de infra do backend, mantendo a interface Logger inalterada e integrando a instância Pino ao Fastify.

**Architecture:** A instância raiz Pino é criada por uma factory e registrada no container IoC como singleton. O PinoAdapter envolve essa instância e implementa a interface Logger existente. A mesma instância é passada ao Fastify para request logging nativo. Zero mudanças fora da camada de infra compartilhada.

**Tech Stack:** pino, pino-pretty (dev), Inversify IoC, Fastify, TypeScript, Vitest

---

## Tarefas

- [x] 1. Instalar pino e remover winston → `task-01.md`
- [x] 2. Criar PinoLoggerFactory → `task-02.md`
- [x] 3. Criar PinoAdapter → `task-03.md`
- [x] 4. Atualizar IoC (shared-types + infra-module) → `task-04.md`
- [x] 5. Integrar Pino no FastifyAdapter → `task-05.md`
- [x] 6. Remover WinstonAdapter e validação final → `task-06.md`
