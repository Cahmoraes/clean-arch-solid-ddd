# fale-conosco-restyle - Independent Validation

**Date**: 2026-08-02
**Spec**: docs/superpowers/fale-conosco-restyle/specs/fale-conosco-restyle-design.md
**PRD**: none
**Diff range**: 1cb37c85..f812c965
**Verifier**: INDEPENDENT
**Sensor depth**: 7 mutations across 2 logic files — contact-section.tsx: 4/4 branches, contact-form.tsx: 3/6 branches


---

## Gate Check

- **Command**: `pnpm --filter frontend test -- --run`
- **Result**: 757 passed, 0 failed, 0 skipped - exit 0 (129 test files)
- **Typecheck/build**: `pnpm --filter frontend tsc:check` — exit 0 (sem erros de tipo). `pnpm --filter frontend build` — exit 0 (Next.js production build compilou em ~8.4s, 18 rotas geradas, 0 erros).

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-1 WHEN a seção renderiza THEN o heading "Fale conosco" aparece com `id="contact-heading"` | heading com nome "Fale conosco" | `contact-section.test.tsx:10-11` — `expect(screen.getByRole("heading", { name: /fale conosco/i })).toBeInTheDocument()` · `expect(heading).toHaveAttribute("id", "contact-heading")` | ✅ PASS |
| AC-2 WHEN a seção renderiza THEN o formulário aparece (campos Nome, E-mail, Mensagem) | campos Nome/E-mail/Mensagem presentes | `contact-section.test.tsx:16-18` — `expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()` · `(/e-mail/i)` · `(/mensagem/i)` | ✅ PASS |
| AC-3 WHEN a seção renderiza THEN os 2 cards de contato aparecem (link `contato@volt.com` + "Em até 24h") | cards E-mail + Resposta em até 24h | `contact-section.test.tsx:19,22` — `const emailLink = screen.getByRole("link", { name: CONTACT_EMAIL })` · `expect(screen.getByText("Em até 24h")).toBeInTheDocument()` | ✅ PASS |
| AC-4 WHEN o card de e-mail renderiza THEN expõe um link mailto para `contato@volt.com` | `href="mailto:contato@volt.com"` | `contact-section.test.tsx:20` — `expect(emailLink).toHaveAttribute("href", \`mailto:${CONTACT_EMAIL}\`)` (`CONTACT_EMAIL = "contato@volt.com"` em `constants.ts:5`) | ✅ PASS |
| AC-5 WHEN a seção renderiza THEN o form ocupa a largura do container (wrapper `mx-auto w-full`, sem `max-w-xl`/`md:grid-cols-2`) | form full-width, sem a coluna de info antiga | `contact-section.tsx:8` — `className="mx-auto w-full"` (sem `max-w-xl`/`md:grid-cols-2`); contrato de largura do form coberto em `contact-form.test.tsx:122-127` — `expect(screen.getByLabelText(/nome/i).closest(".grid")).toHaveClass("sm:grid-cols-2")` · `expect(screen.getByRole("button", { name: /enviar/i })).toHaveClass("w-full")` | ✅ PASS |
| AC-6 WHEN os cards de contato renderizam THEN ficam em grid `gap-4 sm:grid-cols-2` (2 col desktop, 1 mobile) | grid dos cards em 2 colunas desktop | `contact-section.test.tsx:21` — `expect(emailLink.closest(".grid")).toHaveClass("sm:grid-cols-2")` | ✅ PASS |
| AC-7 WHEN a seção renderiza THEN o contrato `aria-labelledby="contact-heading"` (section) + `id="contact-heading"` (h2) é preservado | contrato ARIA preservado | `contact-section.test.tsx:11-15` — `expect(heading).toHaveAttribute("id", "contact-heading")` · `expect(heading.closest("section")).toHaveAttribute("aria-labelledby", "contact-heading")` | ✅ PASS |
| AC-8 WHEN o form renderiza THEN Nome+E-mail ficam lado a lado (`sm:grid-cols-2`), Mensagem em linha cheia e botão full-width (`w-full`), mobile 1 coluna | layout desktop/mobile do form | `contact-form.test.tsx:122-127` — `expect(screen.getByLabelText(/nome/i).closest(".grid")).toHaveClass("sm:grid-cols-2")` · `expect(screen.getByRole("button", { name: /enviar/i })).toHaveClass("w-full")` (mobile 1 coluna implícito pelo mobile-first `sm:` sem `grid-cols-2`) | ✅ PASS |
| AC-9 WHEN os campos nome/e-mail renderizam THEN têm `autocomplete="name"`/`autocomplete="email"` | conformidade WCAG 1.3.5 | `contact-form.test.tsx:114-121` — `expect(screen.getByLabelText(/nome/i)).toHaveAttribute("autocomplete", "name")` · `expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute("autocomplete", "email")` | ✅ PASS |
| AC-10 WHEN o form envia THEN a lógica (react-hook-form + zod + `useSendContact`) permanece intacta | validação, loading, limpeza e erro inline inalterados | `contact-form.test.tsx:30-110` — 5 testes de validação/envio/erro sem mudança de expectativa; `git diff 1cb37c85..f812c965 -- apps/frontend/src/features/contact/api/*` vazio (`use-send-contact` inalterado) | ✅ PASS |
| AC-11 WHEN a feature termina THEN a suite completa passa sem regressão | todos os testes verdes | gate: `pnpm --filter frontend test -- --run` — 129 files / 757 testes, exit 0; `tsc:check` exit 0; `build` exit 0 | ✅ PASS |

