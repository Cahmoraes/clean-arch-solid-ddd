# Tarefas: gym-cards-animation

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-cards-animation-design.md`
**PRD:** `../prd/prd-gym-cards-animation.md`

**Goal:** Adicionar animações polidas de entrada/stagger, hover glow verde e blur-up de imagem nos cards de academias usando `motion/react` como única fonte de animações.

**Architecture:** `motion/react` substitui completamente os utilitários Tailwind `group-hover:*`, `hover:-translate-y-*` e `transition-*` no card e na imagem. O `ResultsList` em `GymResults` é convertido para `motion.ul/motion.li` com stagger e `AnimatePresence`. Um `GymCardSkeleton` dedicado com shimmer CSS puro substitui o `Skeleton` genérico no estado de loading. `MotionConfig reducedMotion="user"` na página raiz garante acessibilidade sem lógica extra nos componentes.

**Tech Stack:** motion/react (v11+), React 19, Next.js 16, Vitest (happy-dom), Biome

---

## Tarefas

- [ ] 1. Instalar motion/react, configurar MotionConfig e mock Vitest [FR-003, FR-005, FR-015] → `task-01.md`
- [ ] 2. Criar GymCardSkeleton e shimmer CSS [FR-010, FR-011, FR-012, FR-013] → `task-02.md`
- [ ] 3. Migrar hover do GymCard para motion/react [FR-004, FR-005, FR-006] → `task-03.md`
- [ ] 4. Migrar GymImage para motion.img com blur-up [FR-006, FR-007, FR-008, FR-009] → `task-04.md`
- [ ] 5. Adicionar stagger/AnimatePresence no GymResults [FR-001, FR-002, FR-003, FR-005, FR-013, FR-014, FR-015] → `task-05.md`

## Ondas de Execução

<!--
  Derived from each task's **Depends on:** field via topological grouping.
  task-01: N/A (infra, instala a lib)
  task-02: N/A (CSS + novo componente, não importa motion)
  task-03: task-01 (importa motion/react)
  task-04: task-01, task-03 (importa motion/react; GymCard precisa não ter mais o group para o hover não conflitar)
  task-05: task-01, task-02 (importa motion/react; usa GymCardSkeleton)
-->

- **Wave 1** (parallel): 1, 2
- **Wave 2** (parallel): 3, 5
- **Wave 3** (sequential): 4
