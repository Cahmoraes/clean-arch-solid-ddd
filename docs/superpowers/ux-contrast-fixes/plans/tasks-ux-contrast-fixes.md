# Tarefas: ux-contrast-fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/ux-contrast-fixes-design.md`
**PRD:** N/A

**Goal:** Corrigir 4 substituições de token CSS para garantir contraste WCAG AA em dark e light mode.

**Architecture:** Substituição cirúrgica de tokens semânticos Tailwind — `text-foreground`/`text-muted-foreground` → `text-accent-foreground`/`text-accent-foreground/70` nos banners de demo, e adição de `hover:text-accent-foreground` no botão Entrar. Zero mudança de lógica ou estrutura.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, tokens semânticos em `globals.css`

---

## Tarefas

- [x] 1. Corrigir tokens de texto nos banners de demo (assinatura/page.tsx) → `task-01.md`
- [x] 2. Corrigir hover do botão Entrar (public/page.tsx) → `task-02.md`
- [x] 3. Verificação visual com playwright + quality gate → `task-03.md`
