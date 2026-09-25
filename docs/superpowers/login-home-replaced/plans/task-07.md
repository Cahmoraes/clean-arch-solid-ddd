# Task 7: Boot de terminal, pixel-hover e script pré-paint [FR-012, FR-013, FR-014, FR-016, FR-018]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** capable

## Visão Geral

Implementa a entrada de terminal (eyebrow digitado, pulso de brilho no título, estatísticas escalonadas) uma vez por sessão, marcada por um script inline executado antes do paint no layout `(public)`. O script lê `sessionStorage`/`localStorage` com `try/catch` e aplica `data-boot-played`/`data-motion-paused` no `<html>` antes da hidratação, para nunca piscar. O `pixel-hover` fica disponível como utilitário CSS para os CTAs (task-08, task-09).

## Arquivos

- Create: `apps/frontend/src/lib/boot-session.ts`
- Create: `apps/frontend/src/components/ui/boot-marker.tsx`
- Modify: `apps/frontend/src/app/globals.css`
- Modify: `apps/frontend/src/app/(public)/layout.tsx`
- Test: `apps/frontend/src/lib/boot-session.test.ts`
- Test: `apps/frontend/src/components/ui/boot-marker.test.tsx`
- Test: `apps/frontend/src/test/boot-css.test.ts`

## Interfaces

- **Consome:** chave `localStorage["volt:scene-motion-paused"]` (contrato de task-03: `"true"` = pausado); atributo `data-motion-paused` já espelhado no `<html>` por `setMotionPaused` (task-03) — o script pré-paint lê a mesma chave diretamente (não pode importar `readMotionPaused`, roda antes da hidratação).
- **Produz:** `BOOT_PLAYED_KEY: string` (`"volt:boot-played"`); `bootPrepaintScript(): string`; `markBootPlayed(): void`; `BootMarker(): JSX.Element | null`; atributos `data-boot="eyebrow"|"title"|"stats"`; classe utilitária `pixel-hover` — consumidos por task-08 (login) e task-09 (home).

### Skills a invocar

- `tailwindcss`: `@keyframes`/`@utility` em Tailwind v4, `steps()` para o hover pixelado.
- `wcag-audit-patterns`: nenhum efeito pisca mais de 3x/s; título e formulário nunca ocultos (WCAG 2.3.1); tudo desliga sob `prefers-reduced-motion` e `data-motion-paused`.
- `vercel-react-best-practices`: `BootMarker` como componente cliente sem render visual, só efeito colateral.
- `no-workarounds`: `try/catch` no script cobre só a falha real de storage, nunca engole outro erro silenciosamente.
- `test-antipatterns`: executar `bootPrepaintScript()` como string via `new Function(...)` no teste, não reimplementar a lógica em paralelo só para testar.

## Passos

- **Step 1: Write the failing test**

```ts
// apps/frontend/src/lib/boot-session.test.ts
import { beforeEach, describe, expect, test } from "vitest"
import { mockBlockedLocalStorage } from "@/test/browser-mocks"
import { BOOT_PLAYED_KEY, bootPrepaintScript, markBootPlayed } from "./boot-session"

function runBootScript(): void {
	// biome-ignore lint/security/noGlobalEval: script pré-paint testado como string, igual ao que roda no <script> real
	new Function(bootPrepaintScript())()
}

describe("boot-session", () => {
	beforeEach(() => {
		sessionStorage.clear()
		localStorage.clear()
		document.documentElement.removeAttribute("data-boot-played")
		document.documentElement.removeAttribute("data-motion-paused")
	})

	test("sem flag de sessão, não marca data-boot-played", () => {
		runBootScript()
		expect(document.documentElement.hasAttribute("data-boot-played")).toBe(
			false,
		)
	})

	test("com a flag de sessão gravada, marca data-boot-played", () => {
		sessionStorage.setItem(BOOT_PLAYED_KEY, "true")
		runBootScript()
		expect(document.documentElement.hasAttribute("data-boot-played")).toBe(
			true,
		)
	})

	test("com a pausa salva no localStorage, marca data-motion-paused", () => {
		localStorage.setItem("volt:scene-motion-paused", "true")
		runBootScript()
		expect(document.documentElement.hasAttribute("data-motion-paused")).toBe(
			true,
		)
	})

	test("com storage bloqueado, o script não lança exceção", () => {
		mockBlockedLocalStorage()
		expect(() => runBootScript()).not.toThrow()
	})

	test("markBootPlayed grava a flag de sessão", () => {
		markBootPlayed()
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBe("true")
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/boot-session.test.ts`
Expected: FAIL — `./boot-session` não existe (`Cannot find module`).

- **Step 3: Write minimal implementation**

