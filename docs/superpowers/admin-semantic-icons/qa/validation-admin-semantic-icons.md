# Ícones Semânticos em Telas Admin - Independent Validation

**Date**: 2026-08-07
**Spec**: docs/superpowers/admin-semantic-icons/specs/admin-semantic-icons-design.md
**PRD**: docs/superpowers/admin-semantic-icons/prd/prd-admin-semantic-icons.md
**Diff range**: c09d5b87..936b200d2ec5953f5a127a250bbbb5a695a23086
**Verifier**: INDEPENDENT
**Sensor depth**: 10 mutations across 6 logic files — status-icon.ts: 1/0 branches, status-badge.tsx: 1/2 branches, resolve-status-badge.ts: 2/2 branches, user-detail-format.ts: 2/4 branches, user-row.tsx: 2/4 branches, check-in-actions.tsx: 2/4 branches

---

## Gate Check

- **Command**: `pnpm --filter frontend test`
- **Result**: 811 passed, 0 failed, 0 skipped (137 arquivos de teste) - exit 0
- **Baseline**: ran (working tree carrega alterações não relacionadas pré-existentes em `.npmrc`/`apps/frontend/.gitignore`/`config/`, então a reutilização do baseline informado pelo dispatcher não se aplicava; a suíte foi executada do zero nesta verificação)
- **Typecheck/build**: `pnpm --filter frontend tsc:check` (`tsc --noEmit`) executado - saída vazia, exit 0, sem erros de tipo

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 WHEN o painel de detalhe de usuário é renderizado THEN o botão "Editar dados" é ícone-só com `aria-label` e tooltip "Editar dados" no hover e no foco | `aria-label="Editar dados"` exato; tooltip com texto "Editar dados" | `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx:134-138` - `expect(btn).toHaveAttribute("aria-label", "Editar dados")`; `:141-151` - `expect(await screen.findByRole("tooltip")).toHaveTextContent("Editar dados")` (hover e foco) | ✅ PASS |
| FR-002 WHEN o gatilho "Mais ações" é renderizado THEN é ícone-só com `aria-label`/tooltip "Mais ações" e os itens internos do menu permanecem em texto | `aria-label="Mais ações"`; itens internos com texto inalterado | `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx:342-349` - `expect(btn).toHaveAttribute("aria-label", "Mais ações")`; `:355-374` - `expect(...).toHaveTextContent("Tornar Admin"/"Inativar"/"Excluir")` | ✅ PASS |
| FR-003 (Ativo) WHEN `StatusBadge` recebe `tone="success"` THEN renderiza ícone semântico junto do texto | ícone `<svg>` presente + texto "Ativo" | `apps/frontend/src/components/ui/status-badge.test.tsx:6-11` - `expect((badge).querySelector("svg")).toBeInTheDocument()` | ✅ PASS |
| FR-003 (Inativo/suspenso) WHEN `UserRow`/`DetailsTab`/`UserDetailPanel` recebem usuário `status: "suspended"` THEN badge mostra ícone semântico distinto (tone danger) | `statusTone("suspended")` → `"danger"`; ícone presente | `apps/frontend/src/features/admin/components/user-row.test.tsx:68-77`, `details-tab.test.tsx:59-66`, `user-detail-panel.test.tsx:71-78` - `expect((badge).querySelector("svg")).toBeInTheDocument()` | ✅ PASS |
| FR-003 (Ativo, em `user-detail-format.ts`) WHEN `DetailsTab`/`UserDetailPanel` recebem usuário `status: "activated"` THEN badge mostra o ícone de sucesso (`CircleCheck`), não outro tom | `statusTone("activated")` → `"success"` observável no ícone renderizado | não localizado - nenhum teste em `details-tab.test.tsx`/`user-detail-panel.test.tsx` verifica `querySelector("svg")` nem o tom para o caso `activated` (default do builder); mutante M6 (`user-detail-format.ts:11`, `"success"`→`"danger"`) sobreviveu à suíte completa | ❌ Gap (uncovered) |
| FR-003 (Bloqueado) WHEN `UserRow`/`StatusBadge` recebem status "locked" (`tone="warning"`) THEN renderiza ícone semântico distinto (`TriangleAlert`) | ícone presente para `tone="warning"` | não localizado - `user-row.test.tsx:59-66` só verifica o texto "Bloqueado" (`toBeInTheDocument()`), sem `querySelector("svg")`; nenhum teste em `status-badge.test.tsx` usa `tone="warning"`; mutante M8 (`user-row.tsx:31`, `"warning"`→`"danger"`) sobreviveu à suíte completa | ❌ Gap (uncovered) |
| FR-004 WHEN `StatusBadge` recebe o vocabulário de academia (`tone="danger"`, texto "Desativada") THEN aceita e exibe ícone+texto sem componente separado | ícone `<svg>` presente + texto "Desativada" | `apps/frontend/src/components/ui/status-badge.test.tsx:14-21` - `expect((badge).querySelector("svg")).toBeInTheDocument()` | ✅ PASS |
| FR-005 WHEN `gym-row.tsx`/`gym-card.tsx` renderizam o selo de status THEN usam `StatusBadge` compartilhado preservando `isDeactivated = adminEditHref && status === "deactivated"` | badge com ícone; regra condicional preservada (Desativada só com `adminEditHref`) | `apps/frontend/src/features/gyms/components/gym-row.test.tsx:94-98`, `gym-card.test.tsx:118-122` - `querySelector("svg")`; `gym-row.test.tsx:75-91`, `gym-card.test.tsx:90-106` (pré-existentes, preservados) - `expect(screen.getByText("Desativada"))`/`queryByText("Desativada")).not.toBeInTheDocument()`; `apps/frontend/src/features/gyms/lib/resolve-status-badge.test.ts:18-40` - `expect(resolveGymStatusBadge(...)).toEqual({ tone: "danger", label: "Desativada" })` | ✅ PASS |
| FR-006 WHEN os botões Aprovar/Rejeitar de check-ins são renderizados THEN usam `Button` compartilhado, ícone-só, com `aria-label` próprio | `aria-label="Aprovar"`/`"Rejeitar"` exatos; sem texto visível | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:156-163` - `expect(approveBtn).toHaveAttribute("aria-label", "Aprovar")`; `expect(rejectBtn).toHaveAttribute("aria-label", "Rejeitar")` | ✅ PASS |
| FR-007 WHEN a badge de papel e os itens internos do menu "Mais ações" são renderizados THEN permanecem em texto, sem alteração visual | itens internos com texto inalterado; `RoleBadge` sem alteração | `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx:355-374`; `role-badge.tsx` ausente do diff (`git diff --stat` não lista o arquivo) | ✅ PASS |
| FR-008 (Editar dados) WHEN o botão ícone-só "Editar dados" recebe hover/foco THEN exibe tooltip "Editar dados" | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx:141-151` - `expect(await screen.findByRole("tooltip")).toHaveTextContent("Editar dados")` (hover e `btn.focus()`) | ✅ PASS |
| FR-008 (Mais ações) WHEN o gatilho ícone-só "Mais ações" recebe hover/foco THEN exibe tooltip "Mais ações" | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx:376-393` - `expect(await screen.findByRole("tooltip")).toHaveTextContent("Mais ações")` (hover e `btn.focus()`) | ✅ PASS |
| FR-008 (Aprovar) WHEN o botão ícone-só "Aprovar" recebe hover/foco THEN exibe tooltip "Aprovar" | tooltip visível no hover E no foco de teclado | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:166-177` - `expect(await screen.findByRole("tooltip")).toHaveTextContent("Aprovar")` (hover e `approveBtn.focus()`) | ✅ PASS |
| FR-008 (Rejeitar) WHEN o botão ícone-só "Rejeitar" recebe hover/foco THEN exibe tooltip "Rejeitar" | tooltip visível no hover E no foco de teclado | não localizado - `check-in-actions.test.tsx:166-177` só exercita `approveBtn`; nenhum teste chama `screen.findByRole("tooltip")` após `hover`/`focus` do botão Rejeitar | ❌ Gap (uncovered) |
| D1 Tooltip construído manualmente sobre `radix-ui` (não via CLI shadcn), seguindo convenção `forwardRef`+`cn()` | import de `"radix-ui"`, sem `data-slot`/`function` (padrão shadcn CLI) | `apps/frontend/src/components/ui/tooltip.tsx:3` - `import { Tooltip as TooltipPrimitive } from "radix-ui"`; `:13-14` - `const TooltipContent = forwardRef<...>(...)` | ✅ PASS |
| D2 Mapeamento de ícones centralizado é a única fonte usada pelos componentes afetados | nenhum componente redefine literal de ícone para os mesmos conceitos | `apps/frontend/src/components/ui/status-badge.tsx:2`, `user-actions-footer.tsx` (`ACTION_ICON`), `more-actions-menu.tsx` (`ACTION_ICON`), `check-in-actions.tsx:6` - todos importam de `@/components/ui/status-icon`; único import de `lucide-react` fora do mapa é `Loader2` (spinner, conceito à parte por D4) | ✅ PASS |
| D3 `statusTone("suspended")` corrigido de `"neutral"` para `"danger"` (fecha lacuna pré-existente do FR-003) | `tone="danger"` para `suspended`, não `"neutral"` | `apps/frontend/src/features/admin/components/user-row.tsx:32` - `if (status === "suspended") return "danger"`; teste `user-row.test.tsx:68-77` | ✅ PASS |
| D4 WHEN um botão Aprovar/Rejeitar está com sua própria mutação pendente THEN só esse ícone troca para o spinner (`Loader2`/`animate-spin`) | o botão pendente mostra `.animate-spin`; o outro mantém o ícone normal | `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx:179-192` - `expect((approveBtn).querySelector(".animate-spin")).toBeInTheDocument()`; `expect((rejectBtn).querySelector(".animate-spin")).not.toBeInTheDocument()` | ✅ PASS |
| Risco (mitigação) `TooltipProvider` montado em `providers.tsx` (camada mais externa), cobrindo rotas admin e não-admin | `TooltipProvider` envolvendo toda a árvore de providers | `apps/frontend/src/app/providers.tsx:69,75` - `<TooltipProvider>` como wrapper externo; `apps/frontend/src/test/render.tsx` (harness de teste) + `render.test.tsx:23-35` - `expect(await screen.findByRole("tooltip")).toBeInTheDocument()` | ✅ PASS |
| Característica Acessibilidade: todo `Button size="icon"` introduzido tem `aria-label` E `Tooltip` associados | 4 botões novos (`Editar dados`, `Mais ações`, `Aprovar`, `Rejeitar`) com ambos | `user-actions-footer.tsx:46,49`; `more-actions-menu.tsx:159-160`; `check-in-actions.tsx:47,51` e `86,90` - todos com `aria-label` + `<Tooltip>`/`<TooltipContent>` estruturalmente; cobertura de teste completa para 3 dos 4 (ver gap FR-008 Rejeitar acima para o 4º) | ⚠️ Spec-precision gap (estrutural OK; cobertura de teste do botão Rejeitar incompleta, ver FR-008) |
| Característica Consistência: mapeamento de ícone é a única fonte usada pelos 4+ componentes afetados | nenhum literal de ícone duplicado para os mesmos conceitos | mesma evidência de D2 | ✅ PASS |
| Característica Manutenibilidade: `gym-row.tsx` não mantém markup de badge próprio após a migração | função `renderStatusBadge` bespoke removida | `git diff c09d5b87..936b200d -- apps/frontend/src/features/gyms/components/gym-row.tsx` - remove a função `renderStatusBadge` (17 linhas), substituída por `<StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>` | ✅ PASS |

