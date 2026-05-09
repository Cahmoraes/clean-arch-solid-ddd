"use client"

import { type CredentialResponse, GoogleLogin } from "@react-oauth/google"

interface GoogleSignInButtonProps {
	onSuccess: (idToken: string) => void
	onError?: (error: Error) => void
	disabled?: boolean
	isPending?: boolean
}

export function GoogleSignInButton({
	onSuccess,
	onError,
	disabled = false,
	isPending = false,
}: GoogleSignInButtonProps) {
	const isInactive = disabled || isPending

	function handleSuccess(response: CredentialResponse) {
		if (!response.credential) {
			onError?.(new Error("Google não retornou um ID Token."))
			return
		}

		onSuccess(response.credential)
	}

	return (
		<div
			data-testid="google-sign-in-button"
			className={`flex w-full justify-center${isInactive ? " pointer-events-none opacity-60" : ""}`}
		>
			<GoogleLogin
				onSuccess={handleSuccess}
				onError={() =>
					onError?.(new Error("Não foi possível iniciar o login com Google."))
				}
				theme="outline"
				size="large"
				shape="pill"
				text="signin_with"
				logo_alignment="left"
				width="320"
				useOneTap={false}
			/>
		</div>
	)
}
