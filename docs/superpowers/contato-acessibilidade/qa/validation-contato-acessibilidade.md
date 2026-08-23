# Acessibilidade contato - Independent Validation

**Date**: 2026-08-23
**Spec**: docs/superpowers/contato-acessibilidade/specs/contato-acessibilidade-design.md
**PRD**: none
**Diff range**: b7c7f184..e9f3ea57
**Verifier**: INDEPENDENT
**Sensor depth**: 8 mutations across 4 logic files — apps/frontend/src/components/ui/form-field.tsx: 3/2 branches, apps/frontend/src/components/ui/field-shell.tsx: 1/1 branches, apps/frontend/src/features/contact/components/contact-form.tsx: 2/0 branches, apps/frontend/src/features/contact/components/contact-section.tsx: 2/0 branches

**Rodada 2 de verificação (re-verify).** A Rodada 1 (relatório anterior sobre `b7c7f184..4251f3f8`) reportou **FAIL** por um único gap: AC-03 (ausência de asterisco/frase visível "campos obrigatórios" no indicador de obrigatoriedade) não tinha asserção correspondente. O controller fechou o gap no commit `e9f3ea57` ("test: cobre ausencia de asterisco/frase no indicador de obrigatorio"), que adiciona exatamente duas linhas ao teste já existente `contact-form.test.tsx`: `expect(screen.queryByText("*")).not.toBeInTheDocument()` e `expect(screen.queryByText(/campos obrigatórios/i)).not.toBeInTheDocument()`. Nenhum arquivo de código-fonte (`form-field.tsx`, `field-shell.tsx`, `contact-form.tsx`, `contact-section.tsx`) mudou entre as duas rodadas — confirmado via `git diff b7c7f184..e9f3ea57` para os 4 arquivos de lógica, idêntico ao diff visto na Rodada 1. Esta rodada re-derivou TODOS os critérios do zero (não só o gap anterior).

---

## Gate Check

