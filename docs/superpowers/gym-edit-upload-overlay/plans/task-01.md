# Task 1: Criar GymImageEditOverlay: componente, testes e handler MSW [FR-005, FR-006, FR-007, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015]

**Status:** DONE
**PRD:** `../prd/prd-gym-edit-upload-overlay.md`
**Spec:** `../specs/gym-edit-upload-overlay-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria o componente `GymImageEditOverlay` que exibe a imagem de capa da academia com um ícone Pencil no canto superior direito. Ao clicar no ícone, dispara um `input[type=file]` oculto; ao selecionar um arquivo, abre um `Dialog` com o cropper (react-easy-crop). Ao confirmar o recorte, chama `useSetGymImage()` imediatamente (upload desvinculado do submit do form). Também adiciona o handler MSW para `POST /gyms/:id/image` nos handlers de teste e escreve o arquivo de testes unitários.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.tsx`
- Create: `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.test.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts` (adicionar handler `POST /gyms/:id/image`)

### Conformidade com as Skills Padrão

- `shadcn`: uso de `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` e `Button` do shadcn/ui
- `tailwindcss`: classes Tailwind v4 para posicionamento do overlay (`absolute right-3 top-3 z-20`), backdrop-blur, hover tokens
- `tanstack-query-best-practices`: uso de `useSetGymImage()` (mutation), padrão de `mutateAsync` com error handling
- `typescript-advanced`: interface de props tipada, refs tipados (`useRef<HTMLInputElement>`), tipos importados de `react-easy-crop`
- `vercel-react-best-practices`: `useCallback` para handler de crop, separação de responsabilidades entre componente visual e lógica de upload
- `vercel-composition-patterns`: composição de `GymImage` dentro de `GymImageEditOverlay`
- `test-antipatterns`: mocks de módulo declarados no topo do arquivo, sem duplicar lógica de implementação nos testes
- `code-style`: indentação tab, aspas duplas, sem ponto-e-vírgula desnecessário (padrão Biome do projeto)

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-edit-upload-overlay-visual.md` (ícone Pencil overlay, Dialog do cropper, tokens de cor)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL Figma) para esta tela?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** inspecionar `chat.agentSkillsLocations` — `figma-to-code` disponível no repo; confirmar se URL de design existe antes de usá-la; caso contrário, construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** ícone `Pencil` em `right-3 top-3`, classes `absolute z-20 inline-flex h-9 w-9 rounded-md border border-border bg-background/80 backdrop-blur transition-colors hover:bg-background hover:text-primary`; Dialog com `sm:max-w-md max-h-[90dvh] overflow-auto`; cropper em área `h-[280px]`; botões Cancelar (outline) e Confirmar recorte (primary) no footer

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade visual**

  Ler `### Fidelidade Visual` acima. Confirmar com o usuário se existe URL de Figma ou outra fonte. Se sim, usar; caso contrário, implementar manualmente a partir do mockup curado em `../specs/mockups/gym-edit-upload-overlay-visual.md`.

- **Step 1: Adicionar handler MSW para upload de imagem**

  Abrir `apps/frontend/src/test/msw/handlers.ts`. O arquivo usa `import { HttpResponse, http } from "msw"` e uma função `endpoint(path)` com `const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"`. Adicionar o handler após os handlers de `POST /gyms` existentes:

  ```typescript
  http.post(endpoint("/gyms/:id/image"), () =>
    HttpResponse.json({ imageKey: "test-image-key" }, { status: 200 }),
  ),
  ```

