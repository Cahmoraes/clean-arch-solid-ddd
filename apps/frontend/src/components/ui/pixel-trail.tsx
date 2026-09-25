"use client"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/cn"
import { useSceneMotion } from "@/lib/hooks/use-scene-motion"

export interface PixelTrailProps {
	className?: string
	cellSize?: number
}

const MAX_CELLS = 150
const DECAY_PER_FRAME = 0.04
const MAX_DPR = 2

interface Cell {
	x: number
	y: number
	alpha: number
}

function readTrailColors(): string[] {
	const styles = getComputedStyle(document.documentElement)
	const candidates = [
		styles.getPropertyValue("--color-primary").trim(),
		styles.getPropertyValue("--color-accent").trim(),
		styles.getPropertyValue("--color-scene-sun").trim() ||
			styles.getPropertyValue("--color-warning").trim(),
	]
	return candidates.filter((color) => color.length > 0)
}

function advanceCells(
	cells: Map<string, Cell>,
	context: CanvasRenderingContext2D,
	cellSize: number,
	colors: string[],
): void {
	let index = 0
	for (const [key, cell] of cells) {
		context.fillStyle =
			colors[index % colors.length] ?? colors[0] ?? "currentColor"
		context.globalAlpha = cell.alpha
		context.fillRect(cell.x, cell.y, cellSize, cellSize)
		cell.alpha -= DECAY_PER_FRAME
		if (cell.alpha <= 0) cells.delete(key)
		index += 1
	}
	context.globalAlpha = 1
}

function evictOldest(cells: Map<string, Cell>): void {
	if (cells.size <= MAX_CELLS) return
	const oldestKey = cells.keys().next().value
	if (oldestKey !== undefined) cells.delete(oldestKey)
}

function createResizeHandler(
	canvas: HTMLCanvasElement,
	parent: HTMLElement,
	context: CanvasRenderingContext2D,
): () => void {
	return () => {
		const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
		canvas.width = parent.clientWidth * dpr
		canvas.height = parent.clientHeight * dpr
		context.setTransform(dpr, 0, 0, dpr, 0, 0)
	}
}

interface TrailAnimator {
	addCell: (x: number, y: number) => void
	stop: () => void
}

function createTrailAnimator(
	canvas: HTMLCanvasElement,
	context: CanvasRenderingContext2D,
	cellSize: number,
): TrailAnimator {
	const cells = new Map<string, Cell>()
	let rafId: number | null = null

	function draw(): void {
		context.clearRect(0, 0, canvas.width, canvas.height)
		advanceCells(cells, context, cellSize, readTrailColors())
		rafId = cells.size > 0 ? requestAnimationFrame(draw) : null
	}

	return {
		addCell(x, y) {
			cells.set(`${x}:${y}`, { x, y, alpha: 0.9 })
			evictOldest(cells)
			if (rafId === null) rafId = requestAnimationFrame(draw)
		},
		stop() {
			if (rafId !== null) cancelAnimationFrame(rafId)
			cells.clear()
			rafId = null
		},
	}
}

function createPointerHandler(
	parent: HTMLElement,
	cellSize: number,
	paused: boolean,
	animator: TrailAnimator,
): (event: PointerEvent) => void {
	return (event) => {
		if (paused) return
		const rect = parent.getBoundingClientRect()
		const x = Math.floor((event.clientX - rect.left) / cellSize) * cellSize
		const y = Math.floor((event.clientY - rect.top) / cellSize) * cellSize
		animator.addCell(x, y)
	}
}

interface TrailTargets {
	canvas: HTMLCanvasElement
	parent: HTMLElement
	context: CanvasRenderingContext2D
}

function hasFinePointer(): boolean {
	return window.matchMedia("(pointer: fine)").matches
}

/**
 * O rastro segue o mouse sobre o elemento `relative` do consumidor, não
 * sobre o próprio wrapper `absolute` de PixelTrail (que fica por cima, sem
 * tamanho intrínseco próprio).
 */
function resolveTrailTargets(
	canvas: HTMLCanvasElement | null,
	container: HTMLDivElement | null,
): TrailTargets | null {
	const parent = container?.parentElement
	const context = canvas?.getContext("2d")
	if (!canvas || !parent || !context || !hasFinePointer()) return null
	return { canvas, parent, context }
}

function createResizeObserver(callback: () => void): ResizeObserver | null {
	return typeof ResizeObserver !== "undefined"
		? new ResizeObserver(callback)
		: null
}

export function PixelTrail({ className, cellSize = 10 }: PixelTrailProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const { paused } = useSceneMotion(containerRef)

	useEffect(() => {
		const targets = resolveTrailTargets(canvasRef.current, containerRef.current)
		if (!targets) return undefined
		const { canvas, parent, context } = targets

		const resizeCanvas = createResizeHandler(canvas, parent, context)
		const animator = createTrailAnimator(canvas, context, cellSize)
		const handlePointerMove = createPointerHandler(
			parent,
			cellSize,
			paused,
			animator,
		)

		resizeCanvas()
		const resizeObserver = createResizeObserver(resizeCanvas)
		resizeObserver?.observe(parent)
		parent.addEventListener("pointermove", handlePointerMove)

		return () => {
			parent.removeEventListener("pointermove", handlePointerMove)
			resizeObserver?.disconnect()
			animator.stop()
		}
	}, [cellSize, paused])

	useEffect(() => {
		if (!paused) return
		const canvas = canvasRef.current
		const context = canvas?.getContext("2d")
		if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
	}, [paused])

	return (
		<div
			ref={containerRef}
			aria-hidden="true"
			className="pointer-events-none absolute inset-0"
		>
			<canvas
				ref={canvasRef}
				className={cn(
					"pointer-events-none absolute inset-0 h-full w-full",
					className,
				)}
			/>
		</div>
	)
}