- **Command**: cd apps/frontend && npx vitest run
- **Result**: 859 passed, 0 failed, exit 0
- **Baseline**: reused @ e9f3ea57 (SHA do baseline fornecido pelo controller igual ao HEAD desta verificação; `git rev-parse HEAD` = `e9f3ea57b20de5167f69b7bfada08f3b9da5bd2d`; `git status --porcelain` vazio para arquivos rastreados — único item não rastreado é o próprio diretório `docs/superpowers/contato-acessibilidade/qa/` do relatório da Rodada 1, sem efeito em código/teste)
- **Typecheck/build**: `npx tsc --noEmit` (script `tsc:check`) — exit 0, sem erros (executado nesta rodada; já havia dado limpo na Rodada 1 sobre os mesmos 4 arquivos de lógica, e a única mudança desde então é o `.test.tsx`)

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01 WHEN os campos Nome/E-mail/Mensagem são obrigatórios THEN o elemento de input/textarea tem `aria-required="true"` | `aria-required="true"` nos 3 campos | `apps/frontend/src/features/contact/components/contact-form.test.tsx:132-143` - `expect(screen.getByLabelText(/nome/i)).toHaveAttribute("aria-required", "true")` (idem e-mail/mensagem) | ✅ PASS |
| AC-02 WHEN o rótulo de um campo obrigatório é renderizado THEN existe texto oculto "(obrigatório)" acessível a leitor de tela | texto `sr-only` "(obrigatório)" presente no DOM, 3 ocorrências | `apps/frontend/src/features/contact/components/contact-form.test.tsx:144` - `expect(screen.getAllByText("(obrigatório)")).toHaveLength(3)` | ✅ PASS |
| AC-03 WHEN o indicador de obrigatoriedade é renderizado THEN não aparece asterisco nem a frase visível "campos obrigatórios" (D1 do spec; task-01 Critério 2) | ausência de `*`/frase "campos obrigatórios" visível no DOM | `apps/frontend/src/features/contact/components/contact-form.test.tsx:145-146` - `expect(screen.queryByText("*")).not.toBeInTheDocument()` + `expect(screen.queryByText(/campos obrigatórios/i)).not.toBeInTheDocument()` (adicionado no commit `e9f3ea57`, FIX-01 da Rodada 1) | ✅ PASS (gap da Rodada 1 fechado) |
| AC-04 WHEN inputs/textarea/botão do formulário recebem foco THEN usam `focus-visible:ring-primary` (opacidade plena) em vez de `focus-visible:ring-ring/50` | classe `focus-visible:ring-primary` presente e `focus-visible:ring-ring/50` ausente | `apps/frontend/src/features/contact/components/contact-form.test.tsx:148-166` - `expect(...).toHaveClass("focus-visible:ring-primary")` (nome/e-mail/mensagem/botão) + `expect(screen.getByLabelText(/nome/i)).not.toHaveClass("focus-visible:ring-ring/50")` | ✅ PASS |
| AC-05 WHEN os 7 testes de envio pré-existentes de `contact-form.test.tsx` rodam THEN continuam passando sem mudança de comportamento | nenhuma asserção pré-existente alterada | `git diff b7c7f184..e9f3ea57 -- apps/frontend/src/features/contact/components/contact-form.test.tsx` mostra apenas 2 blocos `test(...)` adicionados ao final do `describe` (+38 linhas) mais as 2 linhas do FIX-01 dentro de um deles; nenhuma linha das 7 asserções originais (linhas 22-128 do arquivo atual) tocada; suíte completa 859/859 verde | ✅ PASS |
| AC-06 WHEN `FormField`/`FieldShell` são usados sem o novo prop `showRequiredIndicator` THEN continuam funcionando (retrocompatibilidade com outros usos no app) | nenhum teste fora do cluster de contato alterado | `showRequiredIndicator?: boolean` é opcional em `apps/frontend/src/components/ui/form-field.tsx:13` e `field-shell.tsx:32`; `grep -rln "FormField" src` (executado nesta rodada) lista 9 consumidores fora de `contact/` (`redefinir-senha`, `recuperar-senha`, `cadastro`, `login`, `perfil/senha`, `admin/academias/nova`, `admin/academias/[id]/editar`, `weather-search-form`) e `FieldShell` mais 2 (`gym-phone-field.tsx`, `gym-cnpj-field.tsx`) — nenhum desses arquivos aparece em `git diff --stat b7c7f184..e9f3ea57`; suíte completa 859/859 verde cobre essas telas sem regressão | ✅ PASS |
| AC-07 WHEN o card de e-mail é renderizado THEN o alvo de foco/clique cobre o card inteiro (técnica stretched-link) | `after:absolute after:inset-0` no link + `relative` no card | `apps/frontend/src/features/contact/components/contact-section.test.tsx:33-38` - `expect(emailLink).toHaveClass("after:absolute", "after:inset-0")` + `expect(emailLink.closest('[data-slot="card"]')).toHaveClass("relative")` | ✅ PASS |
| AC-08 WHEN o card de e-mail recebe foco THEN o anel de foco reforçado contorna o card inteiro (via pseudo-elemento) | `focus-visible:after:ring-2 focus-visible:after:ring-primary` no link | `apps/frontend/src/features/contact/components/contact-section.test.tsx:34-37` - `expect(emailLink).toHaveClass("focus-visible:after:ring-2", "focus-visible:after:ring-primary")` | ✅ PASS |
| AC-09 WHEN o usuário navega por Tab THEN o card "Resposta em até 24h" é alcançável e expõe nome acessível "Resposta: Em até 24h" | `role="group"` + `aria-label="Resposta: Em até 24h"` + `tabIndex={0}` | `apps/frontend/src/features/contact/components/contact-section.test.tsx:41-46` - `screen.getByRole("group", { name: /resposta: em até 24h/i })` + `expect(responseCard.tabIndex).toBe(0)` | ✅ PASS |
| AC-10 WHEN o card "Resposta" recebe foco THEN exibe anel de foco reforçado | `focus-visible:ring-2 focus-visible:ring-primary` no card | `apps/frontend/src/features/contact/components/contact-section.test.tsx:47-49` - `expect(responseCard).toHaveClass("focus-visible:ring-2", "focus-visible:ring-primary")` | ✅ PASS |
| AC-11 WHEN o teste pré-existente de `contact-section.test.tsx` roda THEN continua passando sem alteração de asserção | asserções originais intactas | `git diff b7c7f184..e9f3ea57 -- apps/frontend/src/features/contact/components/contact-section.test.tsx` mostra apenas 2 blocos `test(...)` adicionados após o teste original (linhas 8-28 do arquivo atual intactas, +23 linhas no total) | ✅ PASS |
| AC-12 WHEN a feature é escopada ao componente de contato THEN nenhuma mudança ocorre em `input.tsx`/`button.tsx` (task-01 Critério 5) | 0 linhas alteradas nesses arquivos | `git diff --stat b7c7f184..e9f3ea57` - `input.tsx`/`button.tsx` ausentes da lista de arquivos alterados; `git diff b7c7f184..e9f3ea57 -- .../input.tsx .../button.tsx` retorna vazio (confirmado nesta rodada) | ✅ PASS |
| AC-13 WHEN a feature é escopada ao componente de contato THEN nenhuma mudança ocorre em `card.tsx` (task-02 Critério 6) | 0 linhas alteradas | `git diff --stat b7c7f184..e9f3ea57` - `card.tsx` ausente da lista de arquivos alterados; `git diff b7c7f184..e9f3ea57 -- .../card.tsx` retorna vazio (confirmado nesta rodada) | ✅ PASS |

