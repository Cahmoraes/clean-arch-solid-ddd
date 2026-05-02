"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useChangePassword } from "@/features/auth/api"
import {
	type ChangePasswordInput,
	changePasswordSchema,
} from "@/features/auth/schemas"
import { ApiError } from "@/lib/errors"

function changePasswordErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 401) return "Senha atual incorreta."
		return error.userMessage
	}
	return "Não foi possível alterar sua senha. Tente novamente."
}

export default function ChangePasswordPage() {
	const currentId = useId()
	const newId = useId()
	const confirmId = useId()
	const { mutateAsync, isPending, error } = useChangePassword()
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ChangePasswordInput>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	})

	async function onSubmit(values: ChangePasswordInput) {
		try {
			await mutateAsync(values)
			reset()
			toast.success("Senha alterada com sucesso.")
		} catch (submitError) {
			toast.error(changePasswordErrorMessage(submitError))
		}
	}

	const submissionMessage = error ? changePasswordErrorMessage(error) : null

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-8">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-pure-black">
					Alterar senha
				</h1>
				<p className="text-sm text-stone">
					Use uma senha forte e diferente da atual.
				</p>
			</header>

			<form
				noValidate
				className="flex flex-col gap-4"
				onSubmit={handleSubmit(onSubmit)}
				aria-busy={isPending}
			>
				<FormField
					id={currentId}
					label="Senha atual"
					type="password"
					autoComplete="current-password"
					error={errors.currentPassword?.message}
					{...register("currentPassword")}
				/>
				<FormField
					id={newId}
					label="Nova senha"
					type="password"
					autoComplete="new-password"
					error={errors.newPassword?.message}
					{...register("newPassword")}
				/>
				<FormField
					id={confirmId}
					label="Confirmar nova senha"
					type="password"
					autoComplete="new-password"
					error={errors.confirmPassword?.message}
					{...register("confirmPassword")}
				/>

				{submissionMessage ? (
					<p
						role="alert"
						data-testid="change-password-submit-error"
						className="rounded-[12px] border border-light-gray bg-snow px-4 py-3 text-sm text-near-black"
					>
						{submissionMessage}
					</p>
				) : null}

				<Button
					type="submit"
					disabled={isPending}
					data-testid="change-password-submit"
				>
					{isPending ? "Alterando…" : "Alterar senha"}
				</Button>
			</form>
		</section>
	)
}
