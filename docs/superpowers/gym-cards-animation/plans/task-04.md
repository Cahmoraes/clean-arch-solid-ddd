# Task 04: Migrar GymImage para motion.img com blur-up [FR-006, FR-007, FR-008, FR-009]

**Status:** PENDING
**PRD:** `../prd/prd-gym-cards-animation.md`
**Spec:** `../specs/gym-cards-animation-design.md`
**Depends on:** task-01, task-03

## Visão Geral

Substitui o `<img>` simples no `GymImage` por `<motion.img>` com:
- **Blur-up**: `initial={{ opacity: 0, filter: "blur(8px)" }}` e `animate` controlado por estado `loaded` (via `onLoad` callback) → transição suave de blur para nitidez ao carregar
- **Hover Motion**: `whileHover={{ scale: 1.05, filter: "brightness(1.08) blur(0px)" }}`
- **Remove** `group-hover:scale-[1.05]`, `group-hover:brightness-105`, `transition-[transform,filter]`, `duration-500`, `ease-in-out` do className

Como `useState` é adicionado, `"use client"` precisa ser adicionado ao `GymImage`.

Atualiza `gym-image.test.tsx`: remove o teste que verificava classes Tailwind legadas e adiciona novos testes para as novas responsabilidades.

**Atenção:** Não usar `next/image` — o codebase usa `<img>` deliberadamente (otimização server-side via sharp, já documentada no biome-ignore comment).

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-image.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-image.test.tsx`

### Conformidade com as Skills Padrão

- code-style: `"use client"` no topo, tabs, aspas duplas
- no-workarounds: blur-up via estado React + `onLoad`, não via setTimeout ou CSS hack

## Passos

### Step 1: Atualizar o arquivo de testes (remover teste legado, adicionar novos)

Substituir o conteúdo completo de `apps/frontend/src/features/gyms/components/gym-image.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { API_BASE_URL } from "@/lib/api"
import { renderWithProviders } from "@/test/render"
import { GymImage } from "./gym-image"

describe("GymImage", () => {
	test("renderiza a imagem com src e alt quando há imageKey", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image") as HTMLImageElement
		expect(img).toHaveAttribute("src", `${API_BASE_URL}/uploads/gyms/foto.webp`)
		expect(img).toHaveAttribute("alt", "Academia Volt")
	})

	test("renderiza o placeholder quando não há imageKey", () => {
		renderWithProviders(<GymImage imageKey={null} alt="Academia Volt" />)
		expect(screen.getByTestId("gym-image-placeholder")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-image")).not.toBeInTheDocument()
	})

	test("imagem não possui classes Tailwind de hover/transição legadas", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image")
		expect(img.className).not.toContain("group-hover:scale-[1.05]")
		expect(img.className).not.toContain("group-hover:brightness-105")
		expect(img.className).not.toContain("duration-500")
		expect(img.className).not.toContain("ease-in-out")
	})

	test("imagem permanece no DOM após acionar o evento onLoad", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image")
		fireEvent.load(img)
		expect(screen.getByTestId("gym-image")).toBeInTheDocument()
	})
})
```

### Step 2: Rodar os testes atualizados para confirmar que o teste legado não existe mais e os novos falham no ponto certo

```bash
pnpm --filter frontend test:run -- -t "GymImage"
```

Resultado esperado: FAIL no teste "imagem não possui classes Tailwind de hover/transição legadas" (as classes ainda existem no componente atual). Os outros 3 testes passam ou falham por motivo relacionado.

### Step 3: Implementar a migração no GymImage

Substituir o conteúdo completo de `apps/frontend/src/features/gyms/components/gym-image.tsx`:

```tsx
"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { ImageIcon } from "lucide-react"
import { gymImageUrl } from "@/features/gyms/lib/gym-image-url"
import { cn } from "@/lib/cn"

export interface GymImageProps {
	imageKey: string | null | undefined
	alt: string
	className?: string
	loading?: "lazy" | "eager"
}

