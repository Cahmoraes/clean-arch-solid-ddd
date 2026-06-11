import { screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("@react-oauth/google", () => ({
	GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
	GoogleLogin: ({
		onSuccess,
	}: {
		onSuccess: (resp: { credential?: string }) => void
	}) => (
		<button
			type="button"
			data-testid="google-login-mock"
			onClick={() => onSuccess({ credential: "fake-google-token" })}
		>
			Google
		</button>
	),
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

describe("Login VOLT", () => {
	test("exibe o hero no painel-marca desktop e no bloco mobile", () => {
		renderWithProviders(<LoginPage />)
		expect(screen.getAllByText(/Treine onde/i)).toHaveLength(2)
	})

	test("exibe o hero compacto no bloco mobile com as estatísticas", () => {
		renderWithProviders(<LoginPage />)
		const mobileHero = screen.getByTestId("login-hero-mobile")
		expect(within(mobileHero).getByText(/Treine onde/i)).toBeInTheDocument()
		expect(within(mobileHero).getByText("312")).toBeInTheDocument()
		expect(within(mobileHero).getByText("48k")).toBeInTheDocument()
		expect(within(mobileHero).getByText("4.9")).toBeInTheDocument()
	})

	test("preserva os campos e o botão de submit", () => {
		renderWithProviders(<LoginPage />)
		expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument()
		expect(screen.getByTestId("login-submit")).toBeInTheDocument()
	})
})
