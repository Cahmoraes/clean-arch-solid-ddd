# Task 12: Componente `GymImage` (cover + gradiente + zoom + placeholder) [FR-010, FR-011, FR-012, FR-013]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-11

## Visão Geral

Cria o componente de exibição da imagem da academia: preenche o slot com `object-cover` (FR-010), aplica overlay com gradiente inferior (FR-011) e zoom suave no hover via `group-hover` (FR-012), e mostra um placeholder elegante quando não há imagem (FR-013). É reutilizado pelo card e pelo detalhe.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/gym-image.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-image.test.tsx`

### Conformidade com as Skills Padrão

- use frontend-design: tratamento visual fiel ao VOLT (gradiente + hover), tokens do tema.
- use tailwindcss: classes utilitárias v4; `group-hover` para o zoom controlado pelo card pai.
- use test-antipatterns: testa o que o usuário vê (img com src/alt vs placeholder).

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/gyms/components/gym-image.test.tsx`:

```tsx
import { screen } from "@testing-library/react"
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
		expect(img).toHaveAttribute(
			"src",
			`${API_BASE_URL}/uploads/gyms/foto.webp`,
		)
		expect(img).toHaveAttribute("alt", "Academia Volt")
	})

	test("renderiza o placeholder quando não há imageKey", () => {
		renderWithProviders(<GymImage imageKey={null} alt="Academia Volt" />)
		expect(screen.getByTestId("gym-image-placeholder")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-image")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "GymImage"`
Expected: FAIL — módulo `./gym-image` não existe.

- **Step 3: Implementar o componente**

Crie `apps/frontend/src/features/gyms/components/gym-image.tsx`:

```tsx
import { ImageIcon } from "lucide-react"
import { gymImageUrl } from "@/features/gyms/lib/gym-image-url"
import { cn } from "@/lib/cn"

export interface GymImageProps {
	imageKey: string | null | undefined
	alt: string
	className?: string
}

export function GymImage({ imageKey, alt, className }: GymImageProps) {
	const url = gymImageUrl(imageKey)
	return (
		<div
			className={cn(
				"relative overflow-hidden bg-[repeating-linear-gradient(135deg,var(--color-surface-2)_0_10px,var(--color-surface-3)_10px_20px)]",
				className,
			)}
		>
			{url ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={url}
					alt={alt}
					data-testid="gym-image"
					loading="lazy"
					className="h-full w-full object-cover transition-[transform,filter] duration-300 ease-out group-hover:scale-[1.07] group-hover:brightness-105"
				/>
			) : (
				<div
					data-testid="gym-image-placeholder"
					className="flex h-full w-full items-center justify-center"
				>
					<ImageIcon
						className="h-6 w-6 text-subtle"
						aria-hidden="true"
					/>
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

> O zoom no hover usa `group-hover:*`, então o elemento pai (o card, na task-13) precisa ter a classe `group`. No detalhe, sem `group`, a imagem fica estática com o gradiente — comportamento desejado.

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter frontend test -- -t "GymImage"`
Expected: PASS (2 testes).

- **Step 5: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add apps/frontend/src/features/gyms/components/gym-image.tsx apps/frontend/src/features/gyms/components/gym-image.test.tsx
git commit -m "feat(gyms): add GymImage component (cover + gradient + hover zoom + placeholder)"
```

## Critérios de Sucesso

- Com `imageKey`: renderiza `<img>` com `object-cover`, gradiente inferior e zoom no hover (`group-hover`). [FR-010, FR-011, FR-012]
- Sem `imageKey`: renderiza placeholder. [FR-013]
- Testes, `tsc:check` e `lint:fix` sem problemas.
