# Task 8: Animação das cenas com transform e opacity [FR-012, FR-014, FR-016]

**Status:** PENDING

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-01, task-05, task-07

## Visão Geral

Dá movimento sutil às cenas por CSS: deriva lenta dos feixes e cintilar suave das janelas, usando só `transform` e `opacity`. As animações pausam quando a cena está com `data-paused="true"`, desligam por completo sob `prefers-reduced-motion: reduce` e nunca piscam mais de 3 vezes por segundo (o cintilar tem ciclo de 5 segundos). Um teste lê o CSS real e trava essas regras.

## Arquivos

- Modify: `apps/frontend/src/app/globals.css`
- Test: `apps/frontend/src/app/scene-animation.test.tsx`

## Interfaces

- **Consome:** de task-07, contrato de DOM de `PixelScene` em `apps/frontend/src/components/ui/pixel-scene.tsx`: `svg.pixel-scene[data-paused="true|false"]`, `g.pixel-scene-beam`, `rect.pixel-scene-window` (com `animation-delay` inline). (De task-05: `data-paused` vem de `paused` de `useSceneMotion`. De task-01: `apps/frontend/src/app/globals.css` já tem o bloco `@theme` e `.dark`.)
- **Produz:** em `apps/frontend/src/app/globals.css`: `@keyframes sceneBeamDrift`, `@keyframes sceneWindowTwinkle` e as regras `.pixel-scene .pixel-scene-beam`, `.pixel-scene .pixel-scene-window`; a tarefa 17 (medição de paint) usa `data-paused` e as classes acima.

### Conformidade com as Skills Padrão

- `frontend-design`: movimento sutil da direção "Noite neon"; sem blur animado.
- `tailwindcss`: CSS de cena junto de `globals.css`, sem valores de cor (a cena já pinta por token).
- `wcag-audit-patterns`: `prefers-reduced-motion: reduce` desliga a animação; pausa por atributo; sem flash acima de 3 por segundo (WCAG 2.3.1) e animação pausável (2.2.2).
- `vercel-react-best-practices`: só `transform` e `opacity`, propriedades compostas pelo navegador, para não gerar layout nem paint por quadro.
- `vercel-composition-patterns`: o estado vem do atributo `data-paused`, sem estado React por quadro.
- `test-antipatterns`: o teste lê o CSS real e afirma regras, sem mock.
- `no-workarounds`: nenhuma animação de `opacity: 0` com `fill-mode` persistente; nada de `!important`.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/app/scene-animation.test.tsx`:

```tsx
import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")

function blockAt(source: string, openBraceIndex: number): string {
	let depth = 0
	for (let index = openBraceIndex; index < source.length; index += 1) {
		if (source[index] === "{") depth += 1
		if (source[index] === "}") depth -= 1
		if (depth === 0) return source.slice(openBraceIndex + 1, index)
	}
	throw new Error("Chaves desbalanceadas em globals.css")
}

function keyframesBody(name: string): string {
	const start = css.indexOf(`@keyframes ${name}`)
	if (start === -1) throw new Error(`@keyframes ${name} ausente`)
	return blockAt(css, css.indexOf("{", start))
}

function declaredProperties(body: string): string[] {
	return Array.from(body.matchAll(/([a-z-]+)\s*:/g), (match) => match[1] ?? "")
}

const SCENE_KEYFRAMES = ["sceneBeamDrift", "sceneWindowTwinkle"] as const

function reducedMotionBlock(): string {
	const start = css.indexOf("@media (prefers-reduced-motion: reduce)")
	if (start === -1) throw new Error("bloco reduce ausente")
	return blockAt(css, css.indexOf("{", start))
}

