import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import { GoogleSignInButton } from "./google-sign-in-button"

vi.mock("@react-oauth/google", () => ({
	GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
	GoogleLogin: ({
		onSuccess,
	}: {
		onSuccess: (response: { credential?: string }) => void
	}) => (
		<>
			<button
				type="button"
				data-testid="google-login-mock"
				onClick={() => onSuccess({ credential: "fake-id-token" })}
			>
				Google mock
			</button>
			<button
				type="button"
				data-testid="google-login-mock-no-credential"
				onClick={() => onSuccess({ credential: undefined })}
			>
				Google mock sem credential
			</button>
		</>
	),
}))

describe("GoogleSignInButton", () => {
	test("renderiza o container com data-testid correto", () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} />)

		expect(screen.getByTestId("google-sign-in-button")).toBeInTheDocument()
	})

	test("chama onSuccess com o idToken ao concluir o login Google", async () => {
		const onSuccess = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} />)
		await user.click(screen.getByTestId("google-login-mock"))

		expect(onSuccess).toHaveBeenCalledWith("fake-id-token")
	})

	test("chama onError quando credential está ausente na resposta do Google", async () => {
		const onError = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={vi.fn()} onError={onError} />)
		await user.click(screen.getByTestId("google-login-mock-no-credential"))

		expect(onError).toHaveBeenCalledWith(expect.any(Error))
	})

	test("aplica pointer-events-none e opacity quando isPending", () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} isPending />)

		const container = screen.getByTestId("google-sign-in-button")
		expect(container.className).toContain("pointer-events-none")
		expect(container.className).toContain("opacity-60")
	})

	test("aplica pointer-events-none e opacity quando disabled", () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} disabled />)

		const container = screen.getByTestId("google-sign-in-button")
		expect(container.className).toContain("pointer-events-none")
		expect(container.className).toContain("opacity-60")
	})
})
