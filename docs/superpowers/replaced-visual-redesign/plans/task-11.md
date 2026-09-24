# Task 11: Capa de academia sem imagem usa cena [FR-009]

**Status:** DONE

**PRD:** `../prd/prd-replaced-visual-redesign.md`

**Spec:** `../specs/replaced-visual-redesign-design.md`

**Tier:** standard

**Depends on:** task-07

## Visão Geral

Quando a academia não tem imagem, a capa mostra a cena pixel `hero` no lugar do ícone genérico; quando há imagem válida, a imagem prevalece e nenhuma cena é renderizada. A cena anima na capa do card e fica estática na miniatura da linha (`GymRow`), para não multiplicar animações em listas longas. O `data-testid="gym-image-placeholder"` é mantido.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-image.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-image.test.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`

## Interfaces

- **Consome:** de task-07, `apps/frontend/src/components/ui/pixel-scene.tsx`: `export function PixelScene({ scene, animated = false, className }: PixelSceneProps)`; SVG com `data-scene` e `data-paused`. Já existente no repositório: `gymImageUrl(imageKey: string | null | undefined): string | null` em `@/features/gyms/lib/gym-image-url` (devolve `null` para `null`, `undefined` ou vazio após `trim`).
- **Produz:** `apps/frontend/src/features/gyms/components/gym-image.tsx`:
  - `GymImageProps` ganha `sceneAnimated?: boolean` (default `false`)
  - `export function GymImage({ imageKey, alt, className, loading = "lazy", hoverEffect = true, sceneAnimated = false }: GymImageProps)`
  - Sem URL, renderiza `<div data-testid="gym-image-placeholder">` contendo `PixelScene scene="hero"`; com URL, o `<motion.img data-testid="gym-image">` de antes e nenhuma cena.

### Conformidade com as Skills Padrão

- `frontend-design`: skyline pixel como capa de fallback, coerente com o mockup de Academias.
- `vercel-composition-patterns`: `sceneAnimated` é a única prop nova; `GymRow` usa o default (estático), `GymCard` liga a animação.
- `vercel-react-best-practices`: a decisão imagem ou cena continua derivada de `gymImageUrl(imageKey)` no render, sem estado novo.
- `tailwindcss`: o wrapper com o fundo listrado por tokens permanece para o carregamento da imagem.
- `wcag-audit-patterns`: a cena é `aria-hidden`; o `alt` só existe na imagem real.
- `test-antipatterns`: os testes assertam o resultado visível (imagem ou cena) para cada chave.
- `no-workarounds`: a regra de "chave vazia" fica em `gymImageUrl`, sem duplicar `trim` no componente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/replaced-visual-redesign-academias-visual.md` (capa de 140px; skyline só como fallback quando não há imagem); base visual em `../specs/mockups/replaced-visual-redesign-visual.md`
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para a capa? A spec registra "nenhuma".
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma além do `playwright-cli` para conferir no navegador; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** com imagem, a imagem prevalece; sem imagem, cena `hero`; miniatura da linha sem animação; capa do card animada

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler o bloco `### Fidelidade Visual`. Sem fonte de design nem ferramenta de design-to-code: construir contra o mockup e conferir com `playwright-cli` no fim do lote.

- **Step 1: Write the failing test**

Em `apps/frontend/src/features/gyms/components/gym-image.test.tsx`, substituir o teste `renderiza o placeholder quando não há imageKey` por (o restante do arquivo fica):

```tsx
	test("renderiza o placeholder com a cena pixel quando não há imageKey", () => {
		const { container } = renderWithProviders(
			<GymImage imageKey={null} alt="Academia Volt" />,
		)
		const placeholder = screen.getByTestId("gym-image-placeholder")
		expect(placeholder).toBeInTheDocument()
		expect(
			placeholder.querySelector('svg[data-scene="hero"]'),
		).toHaveAttribute("aria-hidden", "true")
		expect(screen.queryByTestId("gym-image")).not.toBeInTheDocument()
		expect(container.querySelectorAll("svg[data-scene]")).toHaveLength(1)
	})

	test("a cena de fallback é estática por padrão (miniatura da linha)", () => {
		renderWithProviders(<GymImage imageKey={null} alt="Academia Volt" />)
		expect(
			screen
				.getByTestId("gym-image-placeholder")
				.querySelector("svg[data-scene]"),
		).toHaveAttribute("data-paused", "true")
	})

	test("com sceneAnimated a cena de fallback anima", () => {
		renderWithProviders(
			<GymImage imageKey={null} alt="Academia Volt" sceneAnimated />,
		)
		expect(
			screen
				.getByTestId("gym-image-placeholder")
				.querySelector("svg[data-scene]"),
		).toHaveAttribute("data-paused", "false")
	})
```

