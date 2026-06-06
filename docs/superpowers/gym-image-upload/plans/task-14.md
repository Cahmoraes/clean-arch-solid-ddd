# Task 14: Componente `GymImageUploader` (crop com react-easy-crop) [FR-001, FR-002, FR-004]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** N/A

## Visão Geral

Cria o componente de seleção + recorte interativo da imagem antes do envio (FR-001, FR-002), com preview na proporção 16:9, controle de zoom e estados de processamento/erro (FR-004). Produz um `Blob` cropado e o entrega via callback `onCropped`. O recorte real (canvas) fica num helper isolado para testabilidade.

## Arquivos

- Create: `apps/frontend/src/features/gyms/lib/crop-image.ts`
- Create: `apps/frontend/src/features/gyms/components/gym-image-uploader.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx`

### Conformidade com as Skills Padrão

- use frontend-design: UI de crop coerente com o tema; estados claros (processando/erro).
- use react: hooks + callbacks memoizados; componente client.
- use test-antipatterns: mocka `react-easy-crop` e o helper de canvas (limitação do jsdom), testando a orquestração.

## Passos

- **Step 1: Instalar a dependência**

Run: `pnpm --filter frontend add react-easy-crop`
Expected: `react-easy-crop` (v5+) em `apps/frontend/package.json` → `dependencies`.

- **Step 2: Criar o helper de recorte (canvas → Blob webp)**

Crie `apps/frontend/src/features/gyms/lib/crop-image.ts`:

```typescript
export interface CropArea {
	x: number
	y: number
	width: number
	height: number
}

/** Recorta a imagem (object URL) na área informada e retorna um Blob webp. */
export async function getCroppedBlob(
	imageSrc: string,
	area: CropArea,
): Promise<Blob> {
	const image = await loadImage(imageSrc)
	const canvas = document.createElement("canvas")
	canvas.width = area.width
	canvas.height = area.height
	const ctx = canvas.getContext("2d")
	if (!ctx) throw new Error("Canvas 2D context unavailable")
	ctx.drawImage(
		image,
		area.x,
		area.y,
		area.width,
		area.height,
		0,
		0,
		area.width,
		area.height,
	)
	return await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob)
				else reject(new Error("Falha ao gerar a imagem recortada"))
			},
			"image/webp",
			0.9,
		)
	})
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.addEventListener("load", () => resolve(image))
		image.addEventListener("error", () =>
			reject(new Error("Falha ao carregar a imagem")),
		)
		image.src = src
	})
}
```

> O recorte por canvas é coberto pelos testes e2e; o jsdom não implementa `canvas.toBlob`, por isso o teste de componente abaixo mocka este módulo.

- **Step 3: Escrever o teste que falha do componente**

Crie `apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

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
				onCropComplete(
					{ x: 0, y: 0, width: 0, height: 0 },
					{ x: 0, y: 0, width: 160, height: 90 },
				)
			}
		>
			cropper
		</button>
	),
}))

vi.mock("@/features/gyms/lib/crop-image", () => ({
	getCroppedBlob: vi.fn(
		async () => new Blob(["webp"], { type: "image/webp" }),
	),
}))

import { GymImageUploader } from "./gym-image-uploader"

describe("GymImageUploader", () => {
	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => "blob:fake")
	})

	test("ao selecionar arquivo, mostra o cropper e o botão de confirmar", () => {
		renderWithProviders(<GymImageUploader onCropped={vi.fn()} />)
		fireEvent.change(screen.getByTestId("gym-image-input"), {
			target: { files: [new File(["x"], "f.png", { type: "image/png" })] },
		})
		expect(screen.getByTestId("crop-confirm")).toBeInTheDocument()
	})

	test("confirma o recorte e chama onCropped com o Blob", async () => {
		const onCropped = vi.fn()
		renderWithProviders(<GymImageUploader onCropped={onCropped} />)
		fireEvent.change(screen.getByTestId("gym-image-input"), {
			target: { files: [new File(["x"], "f.png", { type: "image/png" })] },
		})
		fireEvent.click(screen.getByTestId("mock-cropper"))
		fireEvent.click(screen.getByTestId("crop-confirm"))
		await waitFor(() => expect(onCropped).toHaveBeenCalledTimes(1))
		expect(onCropped.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
	})
})
```

