# Task 14: Polimento global — movimento, acessibilidade, responsividade e gate final [RF-025, RF-026, RF-027, RF-028]

**Status:** PENDING
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Adiciona a camada global de movimento (keyframes `voltFade`/`voltBar`, entrada de rota, respeito a `prefers-reduced-motion`), aplica o `route-fade` ao conteúdo do shell, valida o limite de conteúdo de 1180px, faz a verificação de acessibilidade e responsividade, e roda o gate final completo do frontend.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Test: `apps/frontend/src/app/motion.test.tsx` (novo)

### Conformidade com as Skills Padrão

- use code-style: motion transform-only, estado-base sempre visível
- use verification-before-completion: rodar o gate completo antes de declarar concluído
- use test-antipatterns: asserir comportamento observável

## Passos

- [ ] **Step 1: Escrever o teste que falha (utilitário de movimento aplicado)**

Crie `apps/frontend/src/app/motion.test.tsx`:

```tsx
import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

function Faded() {
	return <div className="route-fade">conteúdo</div>
}

describe("Movimento VOLT", () => {
	test("aplica a classe route-fade ao conteúdo", () => {
		const { container } = render(<Faded />)
		expect(container.firstChild).toHaveClass("route-fade")
	})
})
```

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "Movimento VOLT"`
Expected: FAIL (o componente de teste ainda não existe; cria-se no passo anterior — confirme que roda e passa após o build do CSS).

> Observação: este teste valida a presença da classe (contrato), não a animação CSS em si (não renderizável em happy-dom).

- [ ] **Step 3: Adicionar keyframes e regras de movimento ao `globals.css`**

Acrescente ao final de `apps/frontend/src/app/globals.css`:

```css
/* Movimento VOLT — transform-only, estado-base sempre visível */
@keyframes voltFade {
	from {
		transform: translateY(10px);
	}
	to {
		transform: translateY(0);
	}
}

@keyframes voltBar {
	from {
		transform: scaleY(0);
	}
	to {
		transform: scaleY(1);
	}
}

.route-fade {
	animation: voltFade 0.45s cubic-bezier(0.2, 0.7, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
```

> O `!important` aqui é a prática padrão de reset para `prefers-reduced-motion` (acessibilidade), não um workaround.

- [ ] **Step 4: Aplicar `route-fade` ao conteúdo do shell**

Em `authenticated-shell.tsx`, adicione a classe `route-fade` ao wrapper do conteúdo (estado-base visível; só anima a entrada):

```tsx
<div className="route-fade mx-auto max-w-[1180px] px-8 pb-20 pt-9 max-[560px]:px-[18px]">
	{children}
</div>
```

- [ ] **Step 5: Verificação de acessibilidade e responsividade (checklist manual)**

Confirme, abrindo a app em dev (`pnpm --filter frontend dev`) e via inspeção do código:

- Foco visível (`*:focus-visible` accent-mix) presente em inputs/botões/links [RF-028]
- Nenhum texto branco sobre accent; foreground sobre accent é `#0a0a0a` [RF-028]
- Alvos de toque ≥44px (botões/icon-btn `h-[42px]`+, segmented `py-2`) [RF-028]
- Sidebar colapsa para 76px < 860px; login vira coluna única < 860px [RF-025]
- Grades (KPIs/planos/academias/dashboard) refluem 4→2→1 [RF-025]
- Conteúdo respeita `max-w-[1180px]` centralizado [RF-025]

- [ ] **Step 6: Rodar o teste de movimento**

Run: `pnpm --filter frontend test -- -t "Movimento VOLT"`
Expected: PASS.

- [ ] **Step 7: Gate final completo do frontend**

Run: `pnpm --filter frontend lint:fix`
Expected: zero issues.

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros.

Run: `pnpm --filter frontend test`
Expected: toda a suíte PASS.

Run: `pnpm --filter frontend build`
Expected: build OK.

- [ ] **Step 8: (Opcional) E2E de acessibilidade**

Se o ambiente permitir subir backend+frontend, rode:

Run: `pnpm --filter frontend e2e -- accessibility.spec.ts`
Expected: PASS. Caso falhe por contraste, ajuste os tokens/pareamentos envolvidos.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/components/layout/authenticated-shell.tsx apps/frontend/src/app/motion.test.tsx
git commit -m "feat(volt-redesign): movimento global, prefers-reduced-motion e polimento de acessibilidade"
```

## Critérios de Sucesso

- Conteúdo respeita `max-w-[1180px]` centralizado [RF-025]
- Movimento transform-only com estado-base visível; `route-fade` na entrada [RF-026]
- `prefers-reduced-motion` respeitado globalmente [RF-027]
- Foco visível, contraste AA+ e alvos ≥44px [RF-028]
- Gate final: `lint:fix`, `tsc:check`, `test` e `build` passam 100%