Acrescentar dentro do `describe("GymCard VOLT", ...)` de `gym-card.test.tsx` (usa `gym` e `renderWithProviders` já existentes):

```tsx
	test("sem imagem, a capa do card exibe a cena pixel animada", () => {
		const { container } = renderWithProviders(
			<GymCard gym={{ ...gym, imageKey: null }} />,
		)
		expect(container.querySelector('svg[data-scene="hero"]')).toHaveAttribute(
			"data-paused",
			"false",
		)
	})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/features/gyms/components/gym-image.test.tsx src/features/gyms/components/gym-card.test.tsx`
Expected: FAIL. Os testes de fallback falham com `expect(received).toHaveAttribute` / `toBeInTheDocument` sobre `null` (o placeholder atual tem só o ícone, sem `svg[data-scene="hero"]`); o teste do card falha da mesma forma; o de imagem válida passa.

- **Step 3: Review Focus: Chave de imagem da academia vazia ou só com espaços → fallback de cena; chave válida → imagem prevalece — Write the failing test**

Acrescentar ao final de `gym-image.test.tsx`:

```tsx
describe("GymImage — chave de imagem vazia ou só com espaços", () => {
	test("chave vazia ou só com espaços usa a cena; chave válida faz a imagem prevalecer", () => {
		for (const emptyKey of ["", "   ", "\t\n", undefined, null]) {
			const { container, unmount } = renderWithProviders(
				<GymImage imageKey={emptyKey} alt="Academia Volt" />,
			)
			expect(screen.getByTestId("gym-image-placeholder")).toBeInTheDocument()
			expect(container.querySelector('svg[data-scene="hero"]')).toBeInTheDocument()
			expect(screen.queryByTestId("gym-image")).not.toBeInTheDocument()
			unmount()
		}

		const { container } = renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		expect(screen.getByTestId("gym-image")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-image-placeholder")).not.toBeInTheDocument()
		expect(container.querySelector("[data-scene]")).toBeNull()
	})
})
```

- **Step 4: Run test to verify it fails**

Run: `pnpm --filter frontend test src/features/gyms/components/gym-image.test.tsx -t "chave vazia"`
Expected: FAIL com `expect(element).toBeInTheDocument()` sobre `null` para `svg[data-scene="hero"]` já na primeira chave (`""`): o placeholder atual mostra só o ícone.

- **Step 5: Write minimal implementation**

Em `apps/frontend/src/features/gyms/components/gym-image.tsx`:

- remover `import { ImageIcon } from "lucide-react"` e acrescentar `import { PixelScene } from "@/components/ui/pixel-scene"`;
- acrescentar `sceneAnimated?: boolean` a `GymImageProps` e `sceneAnimated = false` aos parâmetros desestruturados de `GymImage`;
- substituir o ramo sem URL por:

```tsx
			) : (
				<div data-testid="gym-image-placeholder" className="h-full w-full">
					<PixelScene scene="hero" animated={sceneAnimated} />
				</div>
			)}
```

Em `apps/frontend/src/features/gyms/components/gym-card.tsx`, no `<GymImage ... />` acrescentar `sceneAnimated`:

```tsx
					<GymImage
						imageKey={gym.imageKey}
						alt={gym.title}
						className="h-full w-full"
						hoverEffect={false}
						sceneAnimated
					/>
```

`gym-row.tsx` não muda (usa o default estático).

- **Step 6: Run test to verify it passes**

Run: `pnpm --filter frontend test src/features/gyms/components/gym-image.test.tsx src/features/gyms/components/gym-card.test.tsx src/features/gyms/components/gym-row.test.tsx src/features/gyms/components/gym-card-skeleton.test.tsx`
Expected: PASS

- **Step 7: Commit** *(only when `workflow.auto_commit` is true — otherwise skip and report the files instead.)*

```bash
git add apps/frontend/src/features/gyms/components/gym-image.tsx apps/frontend/src/features/gyms/components/gym-image.test.tsx apps/frontend/src/features/gyms/components/gym-card.tsx apps/frontend/src/features/gyms/components/gym-card.test.tsx
git commit -m "feat(frontend): capa de academia sem imagem usa cena pixel"
```

## Critérios de Sucesso

- Chave de imagem `null`, `undefined`, vazia ou só com espaços resulta na cena `hero` dentro de `gym-image-placeholder`; chave válida mostra a imagem e nenhuma cena (FR-009).
- A cena é animada na capa do card e estática na miniatura da linha.
- O teste do Review Focus cobre chave vazia, só espaços e chave válida no mesmo componente.
