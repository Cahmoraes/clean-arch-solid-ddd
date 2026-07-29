# academia-botao-voltar - Independent Validation

**Date**: 2026-07-29
**Spec**: docs/superpowers/academia-botao-voltar/specs/academia-botao-voltar-design.md
**PRD**: none
**Diff range**: 2af2b698ebc5cb227c45a76eb18b506296194d12..a754ec66
**Verifier**: INDEPENDENT
**Sensor depth**: 3 mutations across 1 logic file — page.tsx: 3/3 branches


---

## Gate Check

- **Command**: `pnpm --filter frontend test -- --run page.test.tsx`
- **Result**: 734 passed, 0 failed, 0 skipped — exit 0 (127 test files, 6 testes no arquivo da feature)
- **Typecheck/build** (if applicable): não executado (fora do escopo desta verificação)

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| AC-01: WHEN a tela de edição é renderizada THEN um link "Voltar para a busca" deve estar visível | Texto exato "Voltar para a busca", elemento presente no DOM | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx:43` — `expect(backLink).toHaveTextContent("Voltar para a busca")` | ✅ PASS |
| AC-02: WHEN o link de voltar é renderizado THEN ele deve apontar para `/academias` | `href="/academias"` (decisão D1 da spec) | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx:42` — `expect(backLink).toHaveAttribute("href", "/academias")` | ✅ PASS |
| AC-03: WHEN o link de voltar é renderizado THEN deve ter `data-testid="gym-edit-back-link"` | `data-testid="gym-edit-back-link"` (spec: Estrutura de Componentes) | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx:41` — `await screen.findByTestId("gym-edit-back-link")` | ✅ PASS |
| AC-04: WHEN o botão inferior é renderizado THEN deve exibir o texto "Descartar alterações" | Texto exato "Descartar alterações" (decisão D2 da spec) | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx:74` — `screen.findByRole("button", { name: /descartar alterações/i })` + `expect(cancelBtn).toBeInTheDocument()` | ✅ PASS |
| AC-05: WHEN o botão "Descartar alterações" é clicado THEN o router navega para `/academias` | `router.push("/academias")` chamado | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx:90` — `expect(mockPush).toHaveBeenCalledWith("/academias")` | ✅ PASS |
| AC-06: WHEN o link de voltar é renderizado THEN deve usar `next/link` (navegação client-side) | Componente `Link` de `next/link` — spec/Testes: "Verificar que o link usa next/link" | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx:44` — `expect(backLink).toHaveAttribute("data-next-link", "true")` (via mock `vi.mock("next/link", ...)` linha 17) | ✅ PASS |

**Coverage**: 6/6 critérios PASS · 0 gaps · 0 spec-precision gaps

---

## Discrimination Sensor

| # | File:line | Mutation | Killed? |
| --- | --- | --- | --- |
| 1 | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx:172` | `href="/academias"` → `href="/admin/academias"` | ✅ Killed |
| 2 | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx:146` | `Descartar alterações` → `Cancelar` | ✅ Killed |
| 3 | `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx:171` | `<Link` → `<a` (substitui next/link por tag HTML simples) | ✅ Killed |

**Depth**: lightweight (3 mutações, 1 arquivo de lógica)
**Result**: 3/3 killed — PASS ✅

Post-sensor tree state: `git status --porcelain` vazio nos arquivos da feature; `git diff --stat` sem alterações nos arquivos tocados pela feature.

---

## Verdict

**PASS ✅** — 6/6 critérios cobertos com asserções precisas. O critério AC-06 ("Verificar que o link usa next/link"), que causou FAIL na rodada 1, foi corrigido: o arquivo `page.test.tsx` agora inclui `vi.mock("next/link", ...)` que injeta `data-next-link="true"` e a asserção `expect(backLink).toHaveAttribute("data-next-link", "true")` garante que a implementação usa `next/link` — mutação 3 (substituição por `<a>`) foi morta. Sensor 3/3 killed.

**Lessons recorded**: none (clean PASS)
