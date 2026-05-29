import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { SegmentedControl } from "./segmented-control"

const ITEMS = [
	{ value: "todos", label: "Todos", count: 12 },
	{ value: "ativos", label: "Ativos", count: 8 },
]

describe("SegmentedControl", () => {
	test("marca o item selecionado com aria-pressed", () => {
		render(
			<SegmentedControl items={ITEMS} value="todos" onValueChange={vi.fn()} />,
		)
		expect(screen.getByRole("button", { name: /Todos/ })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
	})
	test("dispara onValueChange ao clicar em outro item", () => {
		const onChange = vi.fn()
		render(
			<SegmentedControl items={ITEMS} value="todos" onValueChange={onChange} />,
		)
		fireEvent.click(screen.getByRole("button", { name: /Ativos/ }))
		expect(onChange).toHaveBeenCalledWith("ativos")
	})
	test("exibe o contador quando fornecido", () => {
		render(
			<SegmentedControl items={ITEMS} value="todos" onValueChange={vi.fn()} />,
		)
		expect(screen.getByText("8")).toBeInTheDocument()
	})
})
