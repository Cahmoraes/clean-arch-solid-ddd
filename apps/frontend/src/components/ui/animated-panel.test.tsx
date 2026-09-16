import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { AnimatedPanel } from "./animated-panel"

beforeEach(() => {
	vi.useFakeTimers()
})

afterEach(() => {
	vi.useRealTimers()
})

test("FR-006: nao renderiza o conteudo quando open comeca false", () => {
	render(
		<AnimatedPanel open={false}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	expect(screen.queryByText("conteudo")).not.toBeInTheDocument()
})

test("FR-006: renderiza o conteudo quando open e true", () => {
	render(
		<AnimatedPanel open={true}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	expect(screen.getByText("conteudo")).toBeInTheDocument()
})

test("FR-006, FR-007: mantem o conteudo visivel durante a transicao de saida (300ms) e remove depois", () => {
	const { rerender } = render(
		<AnimatedPanel open={true}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	rerender(
		<AnimatedPanel open={false}>
			<span>conteudo</span>
		</AnimatedPanel>,
	)
	expect(screen.queryByText("conteudo")).toBeInTheDocument()

	act(() => {
		vi.advanceTimersByTime(299)
	})
	expect(screen.queryByText("conteudo")).toBeInTheDocument()

	act(() => {
		vi.advanceTimersByTime(1)
	})
	expect(screen.queryByText("conteudo")).not.toBeInTheDocument()
})
