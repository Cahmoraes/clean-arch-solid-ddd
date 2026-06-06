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
				// biome-ignore lint/performance/noImgElement: imagem já otimizada server-side (sharp 800x450 webp); next/image seria redundante e exigiria remotePatterns
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
