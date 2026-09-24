import { cn } from "@/lib/cn"

export interface BrandMarkProps {
	/** Exibe o texto "VOLT" ao lado do ícone. Default: true. */
	wordmark?: boolean
	className?: string
}

// Raio em pixel numa grade 8x8: [x, y, largura, altura], todos inteiros.
const BOLT_RECTS: ReadonlyArray<readonly [number, number, number, number]> = [
	[4, 0, 3, 1],
	[3, 1, 3, 1],
	[2, 2, 3, 1],
	[1, 3, 6, 1],
	[3, 4, 3, 1],
	[2, 5, 2, 1],
	[2, 6, 1, 1],
]

function PixelBolt() {
	return (
		<svg
			viewBox="0 0 8 8"
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
			className="h-4 w-4"
			fill="currentColor"
		>
			{BOLT_RECTS.map(([x, y, width, height]) => (
				<rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} />
			))}
		</svg>
	)
}

export function BrandMark({ wordmark = true, className }: BrandMarkProps) {
	return (
		<span className={cn("inline-flex items-center gap-3", className)}>
			<span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
				<PixelBolt />
			</span>
			{wordmark && (
				<span className="font-display text-xl font-bold tracking-wide">
					VOLT
				</span>
			)}
		</span>
	)
}
