import { render } from "@testing-library/react"
import { describe, expect, test } from "vitest"

function Faded() {
	return <div className="route-fade">conteúdo</div>
}

describe("Movimento VOLT", () => {
	test("aplica a classe route-fade ao conteúdo", () => {
		const { container } = render(<Faded />)
		expect(container.firstChild).toHaveClass("route-fade")
	})
})
