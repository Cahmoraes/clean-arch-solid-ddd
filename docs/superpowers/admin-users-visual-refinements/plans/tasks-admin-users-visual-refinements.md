# Tarefas: Refinamentos Visuais — Listagem de Usuários (Admin)

**Spec:** `../specs/admin-users-visual-refinements-design.md`
**PRD:** `../prd/prd-admin-users-visual-refinements.md`

**Goal:** Corrigir três problemas visuais na tela `/admin/usuarios`: badges espremidos,
cor de seleção confusa entre destaque e marcado, e transição ausente no painel de
detalhes — mais o contraste do e-mail no destaque, achado durante a validação visual.

**Architecture:** Mudança puramente de apresentação em componentes React já existentes
(`UserRow`, `StatusBadge`, `UserDetailContainer`) e no tema Tailwind (`globals.css`).
Sem nova rota, endpoint ou schema. Três clusters de comportamento coesos: (1) badge de
status vira indicador de borda lateral; (2) estados de fundo do card (destaque vs.
marcado) se separam, com um novo token de cor neutro e ajuste de contraste do e-mail;
(3) um wrapper `AnimatedPanel` reutilizável anima a entrada/saída do painel fixo do
split-view, alinhado à duração já usada pelo `Sheet` mobile.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4 (tokens via `@theme`
em `globals.css`, sem `tailwind.config`) + shadcn/ui (Radix) · Vitest 4.1.5
(`environment: happy-dom`, `globals: true`, `setupFiles: src/test/setup.ts`) · pnpm
workspace `apps/frontend`. Comando de teste estreito confirmado (1 arquivo coletado):
rodar de dentro de `apps/frontend` com `pnpm exec vitest run <caminho-do-arquivo>`
(o script `pnpm test -- --run <arquivo>` do pacote NÃO estreita — coleta a suíte inteira).

---

## Tarefas

- [ ] 1. Status vira faixa lateral; badge de papel único [FR-001, FR-002] → `task-01.md`
- [ ] 2. Cor de seleção destaque vs. marcado + contraste do e-mail [FR-003, FR-004, FR-005] → `task-02.md`
- [ ] 3. Transição suave do painel de detalhes (split-view) [FR-006, FR-007] → `task-03.md`

## Ondas de Execução

Plano Medium, execução inline em uma única thread controladora — as três tasks rodam em
sequência, nunca em paralelo. Task 2 depende de Task 1 por tocarem o mesmo arquivo
(`user-row.tsx`); Task 3 é encadeada após a Task 2 para manter a execução puramente
sequencial deste tier, embora toque arquivos independentes das anteriores
(`user-detail-container.tsx` e um novo `animated-panel.tsx`).

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (sequential): 3
