"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useLoginWithGoogle, useSignup } from "@/features/auth/api"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { type SignupInput, signupSchema } from "@/features/auth/schemas"
import { ApiError } from "@/lib/errors"

function signupErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) {
			return "Este e-mail já está cadastrado. Tente entrar."
		}
		return error.userMessage
	}
	return "Não foi possível concluir o cadastro. Tente novamente."
}

const googleSignupStatusMessages: Record<number, string> = {
	401: "Token Google inválido ou expirado.",
	409: "Este e-mail Google já está vinculado a outra conta.",
	422: "O e-mail da conta Google não está verificado.",
}

function googleSignupErrorMessage(error: unknown): string {
	if (!(error instanceof ApiError)) {
		return "Não foi possível concluir o cadastro com Google. Tente novamente."
	}

	return googleSignupStatusMessages[error.status] ?? error.userMessage
}

interface SuccessViewProps {
	email: string
	onAnother: () => void
}

function SuccessView({ email, onAnother }: SuccessViewProps) {
	return (
		<section
			data-testid="signup-success"
			className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:px-6"
		>
			<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
				Cadastro recebido
			</h1>
			<p className="text-base text-muted-foreground">
				Enviamos instruções de ativação para{" "}
				<strong className="text-foreground">{email}</strong>. Acesse sua caixa
				de entrada e clique no link para ativar sua conta.
			</p>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<Button asChild>
					<Link href="/login">Ir para o login</Link>
				</Button>
				<Button variant="outline" type="button" onClick={onAnother}>
					Cadastrar outra conta
				</Button>
			</div>
		</section>
	)
}

function SignupForm() {
	const router = useRouter()
	const nameId = useId()
	const emailId = useId()
	const passwordId = useId()
	const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
	const { mutateAsync, isPending, error } = useSignup()
	const { mutateAsync: mutateAsyncGoogle, isPending: isGooglePending } =
		useLoginWithGoogle()
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<SignupInput>({
		resolver: zodResolver(signupSchema),
		defaultValues: { name: "", email: "", password: "" },
	})

	async function onSubmit(values: SignupInput) {
		try {
			const result = await mutateAsync(values)
			setRegisteredEmail(result.email ?? values.email)
			reset()
			toast.success("Conta criada! Verifique seu e-mail para ativar.")
		} catch (submitError) {
			toast.error(signupErrorMessage(submitError))
		}
	}

	function onGoogleSuccess(idToken: string) {
		mutateAsyncGoogle(idToken)
			.then(() => router.replace("/academias"))
			.catch((err: unknown) => toast.error(googleSignupErrorMessage(err)))
	}

	const isBusy = isPending || isGooglePending

	if (registeredEmail) {
		return (
			<SuccessView
				email={registeredEmail}
				onAnother={() => setRegisteredEmail(null)}
			/>
		)
	}

	const submissionMessage = error ? signupErrorMessage(error) : null

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Criar conta
				</h1>
				<p className="text-sm text-muted-foreground">
					Cadastre-se para começar a registrar seus check-ins.
				</p>
			</header>

			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={handleSubmit(onSubmit)}
				aria-busy={isBusy}
			>
				<FormField
					id={nameId}
					label="Nome"
					type="text"
					autoComplete="name"
					error={errors.name?.message}
					{...register("name")}
				/>
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
					autoComplete="new-password"
					error={errors.password?.message}
					{...register("password")}
				/>

				{submissionMessage ? (
					<p
						role="alert"
						data-testid="signup-submit-error"
						className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-foreground"
					>
						{submissionMessage}
					</p>
				) : null}

				<Button type="submit" disabled={isBusy} data-testid="signup-submit">
					{isPending ? "Cadastrando…" : "Criar conta"}
				</Button>
			</form>

			<div className="flex items-center gap-3">
				<div className="flex-1 border-t border-border" />
				<span className="text-xs text-muted-foreground">ou</span>
				<div className="flex-1 border-t border-border" />
			</div>

			<GoogleSignInButton
				onSuccess={onGoogleSuccess}
				onError={(submitError) =>
					toast.error(googleSignupErrorMessage(submitError))
				}
				disabled={isPending}
				isPending={isGooglePending}
			/>

			<p className="text-sm text-muted-foreground">
				Já tem conta?{" "}
				<Link
					href="/login"
					className="font-medium text-foreground underline underline-offset-4"
				>
					Faça login
				</Link>
			</p>
		</section>
	)
}

export default function SignupPage() {
	return (
		<Suspense fallback={<div data-testid="signup-loading" aria-busy="true" />}>
			<SignupForm />
		</Suspense>
	)
}
