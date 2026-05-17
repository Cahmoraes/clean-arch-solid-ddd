"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type ReactNode, Suspense, useEffect, useId } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useResetPassword } from "@/features/auth/api"
import {
	type ResetPasswordInput,
	resetPasswordSchema,
} from "@/features/auth/schemas"

interface StatusSectionProps {
	testId: string
	title: string
	description: ReactNode
	cta?: ReactNode
}

function StatusSection({
	testId,
	title,
	description,
	cta,
}: StatusSectionProps) {
	return (
		<section
			data-testid={testId}
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

function ResetPasswordForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const newPasswordId = useId()
	const confirmPasswordId = useId()
	const { mutateAsync, isPending, isSuccess } = useResetPassword()
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ResetPasswordInput>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { newPassword: "", confirmPassword: "" },
	})
	const token = searchParams.get("token")?.trim() ?? ""

	useEffect(() => {
		if (!isSuccess) return

		const timeoutId = window.setTimeout(() => {
			router.replace("/login")
		}, 3000)

		return () => window.clearTimeout(timeoutId)
	}, [isSuccess, router])

	async function onSubmit(values: ResetPasswordInput) {
		try {
			await mutateAsync({ token, ...values })
			reset()
		} catch {
			toast.error(
				"Não foi possível redefinir a senha. O link pode ter expirado ou já foi utilizado.",
			)
		}
	}

	if (!token) {
		return (
			<StatusSection
				testId="reset-password-invalid-link"
				title="Link inválido"
				description="O link de redefinição está ausente ou inválido. Solicite um novo link para continuar."
				cta={
					<Button asChild>
						<Link href="/recuperar-senha">Solicitar novo link</Link>
					</Button>
				}
			/>
		)
	}

	if (isSuccess) {
		return (
			<StatusSection
				testId="reset-password-success"
				title="Senha redefinida"
				description="Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes."
				cta={
					<Button asChild>
						<Link href="/login">Ir para o login</Link>
					</Button>
				}
			/>
		)
	}

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Redefinir senha
				</h1>
				<p className="text-sm text-muted-foreground">
					Informe sua nova senha para concluir a recuperação da conta.
				</p>
			</header>

			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={handleSubmit(onSubmit)}
				aria-busy={isPending}
			>
				<FormField
					id={newPasswordId}
					label="Nova senha"
					type="password"
					autoComplete="new-password"
					error={errors.newPassword?.message}
					{...register("newPassword")}
				/>
				<FormField
					id={confirmPasswordId}
					label="Confirmar nova senha"
					type="password"
					autoComplete="new-password"
					error={errors.confirmPassword?.message}
					{...register("confirmPassword")}
				/>

				<Button
					type="submit"
					disabled={isPending}
					data-testid="reset-password-submit"
				>
					{isPending ? "Redefinindo…" : "Redefinir senha"}
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

export default function RedefinirSenhaPage() {
	return (
		<Suspense fallback={<div aria-busy="true" />}>
			<ResetPasswordForm />
		</Suspense>
	)
}
