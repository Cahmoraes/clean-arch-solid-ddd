import { fireEvent, render, screen } from "@testing-library/react"
import { LayoutGrid } from "lucide-react"
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
	test("expõe o nome acessível via aria-label", () => {
		render(
			<SegmentedControl
				items={ITEMS}
				value="todos"
				onValueChange={vi.fn()}
				aria-label="Filtrar"
			/>,
		)
		expect(screen.getByRole("group", { name: "Filtrar" })).toBeInTheDocument()
	})
	test("aceita um ReactNode (ícone) como label", () => {
		render(
			<SegmentedControl
				items={[
					{ value: "cards", label: <LayoutGrid data-testid="icon-cards" /> },
					{ value: "rows", label: "Linhas" },
				]}
				value="cards"
				onValueChange={vi.fn()}
			/>,
		)
		expect(screen.getByTestId("icon-cards")).toBeInTheDocument()
	})
	test("aplica aria-label individual no botão quando o item define ariaLabel", () => {
		render(
			<SegmentedControl
				items={[
					{
						value: "cards",
						label: <LayoutGrid data-testid="icon-cards" />,
						ariaLabel: "Ver como cards",
					},
					{ value: "rows", label: "Linhas" },
				]}
				value="cards"
				onValueChange={vi.fn()}
			/>,
		)
		expect(
			screen.getByRole("button", { name: "Ver como cards" }),
		).toBeInTheDocument()
	})
})
