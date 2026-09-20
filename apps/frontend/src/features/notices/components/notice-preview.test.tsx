import { render, screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { NoticePreview } from "./notice-preview"

const EMPTY_STATE = "Digite o título e a mensagem para ver a pré-visualização."

describe("NoticePreview", () => {
	test("exibe o rótulo Como o usuário verá", () => {
		render(<NoticePreview title="Manutenção" message="Sistema fora do ar." />)

		expect(screen.getByText("Como o usuário verá")).toBeInTheDocument()
	})

	test("reflete o título e a mensagem informados no item do sino", () => {
		render(
			<NoticePreview
				title="Manutenção programada"
				message="O sistema ficará fora do ar hoje às 22h."
			/>,
		)

		const list = screen.getByRole("list")
		expect(within(list).getByText("Manutenção programada")).toBeInTheDocument()
		expect(
			within(list).getByText("O sistema ficará fora do ar hoje às 22h."),
		).toBeInTheDocument()
	})

	test("usa o item real de notificação, exibido como não lido e recente", () => {
		render(<NoticePreview title="Aviso" message="Mensagem" />)

		expect(
			within(screen.getByRole("list")).getByRole("button"),
		).toBeInTheDocument()
		expect(screen.getByText("agora")).toBeInTheDocument()
	})

	test("atualiza a pré-visualização quando as props mudam", () => {
		const { rerender } = render(
			<NoticePreview title="Primeiro" message="Mensagem um" />,
		)

		rerender(<NoticePreview title="Segundo" message="Mensagem dois" />)

		expect(screen.getByText("Segundo")).toBeInTheDocument()
		expect(screen.getByText("Mensagem dois")).toBeInTheDocument()
		expect(screen.queryByText("Primeiro")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem estão vazios", () => {
		render(<NoticePreview title="" message="" />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
		expect(screen.queryByRole("list")).not.toBeInTheDocument()
	})

	test("mostra o estado vazio quando título e mensagem têm só espaços", () => {
		render(<NoticePreview title="   " message="  " />)

		expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument()
	})

	test("mostra o item quando apenas um dos campos foi preenchido", () => {
		render(<NoticePreview title="Só título" message="" />)

		expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument()
		expect(screen.getByText("Só título")).toBeInTheDocument()
	})

	test("Review Focus: HTML e script digitados aparecem como texto na pré-visualização, sem executar", () => {
		const scriptMessage =
			'<script>window.__xss = true</script><img src="x" onerror="window.__xss = true">'
		const boldTitle = "<b>Título em negrito</b>"

		const { container } = render(
			<NoticePreview title={boldTitle} message={scriptMessage} />,
		)

		expect(screen.getByText(boldTitle)).toBeInTheDocument()
		expect(screen.getByText(scriptMessage)).toBeInTheDocument()
		expect(container.querySelector("script")).toBeNull()
		expect(container.querySelector("img")).toBeNull()
		expect(container.querySelector("b")).toBeNull()
		expect(Reflect.get(window, "__xss")).toBeUndefined()
	})
})
