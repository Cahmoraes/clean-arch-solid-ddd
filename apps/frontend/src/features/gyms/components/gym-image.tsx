"use client"

import { ImageIcon } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
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
	const containerReference = useRef<HTMLDivElement>(null)
	const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null)
	const url = gymImageUrl(imageKey)
	const loaded = loadedImageUrl === url

	useEffect(() => {
		if (!url) return

		const imageElement = containerReference.current?.querySelector("img")

		if (imageElement?.complete) {
			setLoadedImageUrl(url)
		}
	}, [url])

	return (
		<div
			ref={containerReference}
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
					data-loaded={loaded}
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
					onLoad={() => setLoadedImageUrl(url)}
					onError={() => setLoadedImageUrl(url)}
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
