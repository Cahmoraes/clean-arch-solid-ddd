"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { type ReactNode, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useActivateAccount } from "@/features/auth/api"
import { activateSchema } from "@/features/auth/schemas"
import { ApiError } from "@/lib/errors"

function activationErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 400 || error.status === 422) {
			return "Token de ativação inválido ou já utilizado."
		}
		return error.userMessage
	}
	return "Não foi possível ativar sua conta. Tente novamente."
}

interface StatusSectionProps {
	testId: string
	title: string
	description: ReactNode
	cta?: ReactNode
	ariaBusy?: boolean
}

function StatusSection({
	testId,
	title,
	description,
	cta,
	ariaBusy,
}: StatusSectionProps) {
	return (
		<section
			data-testid={testId}
			aria-busy={ariaBusy}
			className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:px-6"
		>
			<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
				{title}
			</h1>
			<p className="text-base text-muted-foreground">{description}</p>
			{cta}
		</section>
	)
}

const BackToLogin = (
	<Button asChild>
		<Link href="/login">Ir para o login</Link>
	</Button>
)

type ActivationViewState =
	| { kind: "invalid-token" }
	| { kind: "loading" }
	| { kind: "error"; error: unknown }
	| { kind: "success" }

function useActivationViewState(token: string): ActivationViewState {
	const parsed = activateSchema.safeParse({ userId: token })
	const { mutate, isSuccess, isError, error } = useActivateAccount()
	const triggered = useRef(false)
	const userId = parsed.success ? parsed.data.userId : null

	useEffect(() => {
		if (triggered.current) return
		if (!userId) return
		triggered.current = true
		mutate({ userId })
	}, [mutate, userId])

	if (!parsed.success) return { kind: "invalid-token" }
	if (isError) return { kind: "error", error }
	if (isSuccess) return { kind: "success" }
	return { kind: "loading" }
}

export default function ActivateAccountPage() {
	const params = useParams<{ token: string }>()
	const state = useActivationViewState(params?.token ?? "")

	if (state.kind === "invalid-token") {
		return (
			<StatusSection
				testId="activate-error"
				title="Token inválido"
				description="Token de ativação inválido. Verifique o link recebido."
				cta={BackToLogin}
			/>
		)
	}

	if (state.kind === "error") {
		return (
			<StatusSection
				testId="activate-error"
				title="Não foi possível ativar"
				description={activationErrorMessage(state.error)}
				cta={BackToLogin}
			/>
		)
	}

	if (state.kind === "success") {
		return (
			<StatusSection
				testId="activate-success"
				title="Conta ativada"
				description="Tudo pronto! Você já pode entrar com seu e-mail e senha."
				cta={BackToLogin}
			/>
		)
	}

	return (
		<StatusSection
			testId="activate-loading"
			title="Ativando sua conta…"
			description="Aguarde enquanto confirmamos seu cadastro."
			ariaBusy
		/>
	)
}
