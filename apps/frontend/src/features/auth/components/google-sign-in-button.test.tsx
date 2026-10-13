import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { GoogleSignInButton } from "./google-sign-in-button"

type GoogleScenario =
	| "code"
	| "no_code"
	| "popup_blocked"
	| "popup_closed"
	| "popup_error"

const { scenario, lastUseGoogleLoginOptions } = vi.hoisted(() => ({
	scenario: { current: "code" as GoogleScenario },
	lastUseGoogleLoginOptions: [] as Record<string, unknown>[],
}))

vi.mock("@react-oauth/google", () => ({
	useGoogleLogin: (options: Record<string, unknown>) => {
		lastUseGoogleLoginOptions.push(options)

		return () => {
			const onSuccess = options.onSuccess as
				| ((response: { code?: string; scope?: string }) => void)
				| undefined
			const onError = options.onError as
				| ((response: unknown) => void)
				| undefined
			const onNonOAuthError = options.onNonOAuthError as
				| ((response: { type: string }) => void)
				| undefined

			switch (scenario.current) {
				case "code":
					onSuccess?.({ code: "fake-auth-code", scope: "openid email" })
					break
				case "no_code":
					onSuccess?.({ scope: "openid email" })
					break
				case "popup_blocked":
					onNonOAuthError?.({ type: "popup_failed_to_open" })
					break
				case "popup_closed":
					onNonOAuthError?.({ type: "popup_closed" })
					break
				case "popup_error":
					onError?.({ error: "popup_error" })
					break
			}
		}
	},
}))

describe("GoogleSignInButton", () => {
	beforeEach(() => {
		lastUseGoogleLoginOptions.length = 0
		scenario.current = "code"
	})

	test("AC-01 entrega o authorization code ao onSuccess quando o usuário conclui o login Google", async () => {
		const onSuccess = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onSuccess).toHaveBeenCalledWith("fake-auth-code")
	})

	test("dispara o fluxo auth-code em popup, sem token no browser", async () => {
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={vi.fn()} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(lastUseGoogleLoginOptions.at(-1)).toMatchObject({
			flow: "auth-code",
			ux_mode: "popup",
		})
	})

	test("AC-02 renderiza o Button do design system com variant outline, font-display e o logo G oficial", () => {
		render(<GoogleSignInButton onSuccess={vi.fn()} />)

		const button = screen.getByTestId("google-sign-in-button")

		expect(button).toHaveClass("bg-card", "font-display", "uppercase")
		expect(button).toHaveClass("w-full", "max-w-[400px]")
		expect(button).toHaveTextContent("Continuar com Google")
		expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
		expect(button).not.toHaveClass("pointer-events-none")
	})

	test("AC-04 mapeia popup bloqueado para onError com a mensagem do bloqueador", async () => {
		scenario.current = "popup_blocked"
		const onError = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={vi.fn()} onError={onError} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onError).toHaveBeenCalledWith(expect.any(Error))
		expect(onError.mock.calls[0][0].message).toBe(
			"Não foi possível abrir o login com Google. Verifique o bloqueador de pop-ups.",
		)
	})

	test("AC-05 não reporta erro quando o usuário fecha o popup", async () => {
		scenario.current = "popup_closed"
		const onError = vi.fn()
		const onSuccess = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} onError={onError} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onError).not.toHaveBeenCalled()
		expect(onSuccess).not.toHaveBeenCalled()
		expect(screen.getByTestId("google-sign-in-button")).toBeEnabled()
	})

	test("deriva disabled e isPending do Button, sem travar o ciclo de loading", async () => {
		const user = userEvent.setup()
		const { rerender } = render(
			<GoogleSignInButton onSuccess={vi.fn()} isPending />,
		)

		expect(screen.getByTestId("google-sign-in-button")).toBeDisabled()

		rerender(<GoogleSignInButton onSuccess={vi.fn()} />)

		expect(screen.getByTestId("google-sign-in-button")).toBeEnabled()
		await user.click(screen.getByTestId("google-sign-in-button"))
	})

	test("Google sem authorization code no payload não quebra o ciclo de loading", async () => {
		scenario.current = "no_code"
		const onSuccess = vi.fn()
		const onError = vi.fn()
		const user = userEvent.setup()

		render(<GoogleSignInButton onSuccess={onSuccess} onError={onError} />)
		await user.click(screen.getByTestId("google-sign-in-button"))

		expect(onSuccess).not.toHaveBeenCalled()
		expect(onError).toHaveBeenCalledWith(expect.any(Error))
		expect(onError.mock.calls[0][0].message).toMatch(/authorization code/i)
		expect(screen.getByTestId("google-sign-in-button")).toBeEnabled()
	})
})
