# gym-list-view-toggle - Independent Validation

**Date**: 2026-07-29
**Spec**: docs/superpowers/gym-list-view-toggle/specs/gym-list-view-toggle-design.md
**PRD**: none
**Diff range**: 1eefed01b715acae58cdee70da82d0ccd40fca28..2153f7befb069e9837347e900a6add3064df2292
**Verifier**: INDEPENDENT
**Sensor depth**: 7 mutations across 7 logic files — gym-results.tsx: 1/2 branches, gym-view-cookie.ts: 1/2 branches, gym-view-store.ts: 1/2 branches, gym-row.tsx: 1/2 branches, resolve-location.ts: 1/2 branches, segmented-control.tsx: 1/1 branch, academias/page.tsx: 1/1 branch

---

## Gate Check

- **Command**: `cd apps/frontend && pnpm test` (vitest run)
- **Result**: 733 passed, 0 failed, 0 skipped, 127 test files - exit 0
- **Typecheck/build** (if applicable): `pnpm tsc:check` - PASS, sem erros novos

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01 WHEN `resolveLocation` recebe gym com `address` presente THEN retorna o endereço | `"Rua A, 100"` | `apps/frontend/src/features/gyms/lib/resolve-location.test.ts:19` - `expect(resolveLocation(gym)).toBe("Rua A, 100")` | ✅ PASS |
| AC-02 WHEN `resolveLocation` recebe gym sem `address` THEN retorna coordenadas formatadas | `"-23.5000, -46.6000"` | `apps/frontend/src/features/gyms/lib/resolve-location.test.ts:24` - `expect(resolveLocation(gym)).toBe("-23.5000, -46.6000")` | ✅ PASS |
| AC-03 WHEN `gym-card.tsx` é refatorado para importar `resolveLocation` THEN os 11 testes pré-existentes de `gym-card.test.tsx` continuam passando sem alteração de conteúdo | suite verde, arquivo intocado | `apps/frontend/src/features/gyms/components/gym-card.test.tsx` (11 testes, arquivo idêntico ao pré-diff) - execução via `pnpm test` | ✅ PASS |
| AC-04 WHEN `parseGymViewCookie` recebe `undefined` THEN resolve para `"cards"` | `"cards"` | `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts:17` - `expect(parseGymViewCookie(undefined)).toBe("cards")` | ✅ PASS |
| AC-05 WHEN `parseGymViewCookie` recebe valor inválido THEN resolve para `"cards"` | `"cards"` | `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts:21` - `expect(parseGymViewCookie("qualquer-coisa")).toBe("cards")` | ✅ PASS |
| AC-06 WHEN `parseGymViewCookie` recebe `"cards"`/`"rows"` THEN interpreta cada valor corretamente | `"cards"`/`"rows"` | `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts:25-26` - `expect(parseGymViewCookie("cards")).toBe("cards")` / `expect(parseGymViewCookie("rows")).toBe("rows")` | ✅ PASS |
| AC-07 WHEN `writeGymViewCookie` é chamado com `"cards"`/`"rows"` THEN grava o cookie `gym_view` com o valor correspondente | chave `gym_view=cards`/`gym_view=rows` | `apps/frontend/src/lib/ui-state/gym-view-cookie.test.ts:31` e `:36` - `expect(document.cookie).toContain(\`${GYM_VIEW_COOKIE}=cards\`)` / `=rows` | ✅ PASS |
| AC-08 WHEN `toggle()` é chamado no `GymViewStore` THEN alterna entre `cards`/`rows` e grava o cookie a cada chamada | view alterna + cookie reflete o novo valor | `apps/frontend/src/lib/ui-state/gym-view-store.test.ts:24-29` - `expect(useGymViewStore.getState().view).toBe("rows")` / `.toBe("cards")` + `expect(document.cookie).toContain(...)` | ✅ PASS |
| AC-09 WHEN `setView(view)` é chamado THEN define a view explicitamente e grava o cookie | view = valor passado + cookie gravado | `apps/frontend/src/lib/ui-state/gym-view-store.test.ts:34-35` - `expect(useGymViewStore.getState().view).toBe("rows")` + `expect(document.cookie).toContain(...)` | ✅ PASS |
| AC-10 WHEN `hydrate(view)` é chamado mais de uma vez THEN só a primeira chamada tem efeito | segunda chamada é no-op | `apps/frontend/src/lib/ui-state/gym-view-store.test.ts:40-43` - `expect(useGymViewStore.getState().view).toBe("rows")` (após 2ª chamada com `"cards"`) | ✅ PASS |
| AC-11 WHEN `hydrate(view)` é chamado THEN nunca grava o cookie | cookie inalterado | `apps/frontend/src/lib/ui-state/gym-view-store.test.ts:48` - `expect(document.cookie).not.toContain(GYM_VIEW_COOKIE)` | ✅ PASS |
| AC-12 WHEN `SegmentedItem.label` recebe um `ReactNode` (ícone) THEN renderiza corretamente, sem quebrar os 3 consumidores existentes que passam `string` | ícone renderizado + `tsc:check` sem erro nos consumidores | `apps/frontend/src/components/ui/segmented-control.test.tsx:57` - `expect(screen.getByTestId("icon-cards")).toBeInTheDocument()`; consumidores intocados (fora do diff) | ✅ PASS |
| AC-13 WHEN `GymRow` renderiza um `Gym` THEN expõe paridade de conteúdo total com `GymCard` (nome, localização, descrição condicional, disponibilidade, telefone/"Ver detalhes" condicional, CTA check-in, link de edição condicional) | mesmos campos/CTAs de `GymCard` | `apps/frontend/src/features/gyms/components/gym-row.test.tsx:21,27,32,37,42,47,52,57,62,70-71` - 10 asserções cobrindo cada campo | ✅ PASS |
| AC-14 WHEN `view === "cards"` THEN o container de `GymResults` usa a classe de grid; WHEN `view === "rows"` THEN usa `flex flex-col` com borda/raio externo | `grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]` (cards) / `flex flex-col overflow-hidden rounded-[22px] border border-border` (rows) | `apps/frontend/src/features/gyms/components/gym-results.test.tsx:109-114` - `expect(list).toHaveClass("grid","grid-cols-[repeat(auto-fill,minmax(280px,1fr))]","gap-[18px]")` + `not.toHaveClass("flex","flex-col")`; `:121-129` - `expect(list).toHaveClass("flex","flex-col","overflow-hidden","rounded-[22px]","border","border-border")` + `not.toHaveClass("grid")` | ✅ PASS (gap do round 1 fechado nesta rodada) |
| AC-15 WHEN `view === "cards"` THEN `GymResults` renderiza `GymCard` por item; WHEN `view === "rows"` THEN renderiza `GymRow` por item | testid `gym-card-g1` presente/ausente conforme a view; `gym-row-g1` idem | `apps/frontend/src/features/gyms/components/gym-results.test.tsx` (bloco "GymResults — alternância de view") - `expect(screen.getByTestId("gym-card-g1")).toBeInTheDocument()` + `expect(screen.queryByTestId("gym-row-g1")).not.toBeInTheDocument()`, e o inverso após `setView("rows")` | ✅ PASS |
| AC-16 WHEN `/academias` é renderizado THEN o toggle aparece na toolbar com `data-testid="gym-view-toggle"` | elemento presente | `apps/frontend/src/app/(authenticated)/academias/page.test.tsx:238-241` - `expect(screen.getByTestId("gym-view-toggle")).toBeInTheDocument()` | ✅ PASS |
| AC-17 WHEN o usuário clica no item "rows" do toggle THEN `GymResults` passa a renderizar `GymRow` | `gym-row-gym-1` presente, `gym-card-gym-1` ausente | `apps/frontend/src/app/(authenticated)/academias/page.test.tsx:261-262` - `expect(await screen.findByTestId("gym-row-gym-1")).toBeInTheDocument()` + `expect(screen.queryByTestId("gym-card-gym-1")).not.toBeInTheDocument()` | ✅ PASS |
| AC-18 WHEN `AcademiasContent` monta com o cookie `gym_view=rows` já gravado THEN hidrata a view inicial sem clique no toggle | `gym-row-gym-1` presente já no primeiro render | `apps/frontend/src/app/(authenticated)/academias/page.test.tsx:279-280` - `expect(await screen.findByTestId("gym-row-gym-1")).toBeInTheDocument()` + `expect(screen.queryByTestId("gym-card-gym-1")).not.toBeInTheDocument()` | ✅ PASS |
| AC-19 WHEN a feature é implementada THEN `(authenticated)/layout.tsx` não é modificado (D2 da spec) | arquivo fora do diff | `git diff --stat 1eefed01..2153f7be` - `apps/frontend/src/app/(authenticated)/layout.tsx` não aparece na lista de 18 arquivos alterados | ✅ PASS |

