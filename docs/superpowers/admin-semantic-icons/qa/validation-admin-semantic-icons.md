# Ícones Semânticos em Telas Admin - Independent Validation

**Date**: 2026-08-07
**Spec**: docs/superpowers/admin-semantic-icons/specs/admin-semantic-icons-design.md
**PRD**: docs/superpowers/admin-semantic-icons/prd/prd-admin-semantic-icons.md
**Diff range**: c09d5b87..ac6aded879f1fe496a026ae40c9a318de9623348
**Verifier**: INDEPENDENT
**Sensor depth**: 10 mutations across 6 logic files — status-icon.ts: 1/0 branches, status-badge.tsx: 1/2 branches, resolve-status-badge.ts: 2/2 branches, user-detail-format.ts: 2/4 branches, user-row.tsx: 2/4 branches, check-in-actions.tsx: 2/4 branches

---

## Gate Check

- **Command**: `pnpm --filter frontend test`
- **Result**: 816 passed, 0 failed, 0 skipped (137 arquivos de teste) - exit 0
- **Baseline**: ran (working tree carrega alterações não relacionadas pré-existentes em `.npmrc`/`apps/frontend/.gitignore`/`config/`, então não havia baseline verde reutilizável com SHA correspondente ao HEAD desta rodada; a suíte foi executada do zero nesta verificação). 816 = 811 da rodada 1 + 5 testes novos adicionados pelo commit de correção (`ac6aded8`).
- **Typecheck/build**: `pnpm --filter frontend tsc:check` (`tsc --noEmit`) executado - saída vazia, exit 0, sem erros de tipo

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 WHEN o painel de detalhe de usuário é renderizado THEN o botão "Editar dados" é ícone-só com `aria-label` e tooltip "Editar dados" no hover e no foco | `aria-label="Editar dados"` exato; tooltip com texto "Editar dados" | `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx:138` - `expect(btn).toHaveAttribute("aria-label", "Editar dados")`; `:147,151` - `expect(await screen.findByRole("tooltip")).toHaveTextContent("Editar dados")` (hover e foco) — reconferido nesta rodada, linhas inalteradas em relação à rodada 1 (arquivo não tocado pelo fix) | ✅ PASS |
| FR-002 WHEN o gatilho "Mais ações" é renderizado THEN é ícone-só com `aria-label`/tooltip "Mais ações" e os itens internos do menu permanecem em texto | `aria-label="Mais ações"`; itens internos com texto inalterado | `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx:342-349,355-374` (arquivo não tocado pelo fix; herdado da rodada 1) | ✅ PASS |
| FR-003 (Ativo) WHEN `StatusBadge` recebe `tone="success"` THEN renderiza ícone semântico junto do texto | ícone `<svg>` presente + texto "Ativo" | `apps/frontend/src/components/ui/status-badge.test.tsx:6-11` - `expect((badge).querySelector("svg")).toBeInTheDocument()` (arquivo não tocado pelo fix) | ✅ PASS |
| FR-003 (Inativo/suspenso) WHEN `UserRow`/`DetailsTab`/`UserDetailPanel` recebem usuário `status: "suspended"` THEN badge mostra ícone semântico distinto (tone danger) | `statusTone("suspended")` → `"danger"`; ícone presente | `apps/frontend/src/features/admin/components/user-row.test.tsx:68-77`, `details-tab.test.tsx:59-66`, `user-detail-panel.test.tsx:71-78` | ✅ PASS |
| **FR-003 (Ativo, em `user-detail-format.ts`) WHEN `DetailsTab`/`UserDetailPanel` recebem usuário `status: "activated"` THEN badge mostra o ícone de sucesso (`CircleCheck`/tone `success`), não outro tom** | `statusTone("activated")` → `"success"` observável na classe do badge | `apps/frontend/src/features/admin/components/user-detail/details-tab.test.tsx:73-85` - `expect((badge).querySelector("svg")).toBeInTheDocument()` + `expect(badge).toHaveClass("text-success")`; `user-detail-panel.test.tsx:79-85` - mesma asserção. **Gap da rodada 1 fechado (FIX-02)**: mutante M6 (`user-detail-format.ts:11`, `"success"`→`"danger"`) reaplicado nesta rodada e confirmado morto (`vitest run` falha nas duas asserções `toHaveClass("text-success")`) | ✅ PASS |
| **FR-003 (Bloqueado) WHEN `UserRow`/`StatusBadge` recebem status "locked" (`tone="warning"`) THEN renderiza ícone semântico distinto (`TriangleAlert`)** | ícone com classe `lucide-triangle-alert` presente para `tone="warning"` | `apps/frontend/src/features/admin/components/user-row.test.tsx:79-90` - `expect(icon).toHaveClass("lucide-triangle-alert")`. **Gap da rodada 1 fechado (FIX-01)**: mutante M8 (`user-row.tsx:31`, `"warning"`→`"danger"`) reaplicado nesta rodada e confirmado morto (ícone renderizado passa a ter classe `lucide-circle-slash`, asserção falha) | ✅ PASS |
| FR-004 WHEN `StatusBadge` recebe o vocabulário de academia (`tone="danger"`, texto "Desativada") THEN aceita e exibe ícone+texto sem componente separado | ícone `<svg>` presente + texto "Desativada" | `apps/frontend/src/components/ui/status-badge.test.tsx:14-21` (arquivo não tocado pelo fix) | ✅ PASS |
| FR-005 WHEN `gym-row.tsx`/`gym-card.tsx` renderizam o selo de status THEN usam `StatusBadge` compartilhado preservando `isDeactivated = adminEditHref && status === "deactivated"` | badge com ícone; regra condicional preservada (Desativada só com `adminEditHref`) | `apps/frontend/src/features/gyms/lib/resolve-status-badge.ts:4` - `const isDeactivated = adminEditHref && gym.status === "deactivated"` (reconferido, código inalterado); `resolve-status-badge.test.ts:20,28,36` - `expect(resolveGymStatusBadge(...)).toEqual({...})` | ✅ PASS |
| FR-006 WHEN os botões Aprovar/Rejeitar de check-ins são renderizados THEN usam `Button` compartilhado, ícone-só, com `aria-label` próprio | `aria-label="Aprovar"`/`"Rejeitar"` exatos; sem texto visível | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:156-163` (arquivo tocado pelo fix apenas para adicionar testes novos; asserção original inalterada) | ✅ PASS |
| FR-007 WHEN a badge de papel e os itens internos do menu "Mais ações" são renderizados THEN permanecem em texto, sem alteração visual | itens internos com texto inalterado; `RoleBadge` sem alteração | `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx:355-374`; `role-badge.tsx` ausente do diff | ✅ PASS |
| FR-008 (Editar dados) WHEN o botão ícone-só "Editar dados" recebe hover/foco THEN exibe tooltip "Editar dados" | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx:141-151` | ✅ PASS |
| FR-008 (Mais ações) WHEN o gatilho ícone-só "Mais ações" recebe hover/foco THEN exibe tooltip "Mais ações" | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx:376-393` | ✅ PASS |
| FR-008 (Aprovar) WHEN o botão ícone-só "Aprovar" recebe hover/foco THEN exibe tooltip "Aprovar" | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:166-177` | ✅ PASS |
| **FR-008 (Rejeitar) WHEN o botão ícone-só "Rejeitar" recebe hover/foco THEN exibe tooltip "Rejeitar"** | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:179-189` - `expect(await screen.findByRole("tooltip")).toHaveTextContent("Rejeitar")` (hover e `rejectBtn.focus()`). **Gap da rodada 1 fechado (parte (a) de FIX-03)**: teste novo `"FR-008: exibe tooltip no hover e no foco de teclado do botão Rejeitar"` exercita `rejectBtn` diretamente, algo que não existia na rodada 1 | ✅ PASS |
| D1 Tooltip construído manualmente sobre `radix-ui` (não via CLI shadcn), seguindo convenção `forwardRef`+`cn()` | import de `"radix-ui"`, sem `data-slot`/`function` (padrão shadcn CLI) | `apps/frontend/src/components/ui/tooltip.tsx:3,13-14` (arquivo não tocado pelo fix) | ✅ PASS |
| D2 Mapeamento de ícones centralizado é a única fonte usada pelos componentes afetados | nenhum componente redefine literal de ícone para os mesmos conceitos | `apps/frontend/src/components/ui/status-badge.tsx:2`, `user-actions-footer.tsx` (`ACTION_ICON`), `more-actions-menu.tsx` (`ACTION_ICON`), `check-in-actions.tsx:6` - todos importam de `@/components/ui/status-icon` (reconferido, código inalterado) | ✅ PASS |
| D3 `statusTone("suspended")` corrigido de `"neutral"` para `"danger"` (fecha lacuna pré-existente do FR-003) | `tone="danger"` para `suspended`, não `"neutral"` | `apps/frontend/src/features/admin/components/user-row.tsx:32` - `if (status === "suspended") return "danger"` (reconferido, código inalterado); teste `user-row.test.tsx:68-77` | ✅ PASS |
| **D4 WHEN um botão Aprovar/Rejeitar está com sua própria mutação pendente THEN só esse ícone troca para o spinner (`Loader2`/`animate-spin`) E o `aria-label` muda para "Aprovando..."/"Rejeitando..."** | o botão pendente mostra `.animate-spin`; o outro mantém o ícone normal; `aria-label` do botão pendente vira `"Aprovando..."`/`"Rejeitando..."`, o outro mantém o rótulo estático | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:179-192` - `expect((approveBtn).querySelector(".animate-spin")).toBeInTheDocument()`; `:192-203` - `expect(approveBtn).toHaveAttribute("aria-label", "Aprovando...")` + `expect(rejectBtn).toHaveAttribute("aria-label", "Rejeitar")`. **Gap da rodada 1 fechado (parte (b) de FIX-03)**: mutante M10 (`check-in-actions.tsx:80`, remove a troca dinâmica de rótulo) reaplicado nesta rodada e confirmado morto (`toHaveAttribute("aria-label", "Aprovando...")` falha, recebe `"Aprovar"`) | ✅ PASS |
| Risco (mitigação) `TooltipProvider` montado em `providers.tsx` (camada mais externa), cobrindo rotas admin e não-admin | `TooltipProvider` envolvendo toda a árvore de providers | `apps/frontend/src/app/providers.tsx:69,75` (arquivo não tocado pelo fix) | ✅ PASS |
| Característica Acessibilidade: todo `Button size="icon"` introduzido tem `aria-label` E `Tooltip` associados | 4 botões novos (`Editar dados`, `Mais ações`, `Aprovar`, `Rejeitar`) com ambos | 4 de 4 botões agora com cobertura de teste completa (tooltip Rejeitar fechado por FIX-03(a) acima) | ✅ PASS |
| Característica Consistência: mapeamento de ícone é a única fonte usada pelos 4+ componentes afetados | nenhum literal de ícone duplicado para os mesmos conceitos | mesma evidência de D2 | ✅ PASS |
| Característica Manutenibilidade: `gym-row.tsx` não mantém markup de badge próprio após a migração | função `renderStatusBadge` bespoke removida | `git diff c09d5b87..936b200d -- apps/frontend/src/features/gyms/components/gym-row.tsx` (inalterado desde a rodada 1) | ✅ PASS |

