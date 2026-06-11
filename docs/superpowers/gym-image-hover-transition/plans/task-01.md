# Task 1: Suavizar transição de hover da imagem

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/gym-image-hover-transition-design.md`
**Depends on:** N/A

## Visão Geral

Alterar as classes Tailwind do `<img>` dentro de `GymImage` para trocar o easing `ease-out` (que causa "salto" no início da animação) por `ease-in-out`, aumentar a duração de 300ms para 500ms e reduzir o scale de 1.07 para 1.05. Nenhum outro arquivo é alterado.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-image.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-image.test.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: não usar `!important` ou override inline para contornar o Tailwind — a troca de classe é suficiente
- test-antipatterns: não testar o visual renderizado via snapshot de HTML inteiro; assertar apenas as classes relevantes no elemento alvo

## Passos

- **Step 1: Escrever o teste falhando**

Abra `apps/frontend/src/features/gyms/components/gym-image.test.tsx` e adicione o teste abaixo **dentro** do `describe("GymImage")`, após os dois testes existentes:

```tsx
test("imagem possui classes de transição suave (ease-in-out, 500ms, scale-1.05)", () => {
  renderWithProviders(
    <GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
  )
  const img = screen.getByTestId("gym-image")
  expect(img.className).toContain("duration-500")
  expect(img.className).toContain("ease-in-out")
  expect(img.className).toContain("scale-[1.05]")
})
```

- **Step 2: Rodar o teste para confirmar que falha**

```bash
pnpm --filter frontend test -- -t "imagem possui classes de transição suave"
```

Saída esperada: `FAIL` — as classes `duration-500`, `ease-in-out` e `scale-[1.05]` ainda não existem no componente.

- **Step 3: Implementar a mudança**

Abra `apps/frontend/src/features/gyms/components/gym-image.tsx`.

Localize o `<img>` com `data-testid="gym-image"` e substitua as classes de transição:

```tsx
// Antes
className="h-full w-full object-cover transition-[transform,filter] duration-300 ease-out group-hover:scale-[1.07] group-hover:brightness-105"

// Depois
className="h-full w-full object-cover transition-[transform,filter] duration-500 ease-in-out group-hover:scale-[1.05] group-hover:brightness-105"
```

O arquivo completo após a mudança:

```tsx
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
				<img
					src={url}
					alt={alt}
					data-testid="gym-image"
					loading={loading}
					className="h-full w-full object-cover transition-[transform,filter] duration-500 ease-in-out group-hover:scale-[1.05] group-hover:brightness-105"
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

- **Step 4: Rodar os testes do componente**

```bash
pnpm --filter frontend test -- -t "GymImage"
```

Saída esperada: todos os 3 testes `PASS`.

- **Step 5: Rodar lint, typecheck e suite completa**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test
```

Saída esperada: zero erros de lint, zero erros de TypeScript, todos os testes passando.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-image.tsx \
        apps/frontend/src/features/gyms/components/gym-image.test.tsx
git commit -m "feat: suaviza transição de hover da imagem no GymCard"
```

## Critérios de Sucesso

- `gym-image.test.tsx` possui 3 testes e todos passam
- `<img data-testid="gym-image">` contém exatamente `duration-500`, `ease-in-out` e `group-hover:scale-[1.05]`
- `gym-card.tsx` não foi alterado
- `pnpm --filter frontend lint:fix`, `tsc:check` e `test` passam sem erros