- **Step 4: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "GymImageUploader"`
Expected: FAIL — módulo `./gym-image-uploader` não existe.

- **Step 5: Implementar o componente**

Crie `apps/frontend/src/features/gyms/components/gym-image-uploader.tsx`:

```tsx
"use client"

import type { ChangeEvent } from "react"
import { useCallback, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Button } from "@/components/ui/button"
import { getCroppedBlob } from "@/features/gyms/lib/crop-image"

const ASPECT_16_9 = 16 / 9

export interface GymImageUploaderProps {
	onCropped: (blob: Blob) => void
	label?: string
}

export function GymImageUploader({
	onCropped,
	label = "Imagem da academia (opcional)",
}: GymImageUploaderProps) {
	const [imageSrc, setImageSrc] = useState<string | null>(null)
	const [crop, setCrop] = useState({ x: 0, y: 0 })
	const [zoom, setZoom] = useState(1)
	const [area, setArea] = useState<Area | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return
		setError(null)
		setImageSrc(URL.createObjectURL(file))
	}

	const handleCropComplete = useCallback((_: Area, pixels: Area) => {
		setArea(pixels)
	}, [])

	async function handleConfirm() {
		if (!imageSrc || !area) return
		setIsProcessing(true)
		setError(null)
		try {
			const blob = await getCroppedBlob(imageSrc, area)
			onCropped(blob)
		} catch {
			setError("Não foi possível processar a imagem. Tente outra.")
		} finally {
			setIsProcessing(false)
		}
	}

	function handleRemove() {
		setImageSrc(null)
		setArea(null)
		setZoom(1)
		setCrop({ x: 0, y: 0 })
	}

	return (
		<div className="flex flex-col gap-3">
			<span className="text-sm font-medium text-foreground">{label}</span>
			<input
				type="file"
				accept="image/*"
				data-testid="gym-image-input"
				onChange={handleFileChange}
				className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
			/>
			{imageSrc ? (
				<div className="flex flex-col gap-3">
					<div className="relative h-[200px] w-full overflow-hidden rounded-lg bg-surface-2">
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
							data-testid="gym-image-zoom"
							onChange={(event) => setZoom(Number(event.target.value))}
							className="flex-1"
						/>
					</label>
					{error ? (
						<p data-testid="gym-image-error" className="text-sm text-destructive">
							{error}
						</p>
					) : null}
					<div className="flex gap-2">
						<Button
							type="button"
							data-testid="crop-confirm"
							onClick={handleConfirm}
							disabled={isProcessing}
						>
							{isProcessing ? "Processando..." : "Confirmar recorte"}
						</Button>
						<Button
							type="button"
							variant="outline"
							data-testid="crop-remove"
							onClick={handleRemove}
						>
							Remover
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
}
```

- **Step 6: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter frontend test -- -t "GymImageUploader"`
Expected: PASS (2 testes).

- **Step 7: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add apps/frontend/package.json apps/frontend/src/features/gyms/lib/crop-image.ts apps/frontend/src/features/gyms/components/gym-image-uploader.tsx apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx
git commit -m "feat(gyms): add GymImageUploader with interactive 16:9 crop"
```

## Critérios de Sucesso

- Seleção de arquivo abre o cropper 16:9 com controle de zoom; "Confirmar recorte" gera o Blob e chama `onCropped`. [FR-001, FR-002]
- Estados de processamento/erro presentes. [FR-004]
- Testes, `tsc:check` e `lint:fix` sem problemas.