**Coverage**: 21/21 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| M1 | `apps/frontend/src/components/ui/status-icon.ts:17` | `danger: CircleSlash,` → `danger: CircleCheck,` | ✅ Killed (reexecutado nesta rodada como sanity-check: `status-icon.test.ts` falha em `expect(STATUS_ICON.danger).toBe(CircleSlash)`) |
| M2 | `apps/frontend/src/components/ui/status-badge.tsx:21` | `return tone !== "neutral"` → `return tone === "neutral"` (inverte quais tons ganham ícone) | ✅ Killed (herdado da rodada 1 - arquivo não tocado pelo commit de fix `ac6aded8`, código-fonte idêntico) |
| M3 | `apps/frontend/src/features/gyms/lib/resolve-status-badge.ts:4` | `adminEditHref && gym.status === "deactivated"` → remove o `adminEditHref &&` | ✅ Killed (herdado da rodada 1 - arquivo não tocado pelo commit de fix) |
| M4 | `apps/frontend/src/features/gyms/lib/resolve-status-badge.ts:7` | branch `success`/"Disponível" → `danger`/"Disponível" | ✅ Killed (herdado da rodada 1 - arquivo não tocado pelo commit de fix) |
| M5 | `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts:13` | `if (status === "suspended") return "danger"` → `return "neutral"` | ✅ Killed (reexecutado nesta rodada como sanity-check: `details-tab.test.tsx`/`user-detail-panel.test.tsx` falham, `querySelector("svg")` retorna `null` para o teste "Inativo") |
| M6 | `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts:11` | `if (status === "activated") return "success"` → `return "danger"` | ✅ **Killed** (gap FIX-02 da rodada 1; reexecutado diretamente na árvore real, `git checkout` para restaurar: `details-tab.test.tsx`/`user-detail-panel.test.tsx` falham em `expect(badge).toHaveClass("text-success")`) |
| M7 | `apps/frontend/src/features/admin/components/user-row.tsx:32` | `if (status === "suspended") return "danger"` → `return "neutral"` | ✅ Killed (herdado da rodada 1 - arquivo tocado pelo fix apenas para *adicionar* um teste novo abaixo da linha 32; o código de `statusTone` em si está inalterado) |
| M8 | `apps/frontend/src/features/admin/components/user-row.tsx:31` | `if (status === "locked") return "warning"` → `return "danger"` | ✅ **Killed** (gap FIX-01 da rodada 1; reexecutado diretamente na árvore real: `user-row.test.tsx` falha em `expect(icon).toHaveClass("lucide-triangle-alert")`, recebe `lucide-circle-slash`) |
| M9 | `apps/frontend/src/features/check-ins/components/check-in-actions.tsx:95` | `animate-spin` → `animate-spin-disabled` (spinner do Aprovar deixa de bater no seletor) | ✅ Killed (reexecutado nesta rodada como sanity-check: `check-in-actions.test.tsx` falha em `querySelector(".animate-spin")` para o botão Aprovar pendente) |
| M10 | `apps/frontend/src/features/check-ins/components/check-in-actions.tsx:80` | `const label = isPending ? "Aprovando..." : "Aprovar"` → `const label = "Aprovar"` (aria-label deixa de mudar durante o pendente) | ✅ **Killed** (gap FIX-03(b) da rodada 1; reexecutado diretamente na árvore real: `check-in-actions.test.tsx` falha em `expect(approveBtn).toHaveAttribute("aria-label", "Aprovando...")`, recebe `"Aprovar"`) |