export function GymImage({
	imageKey,
	alt,
	className,
	loading = "lazy",
}: GymImageProps) {
	const [loaded, setLoaded] = useState(false)
	const url = gymImageUrl(imageKey)

	return (
		<div
			className={cn(
				"relative overflow-hidden bg-[repeating-linear-gradient(135deg,var(--color-surface-2)_0_10px,var(--color-surface-3)_10px_20px)]",
				className,
			)}
		>
			{url ? (
				// biome-ignore lint/performance/noImgElement: imagem já otimizada server-side (sharp 800x450 webp); next/image seria redundante e exigiria remotePatterns
				<motion.img
					src={url}
					alt={alt}
					data-testid="gym-image"
					loading={loading}
					className="h-full w-full object-cover"
					initial={{ opacity: 0, filter: "blur(8px)" }}
					animate={
						loaded
							? { opacity: 1, filter: "blur(0px)" }
							: { opacity: 0, filter: "blur(8px)" }
					}
					transition={{ duration: 0.4, ease: "easeOut" }}
					whileHover={{ scale: 1.05, filter: "brightness(1.08) blur(0px)" }}
					onLoad={() => setLoaded(true)}
				/>
			) : (
				<div
					data-testid="gym-image-placeholder"
					className="flex h-full w-full items-center justify-center"
				>
					<ImageIcon className="h-6 w-6 text-subtle" aria-hidden="true" />
				</div>
			)}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent"
			/>
		</div>
	)
}
```

**Mudanças principais:**
- Adicionado `"use client"` (necessário para `useState`)
- Adicionado `import { useState } from "react"`
- Adicionado `import { motion } from "motion/react"`
- `const [loaded, setLoaded] = useState(false)`
- `<img>` → `<motion.img>` com `initial`, `animate`, `transition`, `whileHover`, `onLoad`
- className da imagem: removido `transition-[transform,filter] duration-500 ease-in-out group-hover:scale-[1.05] group-hover:brightness-105`; mantido `h-full w-full object-cover`

### Step 4: Rodar os testes para confirmar que passam

```bash
pnpm --filter frontend test:run -- -t "GymImage"
```

Resultado esperado: PASS — todos os 4 testes verdes.

### Step 5: Rodar a suite completa dos componentes gyms para detectar regressões

```bash
pnpm --filter frontend test:run -- --reporter=verbose src/features/gyms
```

Resultado esperado: todos os testes de `gym-card.test.tsx`, `gym-image.test.tsx`, `gym-results.test.tsx` passam.

### Step 6: Rodar lint e typecheck

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Resultado esperado: 0 erros Biome, 0 erros TypeScript.

### Step 7: Commit

```bash
git add apps/frontend/src/features/gyms/components/gym-image.tsx \
        apps/frontend/src/features/gyms/components/gym-image.test.tsx
git commit -m "feat(frontend): migrar GymImage para motion.img com blur-up

- Adiciona 'use client' + useState para controlar estado loaded
- Substitui <img> por <motion.img> com initial/animate/whileHover
- Blur-up: opacity 0 + blur(8px) → opacity 1 + blur(0px) via onLoad
- Hover: scale(1.05) + brightness(1.08)
- Remove classes Tailwind group-hover:*, duration-500, ease-in-out
- Atualiza testes: remove teste legado de className, adiciona onLoad

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `pnpm --filter frontend test:run -- -t "GymImage"` passa com 4 testes verdes
- `pnpm --filter frontend biome:fix` reporta zero problemas
- `pnpm --filter frontend tsc:check` passa sem erros
- `gym-image.tsx` tem `"use client"` no topo [FR-007]
- `gym-image.tsx` usa `motion.img` com `initial={{ opacity: 0, filter: "blur(8px)" }}` [FR-008]
- `gym-image.tsx` usa `whileHover={{ scale: 1.05, filter: "brightness(1.08) blur(0px)" }}` [FR-006]
- `gym-image.tsx` não contém `group-hover:`, `duration-500`, `ease-in-out` [FR-009]
- `onLoad` dispara `setLoaded(true)` e controla o `animate` [FR-007, FR-008]