**Nota (fora da tabela, não bloqueante):** a spec e o `task-06.md` também citam "nenhuma chamada de API nova é disparada pela troca de view" (Fluxo de Dados, passo 4). Não a trato como critério comportamental separado nesta tabela porque não é um WHEN/THEN introduzido por este diff — `view` do `GymViewStore` nunca integra a query key de `useAllGyms`/`useGymsByName`, e nenhum código novo do diff chama esses hooks a partir do caminho do toggle (`ResultsList`/`ResultsListItem` só leem `view` via seletor Zustand para escolher `GymCard`/`GymRow`); confirmado por leitura de `apps/frontend/src/features/gyms/components/gym-results.tsx` e `apps/frontend/src/app/(authenticated)/academias/page.tsx` linha a linha, sem `file:line` de teste dedicado a essa afirmação. Registrado como observação para trabalho futuro, não como gap dos 19 critérios comportamentais desta rodada.

**Coverage**: 19/19 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/features/gyms/components/gym-results.tsx:141` | `"...rounded-[22px] border border-border"` → `"...rounded-[22px] border border-red-500"` (AC-14, alvo do fix desta rodada) | ✅ Killed |
| 2 | `apps/frontend/src/lib/ui-state/gym-view-cookie.ts:17` | `value === "rows" ? "rows" : "cards"` → `value === "rows" ? "cards" : "cards"` | ✅ Killed |
| 3 | `apps/frontend/src/lib/ui-state/gym-view-store.ts:21` | `get().view === "cards" ? "rows" : "cards"` → `get().view === "cards" ? "cards" : "cards"` | ✅ Killed |
| 4 | `apps/frontend/src/features/gyms/components/gym-row.tsx:52` | `"Ver detalhes"` → `"Detalhes"` | ✅ Killed |
| 5 | `apps/frontend/src/features/gyms/lib/resolve-location.ts:4` | `if (gym.address) return gym.address` → `if (!gym.address) return gym.address` | ✅ Killed |
| 6 | `apps/frontend/src/components/ui/segmented-control.tsx:65` | `onClick={() => onValueChange(item.value)}` → `onClick={() => {}}` | ✅ Killed |
| 7 | `apps/frontend/src/app/(authenticated)/academias/page.tsx:64` | `hydrate(readGymViewCookie())` → `hydrate("cards")` (re-teste independente do mutante crítico do round 0) | ✅ Killed |

**Depth**: lightweight (1–3) — na verdade P0-full (≥5), 7 mutações cobrindo os 7 arquivos de lógica nova/modificada do diff
**Result**: 7/7 killed - PASS ✅

Post-sensor tree state: `git status --porcelain` (linhas relativas a `apps/frontend/src`) vazio, `git diff --stat -- apps/frontend/src` vazio.

---

## Verdict

**PASS ✅** - Reverificação independente e do zero confirma 19/19 critérios comportamentais cobertos com evidência exata de `file:line`, incluindo o fechamento do gap AC-14 identificado no round 1 (o container de `GymResults` agora tem asserções `toHaveClass`/`not.toHaveClass` pinadas nas duas views, verificadas em `gym-results.test.tsx:109-129`). As 7 mutações do sensor de discriminação — uma por arquivo de lógica nova/alterada do diff, incluindo a re-verificação independente do mutante crítico `page.tsx:64` do round 0 — foram todas mortas pela suíte. Tree pós-sensor idêntica ao HEAD.

**Lessons recorded**: none (clean PASS)
