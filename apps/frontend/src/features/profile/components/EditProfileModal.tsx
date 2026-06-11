"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { type FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Eyebrow } from "@/components/ui/eyebrow"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateProfile } from "@/features/profile/api"
import { updateProfileSchema } from "@/features/profile/schemas/update-profile-schema"

interface EditProfileModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	currentName: string
	hasPassword: boolean
}

export function EditProfileModal({
	open,
	onOpenChange,
	currentName,
	hasPassword,
}: EditProfileModalProps) {
	const [name, setName] = useState(currentName)
	const [nameError, setNameError] = useState<string | null>(null)
	const { mutate: updateProfile, isPending } = useUpdateProfile()

	useEffect(() => {
		if (!open) return
		setName(currentName)
		setNameError(null)
	}, [open, currentName])

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const parsed = updateProfileSchema.safeParse({ name })
		if (!parsed.success) {
			setNameError(parsed.error.issues[0]?.message ?? "Nome inválido.")
			return
		}

		setNameError(null)
		updateProfile(
			{ name: parsed.data.name },
			{
				onSuccess: () => {
					onOpenChange(false)
				},
				onError: () => {
					setNameError("Não foi possível salvar. Tente novamente.")
				},
			},
		)
	}

	const passwordLabel = hasPassword ? "Alterar senha" : "Definir senha"

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Editar perfil</DialogTitle>
					<DialogDescription>
						Atualize seu nome e gerencie acesso à senha da conta.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<Label htmlFor="profile-name">Nome</Label>
						<Input
							id="profile-name"
							data-testid="edit-profile-name-input"
							value={name}
							onChange={(event) => {
								setName(event.target.value)
								if (nameError) {
									setNameError(null)
								}
							}}
							disabled={isPending}
							autoComplete="name"
							autoFocus
							aria-invalid={Boolean(nameError) || undefined}
							aria-describedby={nameError ? "profile-name-error" : undefined}
						/>
						{nameError ? (
							<p
								id="profile-name-error"
								role="alert"
								className="text-xs text-destructive"
							>
								{nameError}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<Eyebrow>Segurança da conta</Eyebrow>
						<Link
							href="/perfil/senha"
							data-testid="edit-profile-password-link"
							className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
							onClick={() => onOpenChange(false)}
						>
							<span>{passwordLabel}</span>
							<ArrowRight
								className="text-muted-foreground"
								aria-hidden="true"
							/>
						</Link>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							type="button"
							variant="outline"
							data-testid="edit-profile-cancel"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							data-testid="edit-profile-save"
							disabled={isPending}
						>
							{isPending ? "Salvando..." : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
