import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import {
	SCENE_MOTION_STORAGE_KEY,
	setUserPause,
	useUserMotionPause,
} from "@/lib/hooks/use-scene-motion"
import { MotionToggle } from "./motion-toggle"

function SharedState() {
	const { userPaused } = useUserMotionPause()
	return <output data-testid="shared">{String(userPaused)}</output>
}

afterEach(() => {
	window.localStorage.clear()
	act(() => setUserPause(false))
})

describe("MotionToggle", () => {
	test("é um botão com nome acessível Pausar animações e não pressionado", () => {
		render(<MotionToggle />)
		const button = screen.getByRole("button", { name: "Pausar animações" })
		expect(button).toHaveAttribute("aria-pressed", "false")
	})

	test("ao clicar, passa a se chamar Retomar animações, fica pressionado e grava a escolha", () => {
		render(<MotionToggle />)
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		const button = screen.getByRole("button", { name: "Retomar animações" })
		expect(button).toHaveAttribute("aria-pressed", "true")
		expect(window.localStorage.getItem(SCENE_MOTION_STORAGE_KEY)).toBe("true")
	})

	test("clicar de novo retoma as animações", () => {
		render(<MotionToggle />)
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		fireEvent.click(screen.getByRole("button", { name: "Retomar animações" }))
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toHaveAttribute("aria-pressed", "false")
	})

	test("a escolha é compartilhada com quem lê a preferência (as cenas)", () => {
		render(
			<>
				<MotionToggle />
				<SharedState />
			</>,
		)
		expect(screen.getByTestId("shared")).toHaveTextContent("false")
		fireEvent.click(screen.getByRole("button", { name: "Pausar animações" }))
		expect(screen.getByTestId("shared")).toHaveTextContent("true")
	})

	test("compact: botão quadrado de 36px como o ThemeToggle compacto", () => {
		render(<MotionToggle compact />)
		const button = screen.getByRole("button", { name: "Pausar animações" })
		expect(button).toHaveClass("h-9", "w-9", "rounded-sm")
		expect(button).not.toHaveClass("rounded-full")
	})

	test("completo: botão quadrado com borda, sem texto visível", () => {
		render(<MotionToggle />)
		const button = screen.getByRole("button", { name: "Pausar animações" })
		expect(button).toHaveClass("rounded-sm", "border")
		expect(button).not.toHaveClass("rounded-full")
		expect(button.textContent).toBe("")
	})

	test("aceita className para o controle de visibilidade responsiva", () => {
		render(<MotionToggle className="max-[560px]:hidden" />)
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toHaveClass("max-[560px]:hidden")
	})
})
