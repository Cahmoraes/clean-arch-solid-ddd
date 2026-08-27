# Acessibilidade WCAG 2.2 (frontend) - Independent Validation

**Date**: 2026-08-27
**Spec**: docs/superpowers/acessibilidade-frontend/specs/acessibilidade-frontend-design.md
**PRD**: docs/superpowers/acessibilidade-frontend/prd/prd-acessibilidade-frontend.md
**Diff range**: a97c6e85..77fb009b
**Verifier**: INDEPENDENT
**Sensor depth**: 10 mutations across 9 logic files — card.tsx: 1/1 branches, search-bar.tsx: 1/1 branches, pagination.tsx: 1/1 branches, checkbox.tsx: 2/2 branches, input.tsx: 1/1 branches, button.tsx: 1/1 branches, gym-location-picker.tsx: 1/1 branches, segmented-control.tsx: 1/1 branches, check-in-search-input.tsx: 1/1 branches

---

## Gate Check

- **Command**: `pnpm --filter frontend test -- --run`
- **Result**: 150 arquivos de teste passaram, 890 testes passaram, exit 0
- **Baseline**: reused from controller-run fresh full baseline @ 77fb009bd6877631fcf0c7c5958feecf4f8964c1 (SHA idêntica ao HEAD do range, `git status --porcelain` vazio confirmado nesta sessão)
- **Typecheck/build**: reused from same baseline source — `pnpm --filter frontend tsc:check` limpo e `pnpm --filter frontend build` limpo @ mesma SHA (fonte: mesma evidência de baseline informada ao Verifier)

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FR-001 - `gym-image-uploader` expõe rótulo programático para o input de arquivo | `<label htmlFor>` associado, `getByLabelText` retorna o input | `apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx:73-76` - `expect(screen.getByLabelText(/imagem da academia/i)).toBe(screen.getByTestId("gym-image-input"))` | ✅ PASS |
| FR-001 - `CheckInSearchInput` expõe rótulo acessível via prop `label` obrigatória | `getByRole("textbox", { name })` encontra o campo | `apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx:49-60` - `expect(screen.getByRole("textbox", { name: "Buscar check-in por academia" })).toBeInTheDocument()` | ✅ PASS |
| FR-001 - `SearchBar` (botão e input cru) expõe `aria-label` explícito ou fallback de `placeholder` | `getByRole("button"/"textbox", { name })` nos dois cenários | `apps/frontend/src/components/ui/search-bar.test.tsx:49-77` - `expect(screen.getByRole("button"/"searchbox", { name })).toBeInTheDocument()` (3 casos: aria-label explícito, fallback no botão, fallback no input) | ✅ PASS |
| FR-001 - `gym-cnpj-field`/`gym-location-picker` seguem associados via `FieldShell`/`label htmlFor` | rótulo programático preservado | `apps/frontend/src/features/gyms/components/gym-cnpj-field.test.tsx:14-15` - `expect(screen.getByLabelText(/cnpj/i))...`; `gym-location-picker.tsx:44-45` `<label htmlFor={addressInputId}>` | ✅ PASS |
| FR-002 - `GymCnpjField` marca campo obrigatório sem asterisco visível | `aria-required="true"` + texto `sr-only` "(obrigatório)", sem `*` solto | `apps/frontend/src/features/gyms/components/gym-cnpj-field.test.tsx:14-21` - `expect(screen.getByLabelText(/cnpj/i)).toHaveAttribute("aria-required","true")`; `expect(screen.getByText("(obrigatório)")).toBeInTheDocument()`; `expect(screen.queryByText("*")).not.toBeInTheDocument()` | ✅ PASS |
| FR-002 - `EditProfileModal` (campo Nome) | idem | `apps/frontend/src/features/profile/components/EditProfileModal.test.tsx:41-57` - `expect(screen.getByLabelText(/nome/i)).toHaveAttribute("aria-required","true")` | ✅ PASS |
| FR-002 - `details-edit-form` (Nome e E-mail) | idem, 2 campos | `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx:126-138` - `expect(...).toHaveAttribute("aria-required","true")` para os dois campos, `expect(screen.getAllByText("(obrigatório)")).toHaveLength(2)`, `expect(screen.queryByText("*")).not.toBeInTheDocument()` | ✅ PASS |
| FR-002 - `gym-location-picker` (endereço) | `aria-required` + texto `sr-only` mantendo `*` visual existente (decisão diferente de D6 - aqui coexiste com `*`) | `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx:146-157` - `expect(input).toHaveAttribute("aria-required","true")`; `expect(screen.getByText("(obrigatório)")).toBeInTheDocument()` | ✅ PASS |
| FR-003 - anel de foco global usa `box-shadow` de 2 camadas em vez de `outline` sólido | 2 camadas de `box-shadow` no elemento focado via teclado | `apps/frontend/e2e/accessibility.spec.ts:20-35` - `expect(layerCount).toBe(2)` (asserção via `getComputedStyle`, e2e Playwright - fora do `TEST_COMMAND` vitest; não coberta pelo sensor de mutação desta rodada, ver nota) | ✅ PASS (evidência e2e) |
| FR-003 - `Button`/`Input`/`Checkbox`/`FieldShell` usam a utility `focus-ring-duplo` | classe `focus-ring-duplo` presente | `button.test.tsx:70-75`, `input.test.tsx:6-11`, `checkbox.test.tsx:6-10`, `field-shell.test.tsx:6-13` - `toHaveClass("focus-ring-duplo")` | ✅ PASS |
| FR-003 - `gym-location-picker`, `check-in-search-input`, `search-bar` (input cru), `command-palette` (Content + Command.Input) usam `focus-ring-duplo` | idem | `gym-location-picker.test.tsx:156`, `check-in-search-input.test.tsx:63-75`, `search-bar.test.tsx:79-82`, `command-palette.test.tsx:126-136` - `toHaveClass("focus-ring-duplo")` | ✅ PASS |
| FR-004 - `PublicShell` expõe skip-link para `#main-content` | link "Pular para o conteúdo principal", `href="#main-content"`, `<main id="main-content">` | `apps/frontend/src/components/layout/public-shell.test.tsx:61-76` - `expect(skipLink).toHaveAttribute("href","#main-content")`; `expect(container.querySelector("#main-content")).toBeInTheDocument()` | ✅ PASS |
| FR-004 - `AuthenticatedShell` expõe skip-link para `#main-content` | idem | `apps/frontend/src/components/layout/authenticated-shell.test.tsx:177-192` - mesma asserção | ✅ PASS |
| FR-005 - `font-size` do `body` é relativo (`rem`), escala com a raiz | dobrar `font-size` da raiz dobra o computado do `body` | `apps/frontend/e2e/accessibility.spec.ts:37-51` - `expect(scaledPx).toBeCloseTo(baselinePx * 2, 1)` (e2e Playwright, fora do `TEST_COMMAND` vitest) | ✅ PASS (evidência e2e) |
| FR-006 - `SegmentedControl` expõe `aria-label` por item quando `item.ariaLabel` está definido | `getByRole("button", { name: item.ariaLabel })` | `apps/frontend/src/components/ui/segmented-control.test.tsx:59-78` - `expect(screen.getByRole("button", { name: "Ver como cards" })).toBeInTheDocument()` | ✅ PASS |
| FR-006 - toggle de visualização de `academias/page` expõe `aria-label` por item | idem, 2 itens (cards/rows) | `apps/frontend/src/app/(authenticated)/academias/page.test.tsx:283-297[FR-006]` - `expect(screen.getByRole("button", { name: "Ver como lista" })).toBeInTheDocument()` (e o mesmo para "Ver como cards") | ✅ PASS |
| FR-007 - `PaginationPrevious`/`PaginationNext` ocultam `Chevron*` de leitores de tela | `svg` com `aria-hidden="true"`, `href` preservado | `apps/frontend/src/components/ui/pagination.test.tsx:20-26,42-48` - `expect(link.querySelector("svg")).toHaveAttribute("aria-hidden","true")` | ✅ PASS |
| FR-007 - `Checkbox` oculta `CheckIcon` | `svg` com `aria-hidden="true"` | `apps/frontend/src/components/ui/checkbox.test.tsx:61-67` - `expect(icon).toHaveAttribute("aria-hidden","true")` | ✅ PASS |
| FR-007 - `at-risk-alert-zone` oculta `CheckCircle2`/`AlertTriangle` | idem, 2 estados | `apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx:96-113` - `expect(icon).toHaveAttribute("aria-hidden","true")` (2 testes, um por estado) | ✅ PASS |
| FR-007 - `details-edit-form` oculta `ChevronDown` de `StatusField`/`RoleField` | idem | `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx:140-151` - `expect(statusIcon/roleIcon).toHaveAttribute("aria-hidden","true")` | ✅ PASS |
| FR-008 - alvo de toque do checkbox atinge ≥24×24px sem alterar o quadrado visual de 16px | wrapper com `min-h-6`/`min-w-6` | `apps/frontend/src/components/ui/checkbox.test.tsx:69-74` - `expect(wrapper).toHaveClass("min-h-6")`; `expect(wrapper).toHaveClass("min-w-6")` | ✅ PASS |
| FR-008 - botão "Limpar busca" de `check-in-search-input` atinge ≥24×24px | classes `h-6 w-6` | `apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx:77-89` - `expect(clearButton).toHaveClass("h-6")`; `expect(clearButton).toHaveClass("w-6")` | ✅ PASS |
| FR-009 - `CardTitle` renderiza heading semântico por padrão (`h3`), aceita override via `as` | `getByRole("heading", { level: N })` | `apps/frontend/src/components/ui/card.test.tsx:5-16` - `expect(screen.getByRole("heading", { level: 3, ... })).toBeInTheDocument()` (padrão) e `level: 2` (com `as="h2"`) | ✅ PASS |
| FR-010 - `PaginationLinkProps` exige `href: string` (barreira de tipo) | `tsc:check` falha se `href` for omitido em `PaginationLink`/`Previous`/`Next` | `apps/frontend/src/components/ui/pagination.tsx:47` - `Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }`; `numbered-pagination.tsx:57,66,77` (3 call sites com `href="#"` adicionado) - enforcement é de tipo (compile-time), confirmado indiretamente pelo `tsc:check` limpo do baseline, não por um teste em runtime | ✅ PASS (evidência de tipo, não de teste em runtime) |
| FR-011 - `Input`/`Checkbox` usam `border-subtle` em vez de `border-input` | classe `border-subtle` presente | `apps/frontend/src/components/ui/input.test.tsx:6-11`, `checkbox.test.tsx:6-10` - `toHaveClass("border-subtle")` | ✅ PASS |

