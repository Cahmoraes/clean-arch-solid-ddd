"use client"

import { Component, type ReactNode, useRef } from "react"
import { cn } from "@/lib/cn"
import { useSceneMotion } from "@/lib/hooks/use-scene-motion"

export type PixelSceneName = "login" | "hero" | "empty"

export interface PixelSceneProps {
	scene: PixelSceneName
	animated?: boolean
	className?: string
}

type Building = readonly [x: number, top: number, width: number]
type Point = readonly [x: number, y: number]
type BeamTone = "accent" | "primary"

interface Beam {
	x: number
	width: number
	tone: BeamTone
}

interface SceneDefinition {
	far: ReadonlyArray<Building>
	near: ReadonlyArray<Building>
	windowsAccent: ReadonlyArray<Point>
	windowsPrimary: ReadonlyArray<Point>
	beams: ReadonlyArray<Beam>
}

const VIEWBOX_WIDTH = 64
const VIEWBOX_HEIGHT = 32

const FAR_SKYLINE: ReadonlyArray<Building> = [
	[0, 16, 8],
	[8, 12, 6],
	[14, 18, 10],
	[24, 10, 7],
	[31, 15, 9],
	[40, 11, 8],
	[48, 17, 7],
	[55, 13, 9],
]

const NEAR_SKYLINE: ReadonlyArray<Building> = [
	[0, 22, 10],
	[10, 18, 7],
	[17, 24, 9],
	[26, 20, 8],
	[34, 25, 8],
	[42, 19, 9],
	[51, 23, 6],
	[57, 17, 7],
]

const WINDOWS_ACCENT: ReadonlyArray<Point> = [
	[2, 24],
	[5, 26],
	[12, 20],
	[14, 23],
	[20, 26],
	[28, 22],
	[30, 25],
	[36, 27],
	[44, 21],
	[47, 24],
	[53, 25],
	[59, 19],
	[61, 22],
]

const WINDOWS_PRIMARY: ReadonlyArray<Point> = [
	[3, 29],
	[13, 21],
	[45, 26],
	[58, 24],
]

const SCENES: Record<PixelSceneName, SceneDefinition> = {
	login: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT,
		windowsPrimary: WINDOWS_PRIMARY,
		beams: [
			{ x: 12, width: 4, tone: "accent" },
			{ x: 40, width: 3, tone: "primary" },
		],
	},
	hero: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 8),
		windowsPrimary: WINDOWS_PRIMARY.slice(0, 2),
		beams: [
			{ x: 20, width: 4, tone: "accent" },
			{ x: 50, width: 3, tone: "primary" },
		],
	},
	empty: {
		far: FAR_SKYLINE,
		near: NEAR_SKYLINE,
		windowsAccent: WINDOWS_ACCENT.slice(0, 4),
		windowsPrimary: [],
		beams: [{ x: 28, width: 5, tone: "accent" }],
	},
}

const TONE_FILL: Record<BeamTone, string> = {
	accent: "var(--color-accent)",
	primary: "var(--color-primary)",
}

// Dither 1x1 em xadrez nas quatro linhas de baixo, num único <path> determinístico.
function buildDitherPath(): string {
	const cells: string[] = []
	for (let y = VIEWBOX_HEIGHT - 4; y < VIEWBOX_HEIGHT; y += 1) {
		for (let x = y % 2; x < VIEWBOX_WIDTH; x += 2) {
			cells.push(`M${x} ${y}h1v1h-1z`)
		}
	}
	return cells.join("")
}

const DITHER_PATH = buildDitherPath()

function Skyline({
	buildings,
	fill,
}: {
	buildings: ReadonlyArray<Building>
	fill: string
}) {
	return (
		<>
			{buildings.map(([x, top, width]) => (
				<rect
					key={`${x}-${top}`}
					x={x}
					y={top}
					width={width}
					height={VIEWBOX_HEIGHT - top}
					fill={fill}
				/>
			))}
		</>
	)
}

interface WindowDot {
	x: number
	y: number
	fill: string
}

interface WindowGroup {
	delaySeconds: number
	dots: WindowDot[]
}

const WINDOW_DELAY_BUCKETS = 5
const WINDOW_DELAY_STEP_SECONDS = 0.8

