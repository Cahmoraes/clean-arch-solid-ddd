import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { GoogleGIcon } from "./google-g-icon"

describe("GoogleGIcon", () => {
	test("renderiza o svg decorativo do logo G oficial", () => {
		const { container } = render(<GoogleGIcon />)

		const svg = container.querySelector("svg")

		expect(svg).not.toBeNull()
		expect(svg).toHaveAttribute("aria-hidden", "true")
		expect(svg).toHaveAttribute("focusable", "false")
		expect(svg).toHaveAttribute("viewBox", "0 0 48 48")
	})

	test("AC-02 contém exatamente os quatro caminhos com as cores de marca do Google", () => {
		const { container } = render(<GoogleGIcon />)

		const paths = Array.from(container.querySelectorAll("path"))

		expect(paths).toHaveLength(4)
		expect(paths.map((path) => path.getAttribute("fill"))).toEqual([
			"#EA4335",
			"#4285F4",
			"#FBBC05",
			"#34A853",
		])
	})

	test("propaga className no svg", () => {
		const { container } = render(<GoogleGIcon className="h-5 w-5 shrink-0" />)

		expect(container.querySelector("svg")).toHaveClass("h-5", "w-5", "shrink-0")
	})
})