**Depth**: lightweight (10 mutações, 6 arquivos de lógica nova, dentro do teto de 10)
**Result**: 10/10 killed (nenhum sobrevivente, nenhum equivalente) - PASS ✅

Post-sensor tree state: `git status --porcelain` mostra apenas as alterações pré-existentes e não relacionadas (`.npmrc`, `apps/frontend/.gitignore`, `config/`) já presentes no início desta verificação. Todas as mutações M1/M5/M6/M8/M9/M10 reexecutadas nesta rodada foram aplicadas diretamente na árvore real via `Edit` + confirmadas com `node_modules/.bin/vitest run <arquivo>` (invocação direta do binário, evitando o bug `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` documentado na rodada 1) e restauradas com `git checkout -- <arquivo>` logo em seguida, com `git status --porcelain` confirmado limpo (apenas os arquivos pré-existentes fora do escopo) após cada ciclo. Nenhum arquivo do diff da feature ficou sujo ao final desta verificação.

**Nota metodológica desta rodada:** M2, M3, M4 e M7 não foram reexecutados fisicamente nesta rodada — seus arquivos-fonte (`status-badge.tsx`, `resolve-status-badge.ts`, `user-row.tsx` fora da linha 31) não foram tocados pelo commit de correção `ac6aded8` (confirmado via `git show ac6aded8 --stat`, que lista apenas 4 arquivos de teste + o relatório da rodada 1), então a evidência executada da rodada 1 para esses quatro mutantes permanece válida sem necessidade de nova execução. Em vez disso, esta rodada reexecutou como sanity-check M1, M5 e M9 (três mutantes já confirmados `Killed` na rodada 1, em arquivos também não tocados pelo fix) para provar que meu próprio harness de mutação (invocação direta do vitest, fora do `run-mutation-batch.cjs`) discrimina de verdade antes de confiar nos resultados de M6/M8/M10 — todos os três sanity-checks confirmaram `Killed` com saída de teste real (stack trace de asserção falha), não um erro de infraestrutura mascarado como kill.

