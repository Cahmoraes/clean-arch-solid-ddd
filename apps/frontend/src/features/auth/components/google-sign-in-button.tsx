"use client"

import { useGoogleLogin } from "@react-oauth/google"
import { Button } from "@/components/ui/button"
import { GoogleGIcon } from "@/components/ui/google-g-icon"

interface GoogleSignInButtonProps {
	onSuccess: (code: string) => void
	onError?: (error: Error) => void
	disabled?: boolean
	isPending?: boolean
}

const POPUP_BLOCKED_MESSAGE =
	"Não foi possível abrir o login com Google. Verifique o bloqueador de pop-ups."

export function GoogleSignInButton({
	onSuccess,
	onError,
	disabled = false,
	isPending = false,
}: GoogleSignInButtonProps) {
	const login = useGoogleLogin({
		flow: "auth-code",
		ux_mode: "popup",
		onSuccess: ({ code }) => {
			if (!code) {
				onError?.(new Error("O Google não retornou um authorization code."))
				return
			}

			onSuccess(code)
		},
		onError: () =>
			onError?.(new Error("Não foi possível iniciar o login com Google.")),
		onNonOAuthError: ({ type }) => {
			if (type === "popup_failed_to_open") {
				onError?.(new Error(POPUP_BLOCKED_MESSAGE))
			}
		},
	})

	return (
		<Button
			type="button"
			variant="outline"
			className="w-full max-w-[400px] gap-2.5"
			onClick={() => login()}
			disabled={disabled || isPending}
			data-testid="google-sign-in-button"
		>
			<GoogleGIcon className="h-5 w-5 shrink-0" />
			Continuar com Google
		</Button>
	)
}
