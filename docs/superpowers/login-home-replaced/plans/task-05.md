# Task 5: Cena pixel sunset e sol em faixas [FR-005, FR-007]

**Status:** PENDING

**PRD:** `../prd/prd-login-home-replaced.md`

**Spec:** `../specs/login-home-replaced-design.md`

**Tier:** standard

## Visão Geral

Adiciona a cena `sunset` ao `PixelScene` (skyline em opacidade reduzida sobre um céu de pôr do sol) e uma camada reaproveitável de sol pixelado em faixas horizontais, habilitada tanto em `sunset` quanto na cena `login` existente (cidade à noite com sol baixo). Todas as cores continuam vindo de tokens CSS, nunca de literais.

## Arquivos

- Modify: `apps/frontend/src/components/ui/pixel-scene.tsx`
- Modify: `apps/frontend/src/app/globals.css`
- Test: `apps/frontend/src/components/ui/pixel-scene.test.tsx`

## Interfaces

- **Consome:** N/A.
- **Produz:** `PixelSceneName = "login" | "hero" | "empty" | "sunset"`; camada `SunLayer` (marcada `data-layer="sun"`) habilitada nas cenas `login` e `sunset`; token `--color-scene-sun` em `globals.css` (`@theme`, `.dark`, `.sunset`) — consumidos por task-06 (`PixelTrail` lê `--color-scene-sun` como uma das cores do rastro), task-08 (login usa `PixelScene scene="login"` já com sol) e task-09 (home usa `PixelScene scene="sunset"`).

### Skills a invocar

- `impeccable`: geometria pixel-art consistente com as camadas já existentes (`SceneLayer`, `BeamLayer`, `WindowLayer`), sem introduzir um novo padrão visual solto.
- `tailwindcss`: opacidade da skyline via `style`/classe, sem `corner-shape` ou tokens fora do já existente.
- `vercel-react-best-practices`: `SunLayer` como componente puro reaproveitado por duas entradas de `SCENES`, sem duplicar JSX.
- `test-antipatterns`: testar por `data-scene`/`data-layer` (já usados no componente), não por snapshot de SVG.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/login-home-replaced-visual.md` ("Login (imersivo)": "sol pixelado em listras"; "Home (sutil)": "skyline a ~60% de opacidade").
- **Fonte de design original:** nenhuma; seguir o mockup curado.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a cena `sunset` e o disco de sol?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `playwright-cli` e MCP `claude-in-chrome` — capturar `/` e `/login` renderizados e comparar a proporção do sol e a opacidade da skyline com o norte do mockup.
- **Decisões visuais já tomadas (não refazer):** viewBox `64x32` compartilhado entre camadas; cores só via `var(--color-*)`; janelas em 5 buckets de delay (inalterado); scanlines só no tema escuro/pôr do sol (já resolvido pela task-01).

## Passos

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/components/ui/pixel-scene.test.tsx (acrescentar)
import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PixelScene } from "./pixel-scene"

describe("PixelScene — sunset e sol", () => {
	test("renderiza data-scene=sunset com aria-hidden e a camada de sol", () => {
		const { container } = render(<PixelScene scene="sunset" animated />)
		const scene = container.querySelector('[data-scene="sunset"]')
		expect(scene).not.toBeNull()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(container.querySelector('[data-layer="sun"]')).not.toBeNull()
	})

	test("a cena login também exibe a camada de sol", () => {
		const { container } = render(<PixelScene scene="login" animated />)
		expect(container.querySelector('[data-layer="sun"]')).not.toBeNull()
	})

	test("a cena hero não exibe a camada de sol", () => {
		const { container } = render(<PixelScene scene="hero" animated />)
		expect(container.querySelector('[data-layer="sun"]')).toBeNull()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pixel-scene.test.tsx`