- **Step 2: Escrever os testes que falham**

  Criar `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.test.tsx`:

  ```typescript
  import { fireEvent, screen, waitFor } from "@testing-library/react"
  import { describe, expect, test, vi } from "vitest"
  import { renderWithProviders } from "@/test/render"
  import { GymImageEditOverlay } from "./gym-image-edit-overlay"

  vi.mock("react-easy-crop", () => ({
  	default: ({
  		onCropComplete,
  	}: {
  		onCropComplete: (a: unknown, b: unknown) => void
  	}) => (
  		<button
  			type="button"
  			data-testid="mock-cropper"
  			onClick={() =>
  				onCropComplete({}, { x: 0, y: 0, width: 100, height: 100 })
  			}
  		>
  			mock-cropper
  		</button>
  	),
  }))

  vi.mock("@/features/gyms/lib/crop-image", () => ({
  	getCroppedBlob: vi.fn(
  		async () => new Blob(["webp"], { type: "image/webp" }),
  	),
  }))

  const defaultProps = {
  	gymId: "gym-123",
  	imageKey: null,
  	gymTitle: "Academia Teste",
  }

  describe("GymImageEditOverlay", () => {
  	test("deve renderizar o ícone de edição sobre a imagem", () => {
  		renderWithProviders(<GymImageEditOverlay {...defaultProps} />)
  		expect(
  			screen.getByTestId("gym-image-edit-overlay-btn"),
  		).toBeInTheDocument()
  	})

  	test("deve abrir o dialog ao selecionar um arquivo", () => {
  		renderWithProviders(<GymImageEditOverlay {...defaultProps} />)
  		const input = screen.getByTestId("gym-image-file-input")
  		fireEvent.change(input, {
  			target: { files: [new File(["x"], "foto.png", { type: "image/png" })] },
  		})
  		expect(screen.getByTestId("mock-cropper")).toBeInTheDocument()
  	})

  	test("deve chamar setGymImage e fechar o dialog ao confirmar o recorte", async () => {
  		renderWithProviders(<GymImageEditOverlay {...defaultProps} />)
  		const input = screen.getByTestId("gym-image-file-input")
  		fireEvent.change(input, {
  			target: { files: [new File(["x"], "foto.png", { type: "image/png" })] },
  		})
  		fireEvent.click(screen.getByTestId("mock-cropper"))
  		fireEvent.click(screen.getByTestId("gym-image-edit-confirm"))
  		await waitFor(() => {
  			expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument()
  		})
  	})

  	test("deve manter o dialog aberto quando upload falha", async () => {
  		const { getCroppedBlob } = await import("@/features/gyms/lib/crop-image")
  		vi.mocked(getCroppedBlob).mockRejectedValueOnce(new Error("upload error"))
  		renderWithProviders(<GymImageEditOverlay {...defaultProps} />)
  		const input = screen.getByTestId("gym-image-file-input")
  		fireEvent.change(input, {
  			target: { files: [new File(["x"], "foto.png", { type: "image/png" })] },
  		})
  		fireEvent.click(screen.getByTestId("mock-cropper"))
  		fireEvent.click(screen.getByTestId("gym-image-edit-confirm"))
  		await waitFor(() => {
  			expect(screen.getByTestId("mock-cropper")).toBeInTheDocument()
  		})
  	})

  	test("deve fechar o dialog ao clicar em cancelar sem fazer upload", async () => {
  		renderWithProviders(<GymImageEditOverlay {...defaultProps} />)
  		const input = screen.getByTestId("gym-image-file-input")
  		fireEvent.change(input, {
  			target: { files: [new File(["x"], "foto.png", { type: "image/png" })] },
  		})
  		expect(screen.getByTestId("mock-cropper")).toBeInTheDocument()
  		fireEvent.click(screen.getByTestId("gym-image-edit-dialog-cancel"))
  		await waitFor(() => {
  			expect(
  				screen.queryByTestId("mock-cropper"),
  			).not.toBeInTheDocument()
  		})
  	})
  })
  ```

- **Step 3: Rodar os testes para confirmar que falham**

  ```bash
  pnpm --filter frontend test -- --run "GymImageEditOverlay"
  ```

  Esperado: `FAIL` com `Cannot find module './gym-image-edit-overlay'`