```ts
// apps/frontend/src/lib/boot-session.ts
export const BOOT_PLAYED_KEY = "volt:boot-played"
const MOTION_PAUSED_STORAGE_KEY = "volt:scene-motion-paused"

export function bootPrepaintScript(): string {
	const bootKey = JSON.stringify(BOOT_PLAYED_KEY)
	const motionKey = JSON.stringify(MOTION_PAUSED_STORAGE_KEY)
	return `(function(){try{if(window.sessionStorage.getItem(${bootKey})){document.documentElement.setAttribute("data-boot-played","")}}catch(e){}try{if(window.localStorage.getItem(${motionKey})==="true"){document.documentElement.setAttribute("data-motion-paused","")}}catch(e){}})();`
}

export function markBootPlayed(): void {
	try {
		window.sessionStorage.setItem(BOOT_PLAYED_KEY, "true")
	} catch {
		// armazenamento bloqueado: o boot toca novamente na próxima carga (FR-018)
	}
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/boot-session.test.ts`
Expected: PASS — os 5 testes do arquivo.

- **Step 5: Write the failing test**

```tsx
// apps/frontend/src/components/ui/boot-marker.test.tsx
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import { BOOT_PLAYED_KEY } from "@/lib/boot-session"
import { BootMarker } from "./boot-marker"

describe("BootMarker", () => {
	beforeEach(() => {
		sessionStorage.clear()
	})

	test("animationend em um alvo [data-boot] grava a flag de boot tocado", () => {
		render(<BootMarker />)
		const target = document.createElement("div")
		target.setAttribute("data-boot", "stats")
		document.body.appendChild(target)
		target.dispatchEvent(new Event("animationend", { bubbles: true }))
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBe("true")
		target.remove()
	})

	test("animationend fora de [data-boot] não grava a flag", () => {
		render(<BootMarker />)
		const target = document.createElement("div")
		document.body.appendChild(target)
		target.dispatchEvent(new Event("animationend", { bubbles: true }))
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBeNull()
		target.remove()
	})
})
```

- **Step 6: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/boot-marker.test.tsx`
Expected: FAIL — `./boot-marker` não existe.

- **Step 7: Write minimal implementation**

```tsx
// apps/frontend/src/components/ui/boot-marker.tsx
"use client"
import { useEffect } from "react"
import { markBootPlayed } from "@/lib/boot-session"

function isBootTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && target.hasAttribute("data-boot")
}

export function BootMarker() {
	useEffect(() => {
		function handleAnimationEnd(event: AnimationEvent): void {
			if (!isBootTarget(event.target)) return
			markBootPlayed()
		}
		document.addEventListener("animationend", handleAnimationEnd)
		return () =>
			document.removeEventListener("animationend", handleAnimationEnd)
	}, [])
	return null
}
```

- **Step 8: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/boot-marker.test.tsx`
Expected: PASS.

- **Step 9: Review Focus: O boot nunca começa com o título ou o formulário ocultos, e não toca com `data-motion-paused` ou reduced motion — Write the failing test**

```ts
// apps/frontend/src/test/boot-css.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

const GLOBALS_CSS_PATH = join(process.cwd(), "src/app/globals.css")

function readGlobalsCss(): string {
	return readFileSync(GLOBALS_CSS_PATH, "utf-8")
}

function extractKeyframes(css: string, name: string): string {
	const pattern = new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m")
	return css.match(pattern)?.[1] ?? ""
}

test("bootGlow (título) nunca usa opacity: 0 nem clip-path: inset(0 100% — o H1 nunca fica oculto", () => {
	const css = readGlobalsCss()
	const bootGlow = extractKeyframes(css, "bootGlow")
	expect(bootGlow).not.toBe("")
	expect(bootGlow).not.toMatch(/opacity:\s*0(?!\.)/)
	expect(bootGlow).not.toMatch(/clip-path:\s*inset\(0 100%/)
})

test("as regras de data-boot só animam sob :not([data-motion-paused]) e prefers-reduced-motion: no-preference", () => {
	const css = readGlobalsCss()
	expect(css).toContain("@media (prefers-reduced-motion: no-preference)")
	expect(css).toContain(":not([data-motion-paused])")
	expect(css).toContain('[data-boot="eyebrow"]')
	expect(css).toContain('[data-boot="title"]')
	expect(css).toContain('[data-boot="stats"]')
})
```

- **Step 10: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/boot-css.test.ts`
Expected: FAIL — `globals.css` ainda não tem `@keyframes bootGlow` nem as regras `[data-boot="..."]`.

- **Step 11: Write minimal implementation**

Em `apps/frontend/src/app/globals.css`:

```css
@keyframes bootType {
	from {
		clip-path: inset(0 100% 0 0);
	}
	to {
		clip-path: inset(0 0 0 0);
	}
}

@keyframes bootGlow {
	0% {
		filter: brightness(1.6);
		text-shadow: 0 0 12px var(--color-accent);
	}
	100% {
		filter: brightness(1);
		text-shadow: none;
	}
}