**Coverage**: 18/21 criteria PASS · 3 gaps · 0 spec-precision gaps (a linha "Característica Acessibilidade" foi marcada com ⚠️ por decorrer diretamente do gap FR-008 Rejeitar já contado acima, não é uma lacuna adicional)

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| M1 | `apps/frontend/src/components/ui/status-icon.ts:17` | `danger: CircleSlash,` → `danger: CircleCheck,` | ✅ Killed |
| M2 | `apps/frontend/src/components/ui/status-badge.tsx:21` | `return tone !== "neutral"` → `return tone === "neutral"` (inverte quais tons ganham ícone) | ✅ Killed |
| M3 | `apps/frontend/src/features/gyms/lib/resolve-status-badge.ts:4` | `adminEditHref && gym.status === "deactivated"` → remove o `adminEditHref &&` (quebra a regra condicional) | ✅ Killed |
| M4 | `apps/frontend/src/features/gyms/lib/resolve-status-badge.ts:7` | branch `success`/"Disponível" → `danger`/"Disponível" (tom incoerente com o rótulo) | ✅ Killed |
| M5 | `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts:13` | `if (status === "suspended") return "danger"` → `return "neutral"` | ✅ Killed |
| M6 | `apps/frontend/src/features/admin/components/user-detail/user-detail-format.ts:11` | `if (status === "activated") return "success"` → `return "danger"` | ❌ Survived |
| M7 | `apps/frontend/src/features/admin/components/user-row.tsx:32` | `if (status === "suspended") return "danger"` → `return "neutral"` | ✅ Killed |
| M8 | `apps/frontend/src/features/admin/components/user-row.tsx:31` | `if (status === "locked") return "warning"` → `return "danger"` | ❌ Survived |
| M9 | `apps/frontend/src/features/check-ins/components/check-in-actions.tsx:95` | `animate-spin` → `animate-spin-disabled` (spinner do Aprovar deixa de bater no seletor) | ✅ Killed |
| M10 | `apps/frontend/src/features/check-ins/components/check-in-actions.tsx:80` | `const label = isPending ? "Aprovando..." : "Aprovar"` → `const label = "Aprovar"` (aria-label deixa de mudar durante o pendente) | ❌ Survived |