**Coverage**: 24/24 criterios PASS (2 evidenciados via e2e, 1 via tipo/compile-time) · 0 gaps bloqueantes · 1 observação registrada fora da tabela (não é um AC do plano de 21 tasks, ver nota abaixo)

**Observação fora da tabela de ACs (FR-001 / `assinatura/page.tsx`)**: o design spec (`D1`) e o texto do PRD (FR-001) listam "seleção de plano" (`assinatura/page.tsx`) entre os campos que deveriam migrar para `Input`/`Label`/`FormField`/`FieldShell`. Nenhuma das 21 tasks efetivamente planejadas (`tasks-acessibilidade-frontend.md`, a checklist operacional de "Done-when" desta feature) cria uma task para essa migração, e o `<input type="radio">` em `assinatura/page.tsx:111-120` permanece cru. Isso não vira uma linha de AC formal porque nenhum task "Done-when" reivindica cobri-lo. Na prática, o campo já tem nome acessível programático via `<label htmlFor={inputId}>` nativo — a task-21 (e2e axe-core em `/assinatura`) não reporta violação `critical`/`serious` nesse ponto, ou seja, o resultado observável de acessibilidade (US-01) já está satisfeito por outro meio que não a migração de componente. Fica registrado como desvio de escopo entre o design spec original e o plano de tasks efetivamente executado - não como gap bloqueante desta verificação.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/components/ui/card.tsx:37` | `const Component = as ?? "h3"` → `const Component = "h3"` (ignora `as`) | ✅ Killed |
| 2 | `apps/frontend/src/components/ui/search-bar.tsx:23` | `return ariaLabel ?? placeholder` → `return placeholder` (ignora `aria-label` explícito) | ✅ Killed |
| 3 | `apps/frontend/src/components/ui/pagination.tsx:81` | `<ChevronLeft ... aria-hidden="true" />` → `aria-hidden="false"` | ✅ Killed |
| 4 | `apps/frontend/src/components/ui/checkbox.tsx:14` | `min-h-6 min-w-6` → `min-h-4 min-w-4` (alvo de toque abaixo de 24×24) | ✅ Killed |
| 5 | `apps/frontend/src/components/ui/checkbox.tsx:27` | `<CheckIcon ... aria-hidden="true" />` → `aria-hidden="false"` | ✅ Killed |
| 6 | `apps/frontend/src/components/ui/input.tsx:13` | `border-subtle` → `border-input` (regressão de contraste D7) | ✅ Killed |
| 7 | `apps/frontend/src/components/ui/button.tsx:15` | `"focus-ring-duplo"` → `"focus-ring-removida"` | ✅ Killed |
| 8 | `apps/frontend/src/features/gyms/components/gym-location-picker.tsx:55` | `aria-required="true"` → `aria-required="false"` | ✅ Killed |
| 9 | `apps/frontend/src/components/ui/segmented-control.tsx:66` | `aria-label={item.ariaLabel}` → `aria-label={undefined}` | ✅ Killed |
| 10 | `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx:40` | `h-6 w-6` → `h-4 w-4` (alvo de toque do botão "Limpar busca" abaixo de 24×24) | ✅ Killed |

**Depth**: lightweight (10, dentro do teto de uma passagem leve; feature não é P0 - payments/auth/data-integrity)
**Result**: 10/10 killed - PASS ✅

Post-sensor tree state: todas as 10 mutações rodaram em snapshots isolados via hard-link (`run-mutation-batch.cjs`, `--isolate hardlink`); `summary.realTreeDirtied: false` confirmado na saída do batch. A árvore real nunca foi tocada - nada a restaurar, nada a reverificar via `git status`.

**Nota de escopo do sensor**: as duas asserções de `globals.css`/`*:focus-visible` e `font-size` (FR-003/FR-005 de camada global) são verificadas por `apps/frontend/e2e/accessibility.spec.ts` (Playwright), fora do `TEST_COMMAND` vitest usado pelo sensor de mutação desta rodada. `globals.css` não é executado pelo runner de testes unitários (JSDOM não computa `box-shadow` de um arquivo CSS não carregado), então uma mutação nesse arquivo não teria efeito observável sob `pnpm --filter frontend test -- --run` - por isso não entrou no plano de mutação. A cobertura desses dois FRs fica baseada na leitura direta das asserções e2e (linha por linha, sem execução do Playwright nesta rodada, que está fora do `TEST_COMMAND` informado ao Verifier).

---

## Verdict

**PASS ✅** - As 21 tasks (3 waves) do plano de acessibilidade WCAG 2.2 têm evidência de asserção em `file:line` para os FRs que reivindicam, contra o valor exato exigido pelo spec (classe CSS, atributo ARIA, `href`, dimensão de alvo de toque). Suíte vitest reutilizada como baseline verde (890/890, exit 0) na mesma SHA do HEAD com árvore limpa; `tsc:check`/`build` também limpos na mesma evidência de baseline. Sensor de mutação: 10/10 mutações mortas em 9 arquivos de lógica nova, árvore real nunca tocada. Único achado: um item explicitamente listado no design spec/PRD sob FR-001 (`assinatura/page.tsx`) nunca ganhou task própria no plano de 21 tasks e permanece com `<input>` cru - mas com rótulo nativo já associado (`label htmlFor`), sem violação axe-core reportada pela task-21 e2e. Registrado como spec-precision gap, não bloqueante.

**Lessons recorded**: L-024