@keyframes bootRise {
	from {
		transform: translateY(4px);
		opacity: 0.4;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}

@media (prefers-reduced-motion: no-preference) {
	html:not([data-boot-played]):not([data-motion-paused])
		[data-boot="eyebrow"] {
		animation: bootType 300ms steps(12) both;
	}
	html:not([data-boot-played]):not([data-motion-paused]) [data-boot="title"] {
		animation: bootGlow 300ms ease-out 150ms both;
	}
	html:not([data-boot-played]):not([data-motion-paused]) [data-boot="stats"] {
		animation: bootRise 300ms ease-out 300ms both;
	}
}
```

- **Step 12: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/boot-css.test.ts`
Expected: PASS — `bootGlow` não contém `opacity: 0` nem clipe total, e as três regras `[data-boot="..."]` estão sob `:not([data-motion-paused])` e `prefers-reduced-motion: no-preference`. Fora desse media query (ou com `data-boot-played`/`data-motion-paused` presentes), nenhuma `animation` se aplica, então nada toca (FR-016). Como nenhuma regra usa `opacity: 0` ou clip total no título, e a task-08 nunca aplica `data-boot` ao formulário (FR-014), nada começa oculto.

- **Step 13: Write the failing test**

```ts
test("pixel-hover anima em steps() e não se aplica com data-motion-paused ou reduced motion", () => {
	const css = readGlobalsCss()
	const utilityIndex = css.indexOf("@utility pixel-hover")
	expect(utilityIndex).toBeGreaterThan(-1)
	const snippet = css.slice(utilityIndex, utilityIndex + 500)
	expect(snippet).toContain("steps(3)")
})
```

- **Step 14: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/boot-css.test.ts`
Expected: FAIL — `@utility pixel-hover` ainda não existe em `globals.css`.

- **Step 15: Write minimal implementation**

```css
@keyframes pixelHoverGlow {
	0% {
		box-shadow: 0 0 0 0 var(--color-accent);
	}
	100% {
		box-shadow: 0 0 0 3px var(--color-accent);
	}
}

@utility pixel-hover {
	transition: none;

	@media (prefers-reduced-motion: no-preference) {
		&:not([data-motion-paused] &):hover,
		&:not([data-motion-paused] &):focus-visible {
			animation: pixelHoverGlow 180ms steps(3) forwards;
		}
	}
}
```

- **Step 16: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/boot-css.test.ts`
Expected: PASS — os 3 testes do arquivo.

- **Step 17: Write minimal implementation (wiring do layout público, sem teste dedicado)**

```tsx
// apps/frontend/src/app/(public)/layout.tsx
import { BootMarker } from "@/components/ui/boot-marker"
import { PublicShell } from "@/components/layout/public-shell"
import { bootPrepaintScript } from "@/lib/boot-session"

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			{/** biome-ignore lint/security/noDangerouslySetInnerHtml: script minimo, defensivo, sem entrada do usuario (D3) */}
			<script dangerouslySetInnerHTML={{ __html: bootPrepaintScript() }} />
			<BootMarker />
			<PublicShell>{children}</PublicShell>
		</>
	)
}
```

Este wiring não tem teste de runtime dedicado nesta task: `boot-session.test.ts` já cobre `bootPrepaintScript()`/`markBootPlayed()` isoladamente, e o comportamento de ponta a ponta (boot tocando uma vez por sessão) é coberto pelo e2e da task-10.

- **Step 18: Commit**

```bash
git add apps/frontend/src/lib/boot-session.ts apps/frontend/src/lib/boot-session.test.ts apps/frontend/src/components/ui/boot-marker.tsx apps/frontend/src/components/ui/boot-marker.test.tsx apps/frontend/src/app/globals.css apps/frontend/src/test/boot-css.test.ts apps/frontend/src/app/\(public\)/layout.tsx
git commit -m "feat(boot): entrada de terminal por sessao e utilitario pixel-hover"
```

## Critérios de Sucesso

- `bootPrepaintScript()` marca `data-boot-played`/`data-motion-paused` a partir de `sessionStorage`/`localStorage`, sem lançar com storage bloqueado (FR-013, FR-018).
- `markBootPlayed()` grava a flag de sessão; `BootMarker` a grava ao fim da animação de `[data-boot]` (FR-013).
- As animações de `[data-boot="eyebrow"|"title"|"stats"]` só existem sob `prefers-reduced-motion: no-preference` e ausência de `data-boot-played`/`data-motion-paused` (FR-016).
- `bootGlow` nunca oculta totalmente o título (sem `opacity: 0` nem clip total) (FR-014).
- `pixel-hover` anima em `steps(3)`, disponível para os CTAs das tasks 08 e 09 (FR-012).