**Depth**: lightweight (10 mutações, 6 arquivos de lógica nova, dentro do teto de 10)
**Result**: 7/10 killed, 3 survived (nenhum documentado como Equivalent) - FAIL ❌ (sobreviventes nus → viram fix task)

Post-sensor tree state: `git status --porcelain` mostra apenas as alterações pré-existentes e não relacionadas (`.npmrc`, `apps/frontend/.gitignore`, `config/`) já presentes no início desta verificação; `summary.realTreeDirtied` do batch = `false`. Nenhum arquivo do diff da feature foi alterado pelo sensor (todas as mutações rodaram em snapshots isolados por hard link).

**Nota metodológica:** a primeira tentativa do sensor usou `pnpm --filter frontend exec vitest run <path>` como comando de teste dentro do snapshot isolado do `run-mutation-batch.cjs` e reportou 10/10 "killed" - incluindo M6/M8/M10. Investigação manual (aplicando cada mutação diretamente na árvore real, rodando o teste e restaurando com `git checkout --`) mostrou que M6/M8/M10 na verdade sobrevivem; o "killed" espúrio vinha de `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` - o pnpm, ao rodar a partir do caminho absoluto do snapshot em `/tmp`, tentava resincronizar `node_modules` e abortava por falta de TTY, fazendo TODAS as mutações "matarem" por falha de infraestrutura, não por asserção de teste. A correção foi invocar o binário do vitest diretamente (`cd apps/frontend && node_modules/.bin/vitest run <path>`), que não dispara essa checagem do pnpm; o rerun com o comando corrigido reproduziu exatamente os 3 sobreviventes confirmados manualmente.

