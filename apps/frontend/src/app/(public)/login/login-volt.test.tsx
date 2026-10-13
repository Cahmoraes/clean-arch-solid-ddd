import { render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"

vi.mock("@react-oauth/google", () => ({
	GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
	useGoogleLogin: (options: Record<string, unknown>) => () => {
		;(
			options.onSuccess as (response: { code?: string; scope?: string }) => void
		)({ code: "auth-code-123", scope: "openid email" })
	},
}))

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/features/auth/api", () => ({
	useLogin: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
	useLoginWithGoogle: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

import LoginPage from "./page"

describe("LoginPage — identidade Replaced", () => {
	test("exibe o novo título do hero no desktop e no mobile", async () => {
		render(<LoginPage />)
		const titles = await screen.findAllByText(/Sua cidade inteira/i)
		expect(titles).toHaveLength(2)
		const mobileHero = screen.getByTestId("login-hero-mobile")
		expect(
			within(mobileHero).getByText(/Sua cidade inteira/i),
		).toBeInTheDocument()
	})

	test("exibe o eyebrow do hero e o eyebrow do formulário novos", async () => {
		render(<LoginPage />)
		expect(await screen.findByText("> VOLT // ONLINE")).toBeInTheDocument()
		expect(screen.getByText("Acesso autorizado")).toBeInTheDocument()
	})

	test("o botão de envio usa o texto novo e pixel-hover", async () => {
		render(<LoginPage />)
		const button = await screen.findByTestId("login-submit")
		expect(button).toHaveTextContent("> Entrar")
		expect(button).toHaveClass("pixel-hover")
	})

	test("a cena login roda animada e o rastro de pixels existe na coluna da cena", async () => {
		const { container } = render(<LoginPage />)
		await screen.findAllByText(/Sua cidade inteira/i)
		const scene = container.querySelector('[data-scene="login"]')
		expect(scene).not.toBeNull()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(scene).toHaveAttribute("data-paused", "false")
		const canvas = container.querySelector("aside canvas")
		expect(canvas).not.toBeNull()
		expect(canvas?.closest("[aria-hidden='true']")).not.toBeNull()
	})

	test("o eyebrow e o título carregam data-boot; o formulário não tem nenhum ancestral [data-boot]", async () => {
		render(<LoginPage />)
		const emailField = await screen.findByLabelText(/E-mail/i)
		expect(emailField.closest("[data-boot]")).toBeNull()
		const submitButton = screen.getByTestId("login-submit")
		expect(submitButton.closest("[data-boot]")).toBeNull()
	})
})