Expected: FAIL — `PixelSceneName` não inclui `"sunset"` (`PixelScene` cai no fallback `SceneFallback`, sem `data-scene="sunset"`); nenhuma cena tem `data-layer="sun"`.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/app/globals.css`, adicionar o token `--color-scene-sun` em `@theme` (claro), `.dark` e `.sunset`:

```css
/* dentro de @theme { ... } */
--color-scene-sun: #f5a76b;
```

```css
/* dentro de .dark { ... } */
--color-scene-sun: #ffb454;
```

```css
/* dentro de .sunset { ... } */
--color-scene-sun: #ffd9a0;
```

Em `apps/frontend/src/components/ui/pixel-scene.tsx`:

```ts
export type PixelSceneName = "login" | "hero" | "empty" | "sunset"
```

```ts
interface SceneDefinition {
	far: ReadonlyArray<Building>
	near: ReadonlyArray<Building>
	windowsAccent: ReadonlyArray<Point>
	windowsPrimary: ReadonlyArray<Point>
	beams: ReadonlyArray<Beam>
	sun: boolean
	skylineOpacity: number
}
```

```ts
const SCENES: Record<PixelSceneName, SceneDefinition> = {
	login: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT,
		windowsPrimary: WINDOWS_PRIMARY,
		beams: [
			{ x: 12, width: 4, tone: "accent" },
			{ x: 40, width: 3, tone: "primary" },
		],
		sun: true,
		skylineOpacity: 1,
	},
	hero: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 8),
		windowsPrimary: WINDOWS_PRIMARY.slice(0, 2),
		beams: [
			{ x: 20, width: 4, tone: "accent" },
			{ x: 50, width: 3, tone: "primary" },
		],
		sun: false,
		skylineOpacity: 1,
	},
	empty: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 4),
		windowsPrimary: [],
		beams: [{ x: 28, width: 5, tone: "accent" }],
		sun: false,
		skylineOpacity: 1,
	},
	sunset: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 6),
		windowsPrimary: WINDOWS_PRIMARY.slice(0, 2),
		beams: [{ x: 30, width: 5, tone: "primary" }],
		sun: true,
		skylineOpacity: 0.6,
	},
}
```

Camada de sol e uso na skyline:

```tsx
const SUN_STRIPES: ReadonlyArray<
	readonly [y: number, height: number, xInset: number]
> = [
	[4, 2, 22],
	[6, 2, 18],
	[8, 2, 14],
	[10, 2, 10],
	[12, 2, 10],
	[14, 2, 14],
]

function SunLayer() {
	return (
		<div className="pixel-scene-sun absolute inset-0" data-layer="sun">
			<SceneLayer>
				{SUN_STRIPES.map(([y, height, xInset], index) => (
					<rect
						key={y}
						x={xInset}
						y={y}
						width={VIEWBOX_WIDTH - xInset * 2}
						height={height}
						fill="var(--color-scene-sun)"
						fillOpacity={index % 2 === 0 ? 1 : 0.85}
					/>
				))}
			</SceneLayer>
		</div>
	)
}
```

Em `SceneArt`, inserir a camada de sol logo após o retângulo de fundo (antes dos feixes) e envolver a skyline com a opacidade da cena:

```tsx
<SceneLayer>
	<rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--color-surface)" />
</SceneLayer>
{definition.sun ? <SunLayer /> : null}
{definition.beams.map((beam) => (
	<BeamLayer key={`${beam.tone}-${beam.x}`} beam={beam} />
))}
<div className="absolute inset-0" style={{ opacity: definition.skylineOpacity }}>
	<SceneLayer>
		<Skyline buildings={definition.far} fill="var(--color-surface-3)" />
		<Skyline buildings={definition.near} fill="var(--color-surface-2)" />
	</SceneLayer>
</div>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/pixel-scene.test.tsx`
Expected: PASS — `data-scene="sunset"` renderiza com `aria-hidden="true"` e `[data-layer="sun"]`; `login` também tem `[data-layer="sun"]`; `hero` não tem.

- **Step 5: Commit**

```bash
git add apps/frontend/src/components/ui/pixel-scene.tsx apps/frontend/src/app/globals.css apps/frontend/src/components/ui/pixel-scene.test.tsx
git commit -m "feat(pixel-scene): cena sunset e camada de sol em faixas"
```

## Critérios de Sucesso

- `PixelScene scene="sunset"` renderiza `data-scene="sunset"`, `aria-hidden="true"` e a camada de sol (FR-007).
- `PixelScene scene="login"` mantém a grade e ganha a camada de sol (FR-005).
- A skyline da cena `sunset` renderiza com opacidade reduzida (~0.6).
- Nenhuma cor literal fora de `var(--color-*)` nas camadas novas (guard `no-literal-colors.test.ts` continua verde).
