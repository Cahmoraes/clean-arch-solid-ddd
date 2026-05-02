"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useSignup } from "@/features/auth/api"
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
			<h1 className="font-display text-3xl font-medium tracking-tight text-pure-black">
				Cadastro recebido
			</h1>
			<p className="text-base text-mid-gray">
				Enviamos instruções de ativação para{" "}
				<strong className="text-near-black">{email}</strong>. Acesse sua caixa
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

export default function SignupPage() {
	const nameId = useId()
	const emailId = useId()
	const passwordId = useId()
	const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
	const { mutateAsync, isPending, error } = useSignup()
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
				<h1 className="font-display text-3xl font-medium tracking-tight text-pure-black">
					Criar conta
				</h1>
				<p className="text-sm text-stone">
					Cadastre-se para começar a registrar seus check-ins.
				</p>
			</header>

			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={handleSubmit(onSubmit)}
				aria-busy={isPending}
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
						className="rounded-[12px] border border-light-gray bg-snow px-4 py-3 text-sm text-near-black"
					>
						{submissionMessage}
					</p>
				) : null}

				<Button type="submit" disabled={isPending} data-testid="signup-submit">
					{isPending ? "Cadastrando…" : "Criar conta"}
				</Button>
			</form>

			<p className="text-sm text-stone">
				Já tem conta?{" "}
				<Link
					href="/login"
					className="font-medium text-near-black underline underline-offset-4"
				>
					Faça login
				</Link>
			</p>
		</section>
	)
}