- **Step 4: Criar o componente GymImageEditOverlay**

  Criar `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.tsx`:

  ```typescript
  "use client"

  import type { ChangeEvent } from "react"
  import { useCallback, useRef, useState } from "react"
  import Cropper, { type Area } from "react-easy-crop"
  import { Pencil } from "lucide-react"
  import { toast } from "sonner"
  import { Button } from "@/components/ui/button"
  import {
  	Dialog,
  	DialogContent,
  	DialogFooter,
  	DialogHeader,
  	DialogTitle,
  } from "@/components/ui/dialog"
  import { useSetGymImage } from "@/features/gyms/api"
  import { GymImage } from "@/features/gyms/components/gym-image"
  import { getCroppedBlob } from "@/features/gyms/lib/crop-image"

  const ASPECT_16_9 = 16 / 9

  export interface GymImageEditOverlayProps {
  	gymId: string
  	imageKey: string | null | undefined
  	gymTitle: string
  }

  export function GymImageEditOverlay({
  	gymId,
  	imageKey,
  	gymTitle,
  }: GymImageEditOverlayProps) {
  	const inputRef = useRef<HTMLInputElement>(null)
  	const [imageSrc, setImageSrc] = useState<string | null>(null)
  	const [dialogOpen, setDialogOpen] = useState(false)
  	const [crop, setCrop] = useState({ x: 0, y: 0 })
  	const [zoom, setZoom] = useState(1)
  	const [area, setArea] = useState<Area | null>(null)
  	const [isProcessing, setIsProcessing] = useState(false)
  	const { mutateAsync: setGymImage } = useSetGymImage()

  	function handleIconClick() {
  		inputRef.current?.click()
  	}

  	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
  		const file = event.target.files?.[0]
  		if (!file) return
  		if (imageSrc) URL.revokeObjectURL(imageSrc)
  		setImageSrc(URL.createObjectURL(file))
  		setDialogOpen(true)
  		event.target.value = ""
  	}

  	const handleCropComplete = useCallback((_: Area, pixels: Area) => {
  		setArea(pixels)
  	}, [])

  	function handleDialogOpenChange(open: boolean) {
  		if (!open) {
  			if (imageSrc) URL.revokeObjectURL(imageSrc)
  			setImageSrc(null)
  			setArea(null)
  			setZoom(1)
  			setCrop({ x: 0, y: 0 })
  		}
  		setDialogOpen(open)
  	}

  	async function handleConfirm() {
  		if (!imageSrc || !area) return
  		setIsProcessing(true)
  		try {
  			const blob = await getCroppedBlob(imageSrc, area)
  			await setGymImage({ id: gymId, file: blob })
  			toast.success("Imagem atualizada com sucesso.")
  			URL.revokeObjectURL(imageSrc)
  			setImageSrc(null)
  			setArea(null)
  			setZoom(1)
  			setCrop({ x: 0, y: 0 })
  			setDialogOpen(false)
  		} catch {
  			toast.error("Não foi possível atualizar a imagem. Tente novamente.")
  		} finally {
  			setIsProcessing(false)
  		}
  	}

  	return (
  		<div className="relative h-40 w-full">
  			<GymImage
  				imageKey={imageKey}
  				alt={gymTitle}
  				className="h-full w-full rounded-[8px]"
  			/>
  			<button
  				type="button"
  				onClick={handleIconClick}
  				aria-label="Alterar imagem da academia"
  				data-testid="gym-image-edit-overlay-btn"
  				className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
  			>
  				<Pencil className="h-4 w-4" aria-hidden="true" />
  			</button>
  			<input
  				ref={inputRef}
  				type="file"
  				accept="image/*"
  				className="hidden"
  				data-testid="gym-image-file-input"
  				onChange={handleFileChange}
  			/>
  			<Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
  				<DialogContent className="sm:max-w-md max-h-[90dvh] overflow-auto">
  					<DialogHeader>
  						<DialogTitle>Ajustar imagem</DialogTitle>
  					</DialogHeader>
  					{imageSrc ? (
  						<div className="flex flex-col gap-3">
  							<div className="relative h-[280px] w-full overflow-hidden rounded-lg bg-black">
  								<Cropper
  									image={imageSrc}
  									crop={crop}
  									zoom={zoom}
  									aspect={ASPECT_16_9}
  									onCropChange={setCrop}
  									onZoomChange={setZoom}
  									onCropComplete={handleCropComplete}
  								/>
  							</div>
  							<label className="flex items-center gap-2 text-xs text-muted-foreground">
  								Zoom
  								<input
  									type="range"
  									min={1}
  									max={3}
  									step={0.1}
  									value={zoom}
  									data-testid="gym-image-edit-zoom"
  									onChange={(e) => setZoom(Number(e.target.value))}
  									className="flex-1"
  								/>
  							</label>
  						</div>
  					) : null}
  					<DialogFooter>
  						<Button
  							type="button"
  							variant="outline"
  							onClick={() => handleDialogOpenChange(false)}
  							data-testid="gym-image-edit-dialog-cancel"
  						>
  							Cancelar
  						</Button>
  						<Button
  							type="button"
  							disabled={isProcessing || !area}
  							onClick={handleConfirm}
  							data-testid="gym-image-edit-confirm"
  						>
  							{isProcessing ? "Salvando..." : "Confirmar recorte"}
  						</Button>
  					</DialogFooter>
  				</DialogContent>
  			</Dialog>
  		</div>
  	)
  }
  ```

- **Step 5: Rodar os testes para confirmar que passam**

  ```bash
  pnpm --filter frontend test -- --run "GymImageEditOverlay"
  ```

  Esperado: `PASS` em todos os 5 testes

- **Step 6: Rodar lint**

  ```bash
  pnpm --filter frontend lint:fix
  ```

  Esperado: zero problemas

- **Step 7: Commit**

  ```bash
  git add apps/frontend/src/features/gyms/components/gym-image-edit-overlay.tsx \
    apps/frontend/src/features/gyms/components/gym-image-edit-overlay.test.tsx \
    apps/frontend/src/test/msw/handlers.ts
  git commit -m "feat(gyms): add GymImageEditOverlay with dialog cropper and immediate upload

  FR-005, FR-006, FR-007, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015
  - Pencil icon overlay on cover image (same style as detail page)
  - Dialog with react-easy-crop and immediate useSetGymImage call
  - MSW handler for POST /gyms/:id/image added to test suite"
  ```

## Critérios de Sucesso

- `gym-image-edit-overlay.tsx` existe em `src/features/gyms/components/`
- Ícone Pencil visível no canto `right-3 top-3` da imagem (FR-005)
- Hover aplica `hover:text-primary` (verde `#39e58c`) e borda destacada (FR-006)
- Clique no ícone dispara o `input[type=file]` oculto (FR-007)
- Seleção de arquivo abre o Dialog com o Cropper (FR-009)
- Dialog tem controle de zoom funcional (FR-010)
- Botões "Cancelar" e "Confirmar recorte" no footer do Dialog (FR-011)
- Cancelar fecha o dialog sem upload; `URL.revokeObjectURL` é chamado (FR-012)
- Confirmar chama `useSetGymImage({ id: gymId, file: blob })` imediatamente (FR-013)
- Sucesso fecha o dialog (FR-014)
- Falha mantém o dialog aberto (FR-015)
- Todos os 5 testes unitários passam
- `pnpm --filter frontend lint:fix` sem erros
