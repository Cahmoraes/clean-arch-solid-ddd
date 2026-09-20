import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { toast } from "sonner"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { NoticeForm } from "./notice-form"

const BROADCAST_PATH = "/api/v1/notifications/broadcast"
const EMPTY_PREVIEW =
	"Digite o título e a mensagem para ver a pré-visualização."

function titleInput() {
	return screen.getByLabelText(/Título/)
}

function messageInput() {
	return screen.getByLabelText(/Mensagem/)
}

function submitButton() {
	return screen.getByRole("button", { name: /Enviar aviso|Enviando/ })
}

async function fillValidNotice() {
	await userEvent.type(titleInput(), "Manutenção programada")
	await userEvent.type(messageInput(), "O sistema ficará fora do ar às 22h.")
}

beforeEach(() => {
	vi.mocked(toast.success).mockClear()
	vi.mocked(toast.error).mockClear()
})

describe("NoticeForm", () => {
	test("renderiza campos, contador, botão e pré-visualização vazia", () => {
		renderWithProviders(<NoticeForm />)

		expect(titleInput()).toBeInTheDocument()
		expect(messageInput()).toBeInTheDocument()
		expect(screen.getByText("0 / 500")).toBeInTheDocument()
		expect(submitButton()).toBeEnabled()
		expect(screen.getByText(EMPTY_PREVIEW)).toBeInTheDocument()
	})

	test("a pré-visualização acompanha o que o administrador digita", async () => {
		renderWithProviders(<NoticeForm />)

		await userEvent.type(titleInput(), "Manutenção")
		await userEvent.type(messageInput(), "Sistema fora do ar")

		const preview = screen.getByRole("list")
		expect(within(preview).getByText("Manutenção")).toBeInTheDocument()
		expect(within(preview).getByText("Sistema fora do ar")).toBeInTheDocument()
		expect(screen.queryByText(EMPTY_PREVIEW)).not.toBeInTheDocument()
	})

	test("o contador reflete a quantidade de caracteres da mensagem", async () => {
		renderWithProviders(<NoticeForm />)

		await userEvent.type(messageInput(), "abc")

		expect(screen.getByText("3 / 500")).toBeInTheDocument()
	})

	test("recusa envio vazio com mensagens claras e sem chamar a API", async () => {
		let requests = 0
		server.use(
			http.post(endpoint(BROADCAST_PATH), () => {
				requests += 1
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)

		await userEvent.click(submitButton())

		const alerts = await screen.findAllByRole("alert")
		expect(alerts.map((alert) => alert.textContent)).toEqual([
			"Informe o título do aviso.",
			"Informe a mensagem do aviso.",
		])
		expect(requests).toBe(0)
		expect(toast.success).not.toHaveBeenCalled()
	})

	test("recusa mensagem com mais de 500 caracteres", async () => {
		renderWithProviders(<NoticeForm />)
		await userEvent.type(titleInput(), "Aviso")
		fireEvent.change(messageInput(), { target: { value: "a".repeat(501) } })

		await userEvent.click(submitButton())

		expect(
			await screen.findByText("A mensagem deve ter no máximo 500 caracteres."),
		).toBeInTheDocument()
		expect(screen.getByText("501 / 500")).toBeInTheDocument()
	})

	test("sucesso: envia o corpo, mostra o toast com o total e limpa o formulário", async () => {
		let receivedBody: unknown
		server.use(
			http.post(endpoint(BROADCAST_PATH), async ({ request }) => {
				receivedBody = await request.json()
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Aviso enviado para 3 usuários.",
			),
		)
		expect(receivedBody).toEqual({
			title: "Manutenção programada",
			message: "O sistema ficará fora do ar às 22h.",
		})
		await waitFor(() => expect(titleInput()).toHaveValue(""))
		expect(messageInput()).toHaveValue("")
		expect(screen.getByText("0 / 500")).toBeInTheDocument()
		expect(screen.getByText(EMPTY_PREVIEW)).toBeInTheDocument()
		expect(toast.error).not.toHaveBeenCalled()
	})

	test("sucesso com um único destinatário usa o singular", async () => {
		server.use(
			http.post(endpoint(BROADCAST_PATH), () =>
				HttpResponse.json({ recipients: 1 }, { status: 201 }),
			),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith(
				"Aviso enviado para 1 usuário.",
			),
		)
	})

	test("erro: mostra toast de erro e mantém o texto digitado", async () => {
		server.use(
			http.post(endpoint(BROADCAST_PATH), () =>
				HttpResponse.json({ message: "falha" }, { status: 500 }),
			),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Erro interno no servidor. Tente novamente em instantes.",
			),
		)
		expect(toast.success).not.toHaveBeenCalled()
		expect(titleInput()).toHaveValue("Manutenção programada")
		expect(messageInput()).toHaveValue("O sistema ficará fora do ar às 22h.")
	})

	test("desabilita o botão durante o envio e não envia duas vezes", async () => {
		let requests = 0
		let release: () => void = () => undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		server.use(
			http.post(endpoint(BROADCAST_PATH), async () => {
				requests += 1
				await gate
				return HttpResponse.json({ recipients: 3 }, { status: 201 })
			}),
		)
		renderWithProviders(<NoticeForm />)
		await fillValidNotice()

		await userEvent.click(submitButton())

		await waitFor(() => expect(submitButton()).toBeDisabled())
		expect(submitButton()).toHaveTextContent("Enviando...")
		await userEvent.click(submitButton())
		expect(requests).toBe(1)

		release()
		await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
		await waitFor(() => expect(submitButton()).toBeEnabled())
	})

	test("acessibilidade: form rotulado, erros anunciados e campos inválidos marcados", async () => {
		renderWithProviders(<NoticeForm />)

		expect(
			screen.getByRole("form", { name: "Formulário de novo aviso" }),
		).toBeInTheDocument()

		await userEvent.click(submitButton())

		await screen.findAllByRole("alert")
		expect(titleInput()).toHaveAttribute("aria-invalid", "true")
		expect(messageInput()).toHaveAttribute("aria-invalid", "true")
		expect(titleInput()).toHaveAccessibleDescription(
			"Informe o título do aviso.",
		)
	})
})
