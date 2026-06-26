"use client"

import { Pencil } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Cropper from "react-easy-crop"
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
import { type CropArea, getCroppedBlob } from "@/features/gyms/lib/crop-image"

export interface GymImageEditOverlayProps {
	gymId: string
	imageKey: string | null
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
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(
		null,
	)
	const { mutateAsync, isPending } = useSetGymImage()

	useEffect(() => {
		return () => {
			if (imageSrc) URL.revokeObjectURL(imageSrc)
		}
	}, [imageSrc])

	function handleIconClick() {
		inputRef.current?.click()
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		const url = URL.createObjectURL(file)
		setImageSrc(url)
		setDialogOpen(true)
	}

	function handleClose() {
		if (imageSrc) URL.revokeObjectURL(imageSrc)
		setImageSrc(null)
		setCroppedAreaPixels(null)
		setZoom(1)
		setCrop({ x: 0, y: 0 })
		setDialogOpen(false)
		if (inputRef.current) inputRef.current.value = ""
	}

	async function handleConfirm() {
		if (!imageSrc || !croppedAreaPixels) return
		try {
			const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
			await mutateAsync({ id: gymId, file: blob })
			toast.success("Imagem atualizada com sucesso")
			handleClose()
		} catch {
			toast.error("Falha ao atualizar a imagem. Tente novamente.")
		}
	}

	return (
		<div className="relative">
			<GymImage
				imageKey={imageKey}
				alt={gymTitle}
				className="aspect-video w-full rounded-lg"
				hoverEffect={false}
			/>
			<button
				type="button"
				data-testid="gym-image-edit-overlay-btn"
				aria-label={`Editar imagem da academia ${gymTitle}`}
				onClick={handleIconClick}
				className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
			>
				<Pencil className="h-4 w-4" aria-hidden="true" />
			</button>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleFileChange}
				tabIndex={-1}
			/>
			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => {
					if (!open) handleClose()
				}}
			>
				<DialogContent className="sm:max-w-md max-h-[90dvh] overflow-auto">
					<DialogHeader>
						<DialogTitle>Recortar imagem</DialogTitle>
					</DialogHeader>
					{imageSrc && (
						<div className="relative h-64 w-full overflow-hidden">
							<Cropper
								image={imageSrc}
								crop={crop}
								zoom={zoom}
								aspect={16 / 9}
								onCropChange={setCrop}
								onZoomChange={setZoom}
								onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
							/>
						</div>
					)}
					<div className="px-4">
						<input
							type="range"
							min={1}
							max={3}
							step={0.01}
							value={zoom}
							onChange={(e) => setZoom(Number(e.target.value))}
							className="w-full"
							aria-label="Zoom"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={handleClose}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button onClick={handleConfirm} disabled={isPending}>
							Confirmar recorte
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
