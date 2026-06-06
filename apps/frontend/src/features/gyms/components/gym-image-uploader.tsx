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

	async function cropAndEmit(src: string, cropArea: Area) {
		try {
			onCropped(await getCroppedBlob(src, cropArea))
		} catch {
			setError("Não foi possível processar a imagem. Tente outra.")
		}
	}

	async function handleConfirm() {
		if (!imageSrc || !area) return
		setIsProcessing(true)
		setError(null)
		await cropAndEmit(imageSrc, area)
		setIsProcessing(false)
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
						<p
							data-testid="gym-image-error"
							className="text-sm text-destructive"
						>
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
