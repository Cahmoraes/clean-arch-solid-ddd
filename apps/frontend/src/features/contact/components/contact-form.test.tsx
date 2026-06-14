import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { ContactForm } from "./contact-form"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	})
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return { Wrapper }
}

describe("ContactForm", () => {
	test("exibe três campos: nome, e-mail e mensagem", () => {
		const { Wrapper } = makeWrapper()
		render(<ContactForm />, { wrapper: Wrapper })
		expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument()
	})
	test("exibe erro de validação quando nome tem menos de 2 caracteres", async () => {
		const user = userEvent.setup()
		const { Wrapper } = makeWrapper()
		render(<ContactForm />, { wrapper: Wrapper })
		await user.type(screen.getByLabelText(/nome/i), "J")
		await user.click(screen.getByRole("button", { name: /enviar/i }))
		await waitFor(() => {
			expect(
				screen.getByText(/nome deve ter pelo menos 2 caracteres/i),
			).toBeInTheDocument()
		})
	})
	test("exibe erro de validação quando e-mail é inválido", async () => {
		const user = userEvent.setup()
		const { Wrapper } = makeWrapper()
		render(<ContactForm />, { wrapper: Wrapper })
		await user.type(screen.getByLabelText(/nome/i), "João Silva")
		await user.type(screen.getByLabelText(/e-mail/i), "nao-e-email")
		await user.type(screen.getByLabelText(/mensagem/i), "Olá")
		await user.click(screen.getByRole("button", { name: /enviar/i }))
		await waitFor(() => {
			expect(screen.getByText(/informe um e-mail válido/i)).toBeInTheDocument()
		})
	})
	test("desabilita o botão e exibe 'Enviando…' durante o envio", async () => {
		server.use(
			http.post(`${apiBaseUrl}/contact`, async () => {
				await new Promise((r) => setTimeout(r, 100))
				return HttpResponse.json({ message: "ok" }, { status: 200 })
			}),
		)
		const user = userEvent.setup()
		const { Wrapper } = makeWrapper()
		render(<ContactForm />, { wrapper: Wrapper })
		await user.type(screen.getByLabelText(/nome/i), "João Silva")
		await user.type(screen.getByLabelText(/e-mail/i), "joao@example.com")
		await user.type(
			screen.getByLabelText(/mensagem/i),
			"Olá, tenho uma dúvida.",
		)
		await user.click(screen.getByRole("button", { name: /enviar/i }))
		expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled()
	})
	test("limpa os campos após envio bem-sucedido", async () => {
		server.use(
			http.post(`${apiBaseUrl}/contact`, () =>
				HttpResponse.json({ message: "ok" }, { status: 200 }),
			),
		)
		const user = userEvent.setup()
		const { Wrapper } = makeWrapper()
		render(<ContactForm />, { wrapper: Wrapper })
		await user.type(screen.getByLabelText(/nome/i), "João Silva")
		await user.type(screen.getByLabelText(/e-mail/i), "joao@example.com")
		await user.type(screen.getByLabelText(/mensagem/i), "Olá.")
		await user.click(screen.getByRole("button", { name: /enviar/i }))
		await waitFor(() => {
			expect(screen.getByLabelText(/nome/i)).toHaveValue("")
			expect(screen.getByLabelText(/e-mail/i)).toHaveValue("")
			expect(screen.getByLabelText(/mensagem/i)).toHaveValue("")
		})
	})
	test("exibe mensagem de erro inline quando o envio falha", async () => {
		server.use(
			http.post(`${apiBaseUrl}/contact`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)
		const user = userEvent.setup()
		const { Wrapper } = makeWrapper()
		render(<ContactForm />, { wrapper: Wrapper })
		await user.type(screen.getByLabelText(/nome/i), "João")
		await user.type(screen.getByLabelText(/e-mail/i), "joao@example.com")
		await user.type(screen.getByLabelText(/mensagem/i), "Olá.")
		await user.click(screen.getByRole("button", { name: /enviar/i }))
		await waitFor(() => {
			expect(
				screen.getByText(/não foi possível enviar sua mensagem/i),
			).toBeInTheDocument()
		})
	})
})
