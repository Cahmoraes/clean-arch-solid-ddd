"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Suspense, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useForgotPassword } from "@/features/auth/api"
import {
	type ForgotPasswordInput,
	forgotPasswordSchema,
} from "@/features/auth/schemas"
import { ApiError } from "@/lib/errors"

function forgotPasswordErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return error.userMessage
	}

	return "Não foi possível solicitar a recuperação de senha. Tente novamente."
}

function SuccessView() {
	return (
		<section
			data-testid="forgot-password-success"
			className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:px-6"
		>
			<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
				Solicitação recebida
			</h1>
			<p className="text-base text-muted-foreground">
				Se esse e-mail estiver cadastrado na plataforma, você receberá um link
				de recuperação em breve. O link expira em 15 minutos.
			</p>
			<Button asChild>
				<Link href="/login">Voltar para o login</Link>
			</Button>
		</section>
	)
}

function ForgotPasswordForm() {
	const emailId = useId()
	const [isSubmitted, setIsSubmitted] = useState(false)
	const { mutateAsync, isPending } = useForgotPassword()
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ForgotPasswordInput>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: "" },
	})

	async function onSubmit(values: ForgotPasswordInput) {
		try {
			await mutateAsync(values)
			reset()
			setIsSubmitted(true)
		} catch (submitError) {
			toast.error(forgotPasswordErrorMessage(submitError))
		}
	}

	if (isSubmitted) {
		return <SuccessView />
	}

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Recuperar senha
				</h1>
				<p className="text-sm text-muted-foreground">
					Informe seu e-mail para receber as instruções de recuperação.
				</p>
			</header>

			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={handleSubmit(onSubmit)}
				aria-busy={isPending}
			>
				<FormField
					id={emailId}
					label="E-mail"
					type="email"
					autoComplete="email"
					error={errors.email?.message}
					{...register("email")}
				/>

				<Button
					type="submit"
					disabled={isPending}
					data-testid="forgot-password-submit"
				>
					{isPending ? "Enviando…" : "Enviar link de recuperação"}
				</Button>
			</form>

			<p className="text-sm text-muted-foreground">
				Lembrou sua senha?{" "}
				<Link
					href="/login"
					className="font-medium text-foreground underline underline-offset-4"
				>
					Voltar para o login
				</Link>
			</p>
		</section>
	)
}

export default function RecuperarSenhaPage() {
	return (
		<Suspense
			fallback={<div data-testid="forgot-password-loading" aria-busy="true" />}
		>
			<ForgotPasswordForm />
		</Suspense>
	)
}
