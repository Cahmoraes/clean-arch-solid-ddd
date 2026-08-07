# Tarefas: Ícones Semânticos em Telas Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/admin-semantic-icons-design.md`
**PRD:** `../prd/prd-admin-semantic-icons.md`

**Goal:** Substituir botões e badges textuais por ícones semânticos em três áreas do admin (usuários, academias, check-ins), com acessibilidade completa (aria-label + tooltip) e um mapeamento de ícones centralizado.

**Architecture:** Duas peças de infraestrutura novas (`Tooltip` hand-built sobre `radix-ui`, `status-icon.ts` como fonte única de mapeamento status/ação→ícone) são construídas primeiro; em seguida `StatusBadge` é generalizado para o vocabulário de academias; por fim, cinco pontos de consumo (provider global + 4 componentes de feature) migram para as novas peças, em paralelo entre si por não compartilharem arquivo.

**Tech Stack:** Next.js (App Router), React, `radix-ui` (pacote unificado, sem instalação nova), `lucide-react`, `class-variance-authority`, Tailwind CSS v4, Vitest + Testing Library.

---

## Tarefas

- [ ] 1. Componente Tooltip (hand-built sobre radix-ui) → `task-01.md`
- [ ] 2. Mapeamento centralizado de ícones (status-icon.ts) → `task-02.md`
- [ ] 3. TooltipProvider na árvore de providers → `task-03.md`
- [ ] 4. StatusBadge — ícone semântico e vocabulário de academia [FR-003, FR-004] → `task-04.md`
- [ ] 5. Badge de status de academias usa StatusBadge compartilhado (list + grid) [FR-005] → `task-05.md`
- [ ] 6. Botão "Editar dados" ícone-só + tooltip [FR-001, FR-008] → `task-06.md`
- [ ] 7. Trigger "Mais ações" ícone-só + tooltip [FR-002, FR-007, FR-008] → `task-07.md`
- [ ] 8. Botões Aprovar/Rejeitar ícone-só + tooltip em check-ins [FR-006, FR-008] → `task-08.md`

<!-- FR-007 é uma restrição de não-mudança (RoleBadge e itens internos do dropdown continuam em texto); mapeada na task 7, que é o único ponto de código real adjacente a essa garantia (o trigger do dropdown que ela protege). RoleBadge não é tocado por nenhuma task — confirmado como fora de escopo na spec e no PRD. -->

## Verificação (barreira de integração)

O repo tem 9 configs de test-runner distintas (frontend + 5 no backend + 2 evidências de QA de outras features) — nenhum comando único roda "a suíte inteira". Este plano só toca `apps/frontend/`, então a barreira de integração de cada wave (e do plano completo) roda apenas a suíte do frontend, escopada por `apps/frontend/vitest.config.ts` (`include: src/**/*.{test,spec}.{ts,tsx}`):

```bash
pnpm --filter frontend test
```

Nenhuma outra config de teste do monorepo (backend, evidências de QA de `user-soft-delete`/`admin-analytics`) é afetada por esta feature — não precisa rodar.

## Nota sobre Reach (importadores fora do write-set)

`validate-tasks.cjs` reporta como *warning* (não erro) que os importadores de `status-badge.tsx`, `check-in-actions.tsx`, `providers.tsx`, `gym-row.tsx`, `gym-card.tsx`, `user-row.tsx` e `user-actions-footer.tsx` não estão no write-set de nenhuma task. Confirmado: todas as mudanças planejadas nesses arquivos são **aditivas** — nenhuma assinatura exportada (`StatusBadgeProps`, `CheckInActionsProps`, `Providers`, `GymRowProps`, `GymCardProps`, `UserRowProps`, `UserActionsFooterProps`) muda de forma; `statusTone()` em `user-row.tsx` é uma função interna (não exportada) — o tipo local `StatusTone` é alargado para incluir `"danger"` e o caso `"suspended"` passa a retornar esse valor, mas nada disso atravessa a fronteira exportada do módulo (`UserRow`/`UserRowProps` não mudam). Só o markup/lógica interna é substituído em cada arquivo. Nenhum importador precisa de alteração. O aviso sobre `tooltip.tsx` "sem arquivo de enrollment" é um falso positivo do heurístico de registry — `apps/frontend/src/components/ui/` não usa barrel file (`index.ts`); cada componente é importado diretamente pelo caminho próprio.

## Ondas de Execução

- **Wave 1** (parallel): 1, 2
- **Wave 2** (parallel): 3, 4
- **Wave 3** (parallel): 5, 6, 7, 8
