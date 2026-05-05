"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useCreateGym } from "@/features/gyms/api"
import { GymLocationPicker } from "@/features/gyms/components/gym-location-picker"
import {
	type CreateGymInput,
	createGymSchema,
} from "@/features/gyms/schemas/create-gym-schema"
import { ApiError } from "@/lib/errors"

function createGymErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) return "Já existe uma academia com este CNPJ."
		return error.userMessage
	}
	return "Não foi possível cadastrar a academia. Tente novamente."
}

export default function AdminNovaAcademiaPage() {
	const router = useRouter()
	const titleId = useId()
	const cnpjId = useId()
	const descriptionId = useId()
	const phoneId = useId()

	const { mutateAsync, isPending } = useCreateGym()
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<CreateGymInput>({
		resolver: zodResolver(createGymSchema),
		defaultValues: {
			title: "",
			cnpj: "",
			description: "",
			phone: "",
			location: {
				address: "",
				latitude: 0,
				longitude: 0,
			},
		},
	})

	async function onSubmit(values: CreateGymInput) {
		try {
			const { id } = await mutateAsync(values)
			toast.success("Academia cadastrada com sucesso.")
			router.replace(`/academias/${id}`)
		} catch (submitError) {
			toast.error(createGymErrorMessage(submitError))
		}
	}

	return (
		<section
			aria-labelledby="nova-academia-title"
			className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex flex-col gap-2">
				<h1
					id="nova-academia-title"
					className="font-display text-3xl font-medium text-pure-black"
				>
					Cadastrar academia
				</h1>
				<p className="text-sm text-mid-gray">
					Disponível apenas para administradores.
				</p>
			</header>

			<form
				onSubmit={handleSubmit(onSubmit)}
				noValidate
				className="flex flex-col gap-4"
				aria-label="Formulário de cadastro de academia"
			>
				<FormField
					id={titleId}
					label="Nome"
					data-testid="gym-form-title"
					error={errors.title?.message}
					{...register("title")}
				/>
				<FormField
					id={cnpjId}
					label="CNPJ (apenas dígitos)"
					inputMode="numeric"
					data-testid="gym-form-cnpj"
					error={errors.cnpj?.message}
					{...register("cnpj")}
				/>

				<Controller
					control={control}
					name="location"
					render={({ field, fieldState }) => (
						<GymLocationPicker
							value={field.value}
							onChange={field.onChange}
							error={
								fieldState.error?.message ?? errors.location?.latitude?.message
							}
						/>
					)}
				/>

				<FormField
					id={descriptionId}
					label="Descrição (opcional)"
					data-testid="gym-form-description"
					error={errors.description?.message}
					{...register("description")}
				/>
				<FormField
					id={phoneId}
					label="Telefone (opcional, apenas dígitos)"
					inputMode="numeric"
					data-testid="gym-form-phone"
					error={errors.phone?.message}
					{...register("phone")}
				/>

				<div className="flex justify-end">
					<Button
						type="submit"
						data-testid="gym-form-submit"
						disabled={isPending}
					>
						{isPending ? "Cadastrando..." : "Cadastrar academia"}
					</Button>
				</div>
			</form>
		</section>
	)
}