**Coverage**: 11/11 criteria PASS · 0 gaps · 0 spec-precision gaps

Nota (não é gap): o spec Testes cita "mantém os 5 testes" em `contact-form.test.tsx`, mas o HEAD tem 6 testes pré-existentes (a task-02 os conta como "6"); o diff não alterou nenhum deles, apenas adicionou o teste de layout/autocomplete — a intenção ("lógica de envio inalterada") está satisfeita.

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `contact-form.tsx:41` | `autoComplete="name"` → `autoComplete="off"` | ✅ killed |
| 2 | `contact-section.tsx:46` | texto do card "Em até 24h" → "Em até 48h" | ✅ killed |
| 3 | `contact-section.tsx:31` | `href={`mailto:${CONTACT_EMAIL}`}` → `href={"#"}` | ✅ killed |
| 4 | `contact-section.tsx:22` | `sm:grid-cols-2` → `sm:grid-cols-1` (grid dos cards) | ✅ killed |
| 5 | `contact-form.tsx:77` | `className="mt-2 w-full"` → `className="mt-2"` (remove `w-full` do botão) | ✅ killed |
| 6 | `contact-form.tsx:35` | `sm:grid-cols-2` → `sm:grid-cols-1` (grid Nome+E-mail) | ✅ killed |
| 7 | `contact-section.tsx:8` | `aria-labelledby="contact-heading"` → `aria-labelledby="contact-alt"` | ✅ killed |

**Depth**: P0-full (7 mutações, 2 arquivos de lógica; sensor dedicado `run-mutation.cjs`)
**Result**: 7/7 killed — **PASS ✅**

Post-sensor tree state: `git status --porcelain` mostra apenas os 2 arquivos de teste modificados (`M apps/frontend/src/features/contact/components/contact-form.test.tsx` e `contact-section.test.tsx` — as asserções FIX-01..FIX-05, uncommitted) + `?? .opencode/` (orquestração, fora do escopo); `git diff --stat` lista somente esses 2 arquivos de teste. Os arquivos de lógica `contact-section.tsx`/`contact-form.tsx` restaram byte-idênticos ao commit `f812c965` (cada ciclo do sensor reportou `restored:true`).

---

## Verdict

**PASS ✅** - Os 7 mutantes (M1..M7) foram mortos pela suite; os 5 gaps de cobertura da rodada anterior (AC-4, AC-5, AC-6, AC-7 e AC-8) foram fechados pelas asserções FIX-01..FIX-05 nos testes. Gate: 757 testes passando (exit 0), `tsc:check` exit 0, `build` exit 0. A lógica de envio (`useSendContact` + schema Zod) permanece inalterada — `use-send-contact` sem diff no range verificado.

**Lessons recorded**: L-005