describe("Animação das cenas (globals.css)", () => {
	test("os keyframes das cenas existem", () => {
		for (const name of SCENE_KEYFRAMES) {
			expect(css).toContain(`@keyframes ${name}`)
		}
	})

	test("os keyframes das cenas animam só transform e opacity", () => {
		for (const name of SCENE_KEYFRAMES) {
			const properties = declaredProperties(keyframesBody(name)).filter(
				(property) => property !== "",
			)
			const disallowed = properties.filter(
				(property) => property !== "transform" && property !== "opacity",
			)
			expect(disallowed, `${name} anima propriedades caras`).toEqual([])
		}
	})

	test("nenhum keyframe de cena parte de opacity 0", () => {
		for (const name of SCENE_KEYFRAMES) {
			expect(keyframesBody(name)).not.toMatch(/opacity:\s*0\s*[;}]/)
		}
	})

	test("nenhuma regra de cena usa animation-fill-mode persistente", () => {
		expect(css).not.toMatch(/animation:[^;]*\b(forwards|both)\b/)
		expect(css).not.toMatch(/animation-fill-mode:\s*(forwards|both)/)
	})

	test("o cintilar das janelas dura pelo menos 1s por ciclo (no máximo 1 flash por segundo, abaixo do limite de 3)", () => {
		const match = css.match(/animation:\s*sceneWindowTwinkle\s+([\d.]+)s/)
		expect(match, "regra que usa sceneWindowTwinkle").not.toBeNull()
		expect(Number(match?.[1])).toBeGreaterThanOrEqual(1)
	})

	test("a deriva dos feixes é lenta (pelo menos 4s por ciclo)", () => {
		const match = css.match(/animation:\s*sceneBeamDrift\s+([\d.]+)s/)
		expect(match, "regra que usa sceneBeamDrift").not.toBeNull()
		expect(Number(match?.[1])).toBeGreaterThanOrEqual(4)
	})

	test("cena com data-paused true pausa as animações", () => {
		expect(css).toMatch(
			/\.pixel-scene\[data-paused="true"\][^{]*\{[^}]*animation-play-state:\s*paused/,
		)
	})

	test("movimento reduzido desliga as animações das cenas", () => {
		const block = reducedMotionBlock()
		expect(block).toContain(".pixel-scene-beam")
		expect(block).toContain(".pixel-scene-window")
		expect(block).toMatch(/animation:\s*none/)
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/app/scene-animation.test.tsx`
Expected: FAIL. `os keyframes das cenas existem` falha com `expected '...' to contain '@keyframes sceneBeamDrift'`; os demais falham com `@keyframes sceneBeamDrift ausente`, `regra que usa sceneWindowTwinkle` nula e `bloco reduce ausente`.

- **Step 3: Write minimal implementation**

Acrescentar ao final de `apps/frontend/src/app/globals.css`:

```css
/* Cenas pixel — só transform e opacity (compostas pelo navegador).
   Frame inicial igual ao estado estático; nenhum flash acima de 3 por segundo
   (cintilar de 5s por ciclo). */
@keyframes sceneBeamDrift {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(3px);
	}
}

@keyframes sceneWindowTwinkle {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.55;
	}
}

@media (prefers-reduced-motion: no-preference) {
	.pixel-scene .pixel-scene-beam {
		animation: sceneBeamDrift 12s ease-in-out infinite alternate;
	}

	.pixel-scene .pixel-scene-window {
		animation: sceneWindowTwinkle 5s ease-in-out infinite;
	}
}

.pixel-scene[data-paused="true"] .pixel-scene-beam,
.pixel-scene[data-paused="true"] .pixel-scene-window {
	animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
	.pixel-scene .pixel-scene-beam,
	.pixel-scene .pixel-scene-window {
		animation: none;
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/app/scene-animation.test.tsx src/app/globals-tokens.test.tsx src/app/motion.test.tsx src/components/ui/pixel-scene.test.tsx`
Expected: PASS

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/app/globals.css apps/frontend/src/app/scene-animation.test.tsx
git commit -m "feat(frontend): animação sutil das cenas com transform e opacity"
```

## Critérios de Sucesso

- Os keyframes das cenas animam apenas `transform` e `opacity`, nunca partem de `opacity: 0` e não usam `fill-mode` persistente (FR-012).
- `prefers-reduced-motion: reduce` desliga as animações das cenas sem ação do usuário (FR-014).
- `data-paused="true"` pausa as animações; o cintilar tem ciclo de 5s, abaixo de 3 flashes por segundo (FR-016).
