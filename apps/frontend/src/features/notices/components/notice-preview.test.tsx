import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { NoticePreview } from "./notice-preview"

const EMPTY_STATE = "Digite o título e a mensagem para ver a pré-visualização."

describe("NoticePreview", () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	test("exibe o rótulo Como o usuário verá", () => {
		render(
			<NoticePreview
				title="Manutenção"
				message="Sistema fora do ar."
				audience="ALL"
			/>,
		)

		expect(screen.getByText("Como o usuário verá")).toBeInTheDocument()
	})

	test("reflete o título e a mensagem informados no item do sino", () => {
		render(
			<NoticePreview
				title="Manutenção programada"
				message="O sistema ficará fora do ar hoje às 22h."
				audience="ALL"
			/>,
		)

		const list = screen.getByRole("list")
		expect(within(list).getByText("Manutenção programada")).toBeInTheDocument()
		expect(
			within(list).getByText("O sistema ficará fora do ar hoje às 22h."),
		).toBeInTheDocument()
	})

	test("usa o item real de notificação, exibido como recente", () => {
		render(<NoticePreview title="Aviso" message="Mensagem" audience="ALL" />)

		expect(
			within(screen.getByRole("list")).getByRole("button"),
		).toBeInTheDocument()
		expect(screen.getByText("agora")).toBeInTheDocument()
	})

	test("mantém o rótulo agora ao digitar após minutos de montagem", () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"))
		const { rerender } = render(
			<NoticePreview
				title="Manutenção"
				message="Sistema fora do ar."
				audience="ALL"
			/>,
		)

		vi.advanceTimersByTime(2 * 60_000)
		rerender(
			<NoticePreview
				title="Manutenção!"
				message="Sistema fora do ar hoje."
				audience="ALL"
			/>,
		)

		expect(screen.getByText("agora")).toBeInTheDocument()
		expect(screen.queryByText(/atrás/)).not.toBeInTheDocument()
	})

	test("atualiza a pré-visualização quando as props mudam", () => {
		const { rerender } = render(
			<NoticePreview title="Primeiro" message="Mensagem um" audience="ALL" />,
		)

		rerender(
			<NoticePreview title="Segundo" message="Mensagem dois" audience="ALL" />,
		)

		expect(screen.getByText("Segundo")).toBeInTheDocument()
		expect(screen.getByText("Mensagem dois")).toBeInTheDocument()
		expect(screen.queryByText("Primeiro")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem estão vazios", () => {
		render(<NoticePreview title="" message="" audience="ALL" />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
		expect(screen.queryByRole("list")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem têm só espaços", () => {
		render(<NoticePreview title="   " message="  " audience="ALL" />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
	})

	test("mostra o item quando apenas um dos campos foi preenchido", () => {
		render(<NoticePreview title="Só título" message="" audience="ALL" />)

		expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
		expect(screen.getByText("Só título")).toBeInTheDocument()
	})

	test("Review Focus: HTML e script digitados aparecem como texto na pré-visualização, sem executar", () => {
		const scriptMessage =
			'<script>window.__xss = true</script><img src="x" onerror="window.__xss = true">'
		const boldTitle = "<b>Título em negrito</b>"

		const { container } = render(
			<NoticePreview
				title={boldTitle}
				message={scriptMessage}
				audience="ALL"
			/>,
		)

		expect(screen.getByText(boldTitle)).toBeInTheDocument()
		expect(screen.getByText(scriptMessage)).toBeInTheDocument()
		expect(container.querySelector("script")).toBeNull()
		expect(container.querySelector("img")).toBeNull()
		expect(container.querySelector("b")).toBeNull()
		expect(Reflect.get(window, "__xss")).toBeUndefined()
	})

	test("FR-014: com título, mensagem e audience MEMBERS mostra Público: Alunos", () => {
		render(
			<NoticePreview title="Aviso" message="Mensagem" audience="MEMBERS" />,
		)

		expect(screen.getByText("Público: Alunos")).toBeInTheDocument()
	})

	test.each([
		["ALL", "Público: Todos"],
		["MEMBERS", "Público: Alunos"],
		["ADMINS", "Público: Administradores"],
	] as const)("mostra o rótulo do público %s", (audience, expected) => {
		render(
			<NoticePreview title="Aviso" message="Mensagem" audience={audience} />,
		)

		expect(screen.getByText(expected)).toBeInTheDocument()
	})

	test("FR-014: trocar a prop audience atualiza a linha na hora", () => {
		const { rerender } = render(
			<NoticePreview title="Aviso" message="Mensagem" audience="MEMBERS" />,
		)

		rerender(
			<NoticePreview title="Aviso" message="Mensagem" audience="ADMINS" />,
		)

		expect(screen.getByText("Público: Administradores")).toBeInTheDocument()
		expect(screen.queryByText("Público: Alunos")).not.toBeInTheDocument()
	})

	test("estado vazio não mostra a linha de público", () => {
		render(<NoticePreview title="" message="" audience="MEMBERS" />)

		expect(screen.queryByText(/Público:/)).not.toBeInTheDocument()
	})

	test("a linha de público destaca-se em mono, maiúsculas e cor primary", () => {
		render(
			<NoticePreview title="Aviso" message="Mensagem" audience="MEMBERS" />,
		)

		expect(screen.getByText("Público: Alunos")).toHaveClass(
			"font-mono",
			"uppercase",
			"text-primary",
		)
	})
})
