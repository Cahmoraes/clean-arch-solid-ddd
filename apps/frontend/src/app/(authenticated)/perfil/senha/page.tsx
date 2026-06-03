"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound } from "lucide-react"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FormField } from "@/components/ui/form-field"
import { Skeleton } from "@/components/ui/skeleton"
import {
	useChangePassword,
	useCreatePasswordReauthGrant,
	useDefinePassword,
} from "@/features/auth/api"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import {
	type ChangePasswordInput,
	changePasswordSchema,
	type DefinePasswordInput,
	definePasswordSchema,
} from "@/features/auth/schemas"
import { useMe } from "@/features/profile/api"
import { ApiError } from "@/lib/errors"

function changePasswordErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 401) return "Senha atual incorreta."
		return error.userMessage
	}
	return "Não foi possível alterar sua senha. Tente novamente."
}

function definePasswordErrorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível definir sua senha. Tente novamente."
}

function passwordReauthErrorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.userMessage
	if (error instanceof Error) return error.message
	return "Não foi possível confirmar sua reautenticação com Google."
}

function ExistingChangePasswordForm() {
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
					className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-foreground"
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
	)
}

interface DefinePasswordFormProps {
	provider: "google"
}

function DefinePasswordForm({ provider }: DefinePasswordFormProps) {
	const newId = useId()
	const confirmId = useId()
	const [reauthGrant, setReauthGrant] = useState<string | null>(null)
	const { mutateAsync: requestReauth, isPending: isRequestingReauth } =
		useCreatePasswordReauthGrant()
	const { mutateAsync: definePassword, isPending, error } = useDefinePassword()
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<DefinePasswordInput>({
		resolver: zodResolver(definePasswordSchema),
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
	})

	async function onSubmit(values: DefinePasswordInput) {
		if (!reauthGrant) return

		try {
			await definePassword({
				provider,
				reauthGrant,
				newPassword: values.newPassword,
			})
			reset()
			setReauthGrant(null)
			toast.success("Senha definida com sucesso.")
		} catch (submitError) {
			toast.error(definePasswordErrorMessage(submitError))
		}
	}

	const submissionMessage = error ? definePasswordErrorMessage(error) : null
	const isSubmitDisabled = !reauthGrant || isPending

	return (
		<form
			noValidate
			className="flex flex-col gap-4"
			onSubmit={handleSubmit(onSubmit)}
			aria-busy={isPending || isRequestingReauth}
		>
			<p className="text-sm text-muted-foreground">
				Confirme sua identidade com Google antes de definir uma senha local.
			</p>

			<GoogleSignInButton
				onSuccess={async (idToken) => {
					try {
						const response = await requestReauth({ provider, idToken })
						setReauthGrant(response.reauthGrant)
						toast.success(
							"Reautenticação confirmada. Agora você já pode definir sua senha.",
						)
					} catch (submitError) {
						toast.error(passwordReauthErrorMessage(submitError))
					}
				}}
				onError={(submitError) =>
					toast.error(passwordReauthErrorMessage(submitError))
				}
				disabled={isPending}
				isPending={isRequestingReauth}
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
					className="rounded-[12px] border border-border bg-accent px-4 py-3 text-sm text-foreground"
				>
					{submissionMessage}
				</p>
			) : null}

			<Button
				type="submit"
				disabled={isSubmitDisabled}
				data-testid="change-password-submit"
			>
				{isPending ? "Definindo…" : "Definir senha"}
			</Button>
		</form>
	)
}

function LoadingPasswordPage() {
	return (
		<PageContainer as="section" width="narrow">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Senha
				</h1>
				<p className="text-sm text-muted-foreground">
					Carregando configurações de acesso…
				</p>
			</header>
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		</PageContainer>
	)
}

interface PasswordErrorPageProps {
	isFetching: boolean
	onRetry: () => void
}

function PasswordErrorPage({ isFetching, onRetry }: PasswordErrorPageProps) {
	return (
		<PageContainer as="section" width="narrow">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Senha
				</h1>
				<p className="text-sm text-muted-foreground">
					Não foi possível identificar o fluxo disponível para sua conta.
				</p>
			</header>
			<EmptyState
				icon={KeyRound}
				title="Não foi possível carregar sua configuração de senha"
				description="Tente novamente em instantes."
				action={
					<Button
						type="button"
						variant="secondary"
						onClick={onRetry}
						disabled={isFetching}
					>
						Tentar novamente
					</Button>
				}
			/>
		</PageContainer>
	)
}

interface PasswordContentPageProps {
	authMethods: string[]
	hasPassword: boolean
}

function PasswordContentPage({
	authMethods,
	hasPassword,
}: PasswordContentPageProps) {
	const shouldDefinePassword =
		hasPassword === false && authMethods.includes("google")
	const title = shouldDefinePassword ? "Definir senha" : "Alterar senha"
	const description = shouldDefinePassword
		? "Confirme sua conta Google para criar uma senha local e liberar o login por e-mail."
		: "Use uma senha forte e diferente da atual."

	return (
		<PageContainer as="section" width="narrow">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					{title}
				</h1>
				<p className="text-sm text-muted-foreground">{description}</p>
			</header>
			{shouldDefinePassword ? (
				<DefinePasswordForm provider="google" />
			) : (
				<ExistingChangePasswordForm />
			)}
		</PageContainer>
	)
}

export default function ChangePasswordPage() {
	const { data, isLoading, isError, refetch, isFetching } = useMe()

	if (isLoading) return <LoadingPasswordPage />
	if (isError || !data) {
		return (
			<PasswordErrorPage
				isFetching={isFetching}
				onRetry={() => {
					void refetch()
				}}
			/>
		)
	}

	return (
		<PasswordContentPage
			authMethods={data.authMethods}
			hasPassword={data.hasPassword}
		/>
	)
}
