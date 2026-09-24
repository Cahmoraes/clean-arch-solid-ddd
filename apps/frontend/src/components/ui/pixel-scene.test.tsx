import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { useSceneMotion } from "@/lib/hooks/use-scene-motion"
import { PixelScene, type PixelSceneName } from "./pixel-scene"

vi.mock("@/lib/hooks/use-scene-motion", () => ({
	useSceneMotion: vi.fn(),
}))

const SCENES: ReadonlyArray<PixelSceneName> = ["login", "hero", "empty"]

function motion(paused: boolean) {
	return { paused, userPaused: false, toggleUserPause: vi.fn() }
}

function expectIntegerRects(container: HTMLElement) {
	const attributes = ["x", "y", "width", "height"]
	const values = Array.from(container.querySelectorAll("rect")).flatMap(
		(rect) => attributes.map((name) => `${name}=${rect.getAttribute(name)}`),
	)
	for (const entry of values) {
		expect(Number.isInteger(Number(entry.split("=")[1])), entry).toBe(true)
	}
}

function expectTokenFills(container: HTMLElement) {
	for (const painted of Array.from(container.querySelectorAll("[fill]"))) {
		expect(painted.getAttribute("fill")).toMatch(/^var\(--color-[a-z0-9-]+\)$/)
	}
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe("PixelScene", () => {
	for (const scene of SCENES) {
		test(`cena ${scene}: renderiza um svg decorativo com skyline, janelas e feixes`, () => {
			vi.mocked(useSceneMotion).mockReturnValue(motion(false))
			const { container } = render(<PixelScene scene={scene} animated />)
			const svg = container.querySelector("svg")
			expect(svg).toHaveAttribute("aria-hidden", "true")
			expect(svg).toHaveAttribute("focusable", "false")
			expect(svg).toHaveAttribute("shape-rendering", "crispEdges")
			expect(svg).toHaveAttribute("data-scene", scene)
			expect(
				container.querySelectorAll(".pixel-scene-beam").length,
			).toBeGreaterThan(0)
			expect(
				container.querySelectorAll(".pixel-scene-window").length,
			).toBeGreaterThan(0)
			expect(container.querySelectorAll("rect").length).toBeGreaterThan(10)
		})

		test(`cena ${scene}: todo retângulo usa coordenadas inteiras e cor só por token`, () => {
			vi.mocked(useSceneMotion).mockReturnValue(motion(false))
			const { container } = render(<PixelScene scene={scene} />)
			expectIntegerRects(container)
			expectTokenFills(container)
		})

		test(`cena ${scene}: duas renderizações produzem exatamente o mesmo DOM`, () => {
			vi.mocked(useSceneMotion).mockReturnValue(motion(false))
			const first = render(<PixelScene scene={scene} animated />)
			const second = render(<PixelScene scene={scene} animated />)
			expect(first.container.innerHTML).toBe(second.container.innerHTML)
		})
	}

	test("não usa Math.random na renderização", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const random = vi.spyOn(Math, "random")
		render(<PixelScene scene="login" animated />)
		expect(random).not.toHaveBeenCalled()
	})

	test("animated com hook livre: data-paused é false", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const { container } = render(<PixelScene scene="hero" animated />)
		expect(container.querySelector("svg")).toHaveAttribute(
			"data-paused",
			"false",
		)
	})

	test("animated com o hook pausado: data-paused é true", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(true))
		const { container } = render(<PixelScene scene="hero" animated />)
		expect(container.querySelector("svg")).toHaveAttribute(
			"data-paused",
			"true",
		)
	})

	test("sem animated a cena é estática mesmo com o hook livre", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const { container } = render(<PixelScene scene="hero" />)
		expect(container.querySelector("svg")).toHaveAttribute(
			"data-paused",
			"true",
		)
	})

	test("repassa className ao svg", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		const { container } = render(
			<PixelScene scene="empty" className="opacity-60" />,
		)
		expect(container.querySelector("svg")).toHaveClass(
			"pixel-scene",
			"opacity-60",
		)
	})

	test("cena inválida: mostra o fundo liso e a página segue normal", () => {
		vi.mocked(useSceneMotion).mockReturnValue(motion(false))
		render(
			<main>
				<h1>Página normal</h1>
				{/* @ts-expect-error cena inválida em tempo de execução (dado vindo de fora do tipo) */}
				<PixelScene scene="desconhecida" animated />
			</main>,
		)
		expect(
			screen.getByRole("heading", { name: "Página normal" }),
		).toBeInTheDocument()
		const fallback = screen.getByTestId("pixel-scene-fallback")
		expect(fallback).toHaveAttribute("aria-hidden", "true")
		expect(document.querySelector("svg")).toBeNull()
	})

	test("erro ao renderizar a cena: o limite de erro mostra o fundo liso sem derrubar a página", () => {
		vi.spyOn(console, "error").mockImplementation(() => undefined)
		vi.mocked(useSceneMotion).mockImplementation(() => {
			throw new Error("falha simulada ao renderizar a cena")
		})
		render(
			<main>
				<h1>Página normal</h1>
				<PixelScene scene="login" animated className="opacity-60" />
			</main>,
		)
		expect(
			screen.getByRole("heading", { name: "Página normal" }),
		).toBeInTheDocument()
		expect(screen.getByTestId("pixel-scene-fallback")).toHaveClass("opacity-60")
		expect(document.querySelector("svg")).toBeNull()
	})
})