---

## Gaps → Fix Tasks

### FIX-01 - Cobrir o ícone semântico do status "Bloqueado" (locked/`tone="warning"`)
- **What**: adicionar teste de componente que renderiza `UserRow` (ou `StatusBadge` diretamente) com `status: "locked"`/`tone="warning"` e verifica `querySelector("svg")` presente, análogo ao teste já existente para "Inativo" em `user-row.test.tsx:68-77`.
- **Where**: `apps/frontend/src/features/admin/components/user-row.test.tsx` (e, se aplicável, `apps/frontend/src/components/ui/status-badge.test.tsx` com `tone="warning"`).
- **Verify**: reaplicar o mutante M8 (`user-row.tsx:31`, `"warning"` → `"danger"`) e confirmar que a suíte falha (kill).
- **Done-when**: o novo teste falha com a mutação M8 aplicada e passa com o código original.

### FIX-02 - Cobrir o ícone semântico do status "Ativo" nos consumidores de `user-detail-format.ts`
- **What**: adicionar teste de componente em `DetailsTab`/`UserDetailPanel` com usuário `status: "activated"` (o default do builder) verificando `querySelector("svg")` presente no badge, análogo ao teste já existente para "Inativo" nesses mesmos arquivos.
- **Where**: `apps/frontend/src/features/admin/components/user-detail/details-tab.test.tsx`, `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`.
- **Verify**: reaplicar o mutante M6 (`user-detail-format.ts:11`, `"success"` → `"danger"`) e confirmar que a suíte falha (kill).
- **Done-when**: o novo teste falha com a mutação M6 aplicada e passa com o código original.

### FIX-03 - Cobrir o tooltip do botão Rejeitar e o valor do `aria-label` dinâmico durante o pendente
- **What**: (a) estender/duplicar o teste `FR-008` de `check-in-actions.test.tsx:166-177` para também exercitar `rejectBtn` (hover + foco, `toHaveTextContent("Rejeitar")`); (b) adicionar asserção do valor de `aria-label` durante o estado pendente (`"Aprovando..."`/`"Rejeitando..."`), não só a presença do spinner.
- **Where**: `apps/frontend/src/features/check-ins/components/check-in-actions.test.tsx`.
- **Verify**: reaplicar o mutante M10 (`check-in-actions.tsx:80`, remove a troca dinâmica de rótulo) e confirmar que a suíte falha (kill).
- **Done-when**: o novo teste falha com a mutação M10 aplicada e passa com o código original; o teste do botão Rejeitar (tooltip) falha se `TooltipContent` for removido do `RejectButton`.

---

## Verdict

**FAIL ❌** - A suíte está verde (811/811, exit 0) e a maioria dos FR-001..FR-008/D1-D4 tem evidência de asserção exata no `file:line`, mas o sensor de mutação encontrou 3 sobreviventes reais e não-equivalentes: o mapeamento tom→ícone para os estados "Bloqueado" (`user-row.tsx:31`) e "Ativo" (`user-detail-format.ts:11`, consumidores `DetailsTab`/`UserDetailPanel`) muda de comportamento observável sem que nenhum teste perceba, e o rótulo dinâmico "Aprovando..."/"Rejeitando..." do FR-008/D4 nunca tem seu valor asserido (só a presença do spinner é checada), com o tooltip do botão Rejeitar nunca sendo aberto em nenhum teste. Nenhum dos três é equivalente: todos alteram o ícone/rótulo/tooltip renderizado de forma observável ao usuário, exatamente o comportamento que a spec pede como critério de aceite.

**Lessons recorded**: L-011, L-012, L-013, L-014
