import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { CommandPalette } from "./command-palette"

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}))

describe("CommandPalette", () => {
	test("não renderiza o input quando open=false", () => {
		render(<CommandPalette open={false} onOpenChange={vi.fn()} />)
		expect(
			screen.queryByPlaceholderText("Buscar páginas, academias, usuários..."),
		).not.toBeInTheDocument()
	})

	test("renderiza o input quando open=true", () => {
		render(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		expect(
			screen.getByPlaceholderText("Buscar páginas, academias, usuários..."),
		).toBeInTheDocument()
	})

	test("chama onOpenChange(false) ao pressionar Esc", async () => {
		const onOpenChange = vi.fn()
		render(<CommandPalette open={true} onOpenChange={onOpenChange} />)
		await userEvent.keyboard("{Escape}")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	test("exibe mensagem de resultado vazio quando nada foi digitado", () => {
		render(<CommandPalette open={true} onOpenChange={vi.fn()} />)
		expect(screen.getByText("Nenhum resultado encontrado.")).toBeInTheDocument()
	})
})