---

## Gaps → Fix Tasks

Nenhum. Os três gaps da rodada 1 (FIX-01, FIX-02, FIX-03) foram fechados pelo commit `ac6aded879f1fe496a026ae40c9a318de9623348` e reconfirmados nesta rodada por execução direta dos mutantes M6, M8 e M10 na árvore real.

---

## Verdict

**PASS ✅** - A suíte está verde (816/816, exit 0; 5 testes novos em relação à rodada 1) e as 21 ACs derivadas do spec têm evidência de asserção exata no `file:line`, incluindo as 3 que haviam sido marcadas como gap na rodada 1 (FR-003 Bloqueado, FR-003 Ativo em `user-detail-format.ts`, FR-008 Rejeitar + `aria-label` dinâmico do D4). O sensor de mutação, reexecutado por este Verifier de forma independente (não confiando nos relatos dos implementadores dos fixes), confirma que os 3 mutantes que sobreviveram na rodada 1 (M6, M8, M10) agora são mortos pelas asserções mais específicas adicionadas pelo commit de correção (`toHaveClass("text-success")`, `toHaveClass("lucide-triangle-alert")`, `toHaveAttribute("aria-label", "Aprovando...")`), e 3 mutações-sanity em arquivos não tocados pelo fix (M1, M5, M9) confirmam que o próprio harness de execução direta do vitest discrimina corretamente, descartando o falso-positivo de infraestrutura (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`) documentado na rodada 1.

**Lessons recorded**: L-015