// Agrupa as janelas por atraso de cintilar: cada grupo vira uma camada HTML
// própria, que o navegador anima por opacity sem repintar o SVG.
function groupWindowsByDelay(
	accent: ReadonlyArray<Point>,
	primary: ReadonlyArray<Point>,
): ReadonlyArray<WindowGroup> {
	const buckets: WindowGroup[] = Array.from(
		{ length: WINDOW_DELAY_BUCKETS },
		(_, bucket) => ({
			delaySeconds: bucket * WINDOW_DELAY_STEP_SECONDS,
			dots: [],
		}),
	)
	const place = (
		points: ReadonlyArray<Point>,
		fill: string,
		offset: number,
	) => {
		points.forEach(([x, y], index) => {
			buckets[(index + offset) % WINDOW_DELAY_BUCKETS]?.dots.push({
				x,
				y,
				fill,
			})
		})
	}
	place(accent, TONE_FILL.accent, 0)
	place(primary, TONE_FILL.primary, 2)
	return buckets
}

// Camada de arte: um <svg> estático por camada, todos com o mesmo viewBox.
function SceneLayer({ children }: { children: ReactNode }) {
	return (
		<svg
			viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
			preserveAspectRatio="xMidYMax slice"
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
			className="absolute inset-0 block h-full w-full"
		>
			{children}
		</svg>
	)
}

// Só camadas HTML (div) animam: transform e opacity em elementos filhos de SVG
// são resolvidos na thread principal com layout e paint por quadro no Chrome.
function BeamLayer({ beam }: { beam: Beam }) {
	return (
		<div className="pixel-scene-beam absolute inset-0">
			<SceneLayer>
				<rect
					x={beam.x}
					y={0}
					width={beam.width}
					height={VIEWBOX_HEIGHT}
					fill={TONE_FILL[beam.tone]}
					fillOpacity={0.18}
					transform="skewX(-20)"
				/>
			</SceneLayer>
		</div>
	)
}

function WindowLayer({
	dots,
	delaySeconds,
}: {
	dots: ReadonlyArray<WindowDot>
	delaySeconds: number
}) {
	return (
		<div
			className="pixel-scene-window absolute inset-0"
			style={{ animationDelay: `${delaySeconds}s` }}
		>
			<SceneLayer>
				{dots.map(({ x, y, fill }) => (
					<rect
						key={`${x}-${y}`}
						x={x}
						y={y}
						width={1}
						height={1}
						fill={fill}
					/>
				))}
			</SceneLayer>
		</div>
	)
}

function SceneArt({
	scene,
	animated,
	className,
}: {
	scene: PixelSceneName
	animated: boolean
	className?: string
}) {
	const ref = useRef<HTMLDivElement>(null)
	const { paused } = useSceneMotion(ref)
	const definition = SCENES[scene]
	const windowLayers = groupWindowsByDelay(
		definition.windowsAccent,
		definition.windowsPrimary,
	)

	return (
		<div
			ref={ref}
			aria-hidden="true"
			data-scene={scene}
			data-paused={!animated || paused}
			className={cn(
				"pixel-scene relative block h-full w-full overflow-hidden",
				className,
			)}
		>
			<SceneLayer>
				<rect
					x={0}
					y={0}
					width={VIEWBOX_WIDTH}
					height={VIEWBOX_HEIGHT}
					fill="var(--color-surface)"
				/>
			</SceneLayer>
			{definition.beams.map((beam) => (
				<BeamLayer key={`${beam.tone}-${beam.x}`} beam={beam} />
			))}
			<SceneLayer>
				<Skyline buildings={definition.far} fill="var(--color-surface-3)" />
				<Skyline buildings={definition.near} fill="var(--color-surface-2)" />
			</SceneLayer>
			{windowLayers
				.filter((group) => group.dots.length > 0)
				.map((group) => (
					<WindowLayer
						key={group.delaySeconds}
						dots={group.dots}
						delaySeconds={group.delaySeconds}
					/>
				))}
			<SceneLayer>
				<path
					d={DITHER_PATH}
					fill="var(--color-background)"
					fillOpacity={0.5}
				/>
			</SceneLayer>
		</div>
	)
}

function SceneFallback({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			data-testid="pixel-scene-fallback"
			className={cn("h-full w-full bg-surface-2", className)}
		/>
	)
}

interface BoundaryProps {
	children: ReactNode
	className?: string
}

interface BoundaryState {
	failed: boolean
}

class PixelSceneBoundary extends Component<BoundaryProps, BoundaryState> {
	state: BoundaryState = { failed: false }

	static getDerivedStateFromError(): BoundaryState {
		return { failed: true }
	}

	render(): ReactNode {
		if (this.state.failed) {
			return <SceneFallback className={this.props.className} />
		}
		return this.props.children
	}
}

export function PixelScene({
	scene,
	animated = false,
	className,
}: PixelSceneProps) {
	if (!Object.hasOwn(SCENES, scene)) {
		return <SceneFallback className={className} />
	}
	return (
		<PixelSceneBoundary className={className}>
			<SceneArt scene={scene} animated={animated} className={className} />
		</PixelSceneBoundary>
	)
}
