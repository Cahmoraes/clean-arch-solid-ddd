import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { ApiError } from "@/lib/errors"
import { server } from "@/test/msw/server"
import { contactFormSchema } from "../schemas"
import { useSendContact } from "./use-send-contact"

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

describe("contactFormSchema", () => {
	test("aceita payload válido", () => {
		const result = contactFormSchema.safeParse({
			nome: "João Silva",
			email: "joao@example.com",
			mensagem: "Olá, tenho uma dúvida.",
		})
		expect(result.success).toBe(true)
	})
	test("rejeita nome com menos de 2 caracteres", () => {
		const result = contactFormSchema.safeParse({
			nome: "J",
			email: "joao@example.com",
			mensagem: "Olá",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.nome).toBeDefined()
		}
	})
	test("rejeita e-mail inválido", () => {
		const result = contactFormSchema.safeParse({
			nome: "João",
			email: "nao-e-email",
			mensagem: "Olá",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.email).toBeDefined()
		}
	})
	test("rejeita mensagem vazia", () => {
		const result = contactFormSchema.safeParse({
			nome: "João",
			email: "joao@example.com",
			mensagem: "",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.mensagem).toBeDefined()
		}
	})
	test("rejeita mensagem com mais de 2000 caracteres", () => {
		const result = contactFormSchema.safeParse({
			nome: "João",
			email: "joao@example.com",
			mensagem: "a".repeat(2001),
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.mensagem).toBeDefined()
		}
	})
})

describe("useSendContact", () => {
	test("resolve void quando POST /contact retorna 200", async () => {
		server.use(
			http.post(`${apiBaseUrl}/contact`, () =>
				HttpResponse.json(
					{ message: "Mensagem enviada com sucesso." },
					{ status: 200 },
				),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useSendContact(), { wrapper: Wrapper })
		result.current.mutate({
			nome: "João Silva",
			email: "joao@example.com",
			mensagem: "Tenho uma dúvida.",
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})
	test("expõe isError quando POST /contact retorna 500", async () => {
		server.use(
			http.post(`${apiBaseUrl}/contact`, () =>
				HttpResponse.json({ message: "erro" }, { status: 500 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useSendContact(), { wrapper: Wrapper })
		result.current.mutate({
			nome: "João",
			email: "joao@example.com",
			mensagem: "Olá",
		})
		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error).toBeInstanceOf(ApiError)
		expect(result.current.error?.status).toBe(500)
		expect(result.current.error?.code).toBe("contact_failed")
	})
})
