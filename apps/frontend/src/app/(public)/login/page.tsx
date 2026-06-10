"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useId } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Eyebrow } from "@/components/ui/eyebrow"
import { FormField } from "@/components/ui/form-field"
import { useLogin, useLoginWithGoogle } from "@/features/auth/api"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { type LoginInput, loginSchema } from "@/features/auth/schemas"
import { ApiError } from "@/lib/errors"

const DEFAULT_REDIRECT = "/inicio"

const LOGIN_STATS = [
	{ value: "312", label: "academias parceiras" },
	{ value: "48k", label: "check-ins por mês" },
	{ value: "4.9", label: "avaliação média" },
] as const

function loginErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.code === "password_not_set") {
			return "Essa conta ainda não possui senha local. Entre com o provider externo ou defina uma senha no perfil."
		}
		if (error.status === 401) return "E-mail ou senha incorretos."
		return error.userMessage
	}
	return "Não foi possível concluir o login. Tente novamente."
}

const googleLoginStatusMessages: Record<number, string> = {
	401: "Token Google inválido ou expirado.",
	422: "O e-mail da conta Google não está verificado.",
}

function googleLoginErrorMessage(error: unknown): string {
	if (!(error instanceof ApiError)) {
		return "Não foi possível concluir o login com Google. Tente novamente."
	}

	return googleLoginStatusMessages[error.status] ?? error.userMessage
}

function LoginForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const emailId = useId()
	const passwordId = useId()
	const { mutateAsync, isPending, error } = useLogin()
	const { mutateAsync: mutateAsyncGoogle, isPending: isGooglePending } =
		useLoginWithGoogle()
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
	})

	async function onSubmit(values: LoginInput) {
		try {
			await mutateAsync(values)
			const redirect = searchParams?.get("redirect") ?? DEFAULT_REDIRECT
			router.replace(redirect)
		} catch (submitError) {
			toast.error(loginErrorMessage(submitError))
		}
	}

	const submissionMessage = error ? loginErrorMessage(error) : null

	return (
		<div
			className="mx-auto w-full max-w-6xl"
			data-testid="login-content-container"
		>
			<div className="grid min-h-[calc(100vh-8rem)] grid-cols-[1.05fr_1fr] max-[860px]:grid-cols-1">
				<aside className="relative flex flex-col justify-between overflow-hidden bg-surface-3 p-12 dark:bg-[#0a0a0a] max-[860px]:hidden">
					<h2 className="font-display text-[clamp(48px,7vw,92px)] font-bold leading-[0.92] tracking-[-0.03em]">
						Treine onde
						<br />
						<span className="text-accent">você</span> estiver.
					</h2>
					<div className="flex flex-wrap gap-9">
						{LOGIN_STATS.map((stat) => (
							<div key={stat.label} className="flex flex-col gap-0.5">
								<span className="font-mono text-3xl font-bold text-accent tabular-nums">
									{stat.value}
								</span>
								<span className="max-w-[110px] text-xs text-muted-foreground dark:text-white/55">
									{stat.label}
								</span>
							</div>
						))}
					</div>
				</aside>

				<div className="flex flex-col justify-center p-12 max-[560px]:p-6">
					<div className="mx-auto flex w-full max-w-[400px] flex-col gap-8">
						<header className="flex flex-col gap-2">
							<Eyebrow>Acesse sua conta</Eyebrow>
							<h1 className="font-display text-[30px] font-semibold tracking-tight text-foreground">
								Entrar
							</h1>
						</header>

						<form
							noValidate
							className="flex flex-col gap-4"
							onSubmit={handleSubmit(onSubmit)}
							aria-busy={isPending || isGooglePending}
						>
							<FormField
								id={emailId}
								label="E-mail"
								type="email"
								autoComplete="email"
								error={errors.email?.message}
								{...register("email")}
							/>
							<FormField
								id={passwordId}
								label="Senha"
								type="password"
								autoComplete="current-password"
								error={errors.password?.message}
								{...register("password")}
							/>
							<div className="flex justify-end">
								<Link
									href="/recuperar-senha"
									className="text-sm font-medium text-foreground underline underline-offset-4"
								>
									Esqueceu sua senha?
								</Link>
							</div>

							{submissionMessage ? (
								<p
									role="alert"
									data-testid="login-submit-error"
									className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-foreground"
								>
									{submissionMessage}
								</p>
							) : null}

							<Button
								type="submit"
								disabled={isPending || isGooglePending}
								data-testid="login-submit"
							>
								{isPending ? "Entrando…" : "Entrar"}
							</Button>
						</form>

						<div className="flex items-center gap-3">
							<div className="flex-1 border-t border-border" />
							<span className="text-xs text-muted-foreground">ou</span>
							<div className="flex-1 border-t border-border" />
						</div>

						<GoogleSignInButton
							onSuccess={async (idToken) => {
								try {
									await mutateAsyncGoogle(idToken)
									const redirect =
										searchParams?.get("redirect") ?? DEFAULT_REDIRECT
									router.replace(redirect)
								} catch (submitError) {
									toast.error(googleLoginErrorMessage(submitError))
								}
							}}
							onError={(submitError) =>
								toast.error(googleLoginErrorMessage(submitError))
							}
							disabled={isPending}
							isPending={isGooglePending}
						/>

						<p className="text-sm text-muted-foreground">
							Não tem conta?{" "}
							<Link
								href="/cadastro"
								className="font-medium text-foreground underline underline-offset-4"
							>
								Crie agora
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function LoginPage() {
	return (
		<Suspense fallback={<div data-testid="login-loading" aria-busy="true" />}>
			<LoginForm />
		</Suspense>
	)
}
