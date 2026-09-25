import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test } from "vitest"
import { setMotionPaused } from "@/lib/motion-preference"
import { MotionToggle } from "./motion-toggle"

describe("MotionToggle", () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.removeAttribute("data-motion-paused")
		setMotionPaused(false)
	})

	test("exibe Pausar animações com aria-pressed false quando as animações rodam", () => {
		render(<MotionToggle />)
		expect(
			screen.getByRole("button", { name: "Pausar animações" }),
		).toHaveAttribute("aria-pressed", "false")
	})

	test("clicar alterna para Retomar animações com aria-pressed true", async () => {
		const user = userEvent.setup()
		render(<MotionToggle />)
		await user.click(screen.getByRole("button", { name: "Pausar animações" }))
		expect(
			screen.getByRole("button", { name: "Retomar animações" }),
		).toHaveAttribute("aria-pressed", "true")
	})
})