**Coverage**: 13/13 criteria PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/components/ui/form-field.tsx:41` | `{showRequiredIndicator ? (` → `{!showRequiredIndicator ? (` (inverte a condição do indicador sr-only + traço nos campos Nome/E-mail) | ✅ Killed |
| 2 | `apps/frontend/src/components/ui/form-field.tsx:54` | `aria-required={showRequiredIndicator \|\| undefined}` → `aria-required={undefined}` (remove a fiação do atributo em Nome/E-mail) | ✅ Killed |
| 3 | `apps/frontend/src/components/ui/form-field.tsx:47` | `/>` → `>*</span>` no span decorativo `aria-hidden` (reintroduz um asterisco visível como texto, alvo direto do FIX-01/AC-03) | ✅ Killed |
| 4 | `apps/frontend/src/components/ui/field-shell.tsx:42` | `{showRequiredIndicator ? (` → `{!showRequiredIndicator ? (` (inverte a condição do indicador no campo Mensagem) | ✅ Killed |
| 5 | `apps/frontend/src/features/contact/components/contact-form.tsx:69` | `aria-required="true"` → `aria-required="false"` (valor hardcoded do textarea Mensagem) | ✅ Killed |
| 6 | `apps/frontend/src/features/contact/components/contact-form.tsx:43` | `className="focus-visible:ring-primary focus-visible:ring-offset-2"` → `className="focus-visible:ring-ring/50 focus-visible:ring-offset-2"` (reverte para o anel fraco no campo Nome) | ✅ Killed |
| 7 | `apps/frontend/src/features/contact/components/contact-section.tsx:43` | `tabIndex={0}` → `tabIndex={-1}` (remove o card "Resposta" da ordem de tabulação) | ✅ Killed |
| 8 | `apps/frontend/src/features/contact/components/contact-section.tsx:35` | `after:absolute after:inset-0 after:rounded-xl` → `after:inset-0 after:rounded-xl` (remove `after:absolute`, quebrando o stretched-link do card de e-mail) | ✅ Killed |

**Depth**: lightweight (8, floor max(3,4)=4, cap 10)
**Result**: 8/8 killed - PASS ✅

Mutação #3 replica exatamente o cenário que o controller reportou ter reproduzido manualmente (reintroduzir um asterisco visível e ver o teste falhar); rodada aqui feita de forma independente via `run-mutation-batch.cjs` (sandbox isolado, não a árvore real) confirma empiricamente que as duas novas asserções de `contact-form.test.tsx:145-146` discriminam a regressão.

Post-sensor tree state: `git status --porcelain` vazio para arquivos rastreados (único item não rastreado é `docs/superpowers/contato-acessibilidade/qa/`, pré-existente do relatório da Rodada 1), `git diff --stat` vazio. `summary.realTreeDirtied: false` no resultado do batch (8 mutações em snapshots isolados via hard-link, todas decididas pelo subset de teste, nenhuma escalada ao suite completo necessária).

---

## Gaps → Fix Tasks

Nenhum. Gap único da Rodada 1 (AC-03) fechado no commit `e9f3ea57`.

---

## Verdict

**PASS ✅** - 13/13 critérios do spec (incluindo os 12 já confirmados na Rodada 1 e o AC-03 agora fechado) cobertos com evidência exata de `file:line` e valor esperado, incluindo a ausência de asterisco/frase visível "campos obrigatórios" agora asserida em `contact-form.test.tsx:145-146`. Nenhum arquivo de lógica mudou entre as duas rodadas — o fix foi puramente de teste, e a mutação #3 desta rodada confirma empiricamente (fora da árvore real) que a nova asserção mata a regressão que a Rodada 1 apontou como não coberta. O sensor de discriminação matou 8/8 mutações injetadas nos 4 arquivos de lógica nova do diff, sem sobreviventes e sem alterar a árvore real. A suíte completa (859 testes) está verde.

**Lessons recorded**: none (clean PASS; L-023 já registrada na Rodada 1 para o gap agora fechado)
