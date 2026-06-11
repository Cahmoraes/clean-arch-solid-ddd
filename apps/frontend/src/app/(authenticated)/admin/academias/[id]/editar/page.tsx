"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useParams, useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FormField } from "@/components/ui/form-field"
import { Skeleton } from "@/components/ui/skeleton"
import {
	type Gym,
	useGymById,
	useSetGymImage,
	useUpdateGym,
} from "@/features/gyms/api"
import { GymCnpjField } from "@/features/gyms/components/gym-cnpj-field"
import { GymImage } from "@/features/gyms/components/gym-image"
import { GymImageUploader } from "@/features/gyms/components/gym-image-uploader"
import { GymLocationPicker } from "@/features/gyms/components/gym-location-picker"
import { GymPhoneField } from "@/features/gyms/components/gym-phone-field"
import {
	type CreateGymInput,
	createGymSchema,
} from "@/features/gyms/schemas/create-gym-schema"
import { ApiError } from "@/lib/errors"

function updateGymErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) return "Já existe uma academia com este CNPJ."
		if (error.status === 404) return "Academia não encontrada."
		return error.userMessage
	}
	return "Não foi possível atualizar a academia. Tente novamente."
}

function EditGymForm({ gym }: { gym: Gym }) {
	const router = useRouter()
	const titleId = useId()
	const cnpjId = useId()
	const descriptionId = useId()
	const phoneId = useId()
	const [imageBlob, setImageBlob] = useState<Blob | null>(null)
	const { mutateAsync: updateGym, isPending } = useUpdateGym()
	const { mutateAsync: setGymImage } = useSetGymImage()
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<CreateGymInput>({
		resolver: zodResolver(createGymSchema),
		defaultValues: {
			title: gym.title,
			cnpj: gym.cnpj ?? "",
			description: gym.description ?? "",
			phone: gym.phone ?? "",
			location: {
				address: gym.address ?? "",
				latitude: gym.latitude,
				longitude: gym.longitude,
			},
		},
	})

	async function uploadImageIfPresent() {
		if (!imageBlob) return
		try {
			await setGymImage({ id: gym.id, file: imageBlob })
		} catch {
			toast.error("Dados salvos, mas a imagem falhou. Tente reenviar.")
		}
	}

	async function onSubmit(values: CreateGymInput) {
		try {
			await updateGym({ id: gym.id, input: values })
			await uploadImageIfPresent()
			toast.success("Academia atualizada com sucesso.")
			router.replace(`/academias/${gym.id}`)
		} catch (submitError) {
			toast.error(updateGymErrorMessage(submitError))
		}
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			noValidate
			className="flex flex-col gap-4"
			aria-label="Formulário de edição de academia"
		>
			<GymImage
				imageKey={gym.imageKey}
				alt={gym.title}
				className="h-40 w-full rounded-[8px]"
			/>
			<FormField
				id={titleId}
				label="Nome"
				data-testid="gym-form-title"
				error={errors.title?.message}
				{...register("title")}
			/>
			<Controller
				control={control}
				name="cnpj"
				render={({ field, fieldState }) => (
					<GymCnpjField
						id={cnpjId}
						value={field.value}
						onAccept={field.onChange}
						onBlur={field.onBlur}
						error={fieldState.error?.message}
						testId="gym-form-cnpj"
					/>
				)}
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
			<Controller
				control={control}
				name="phone"
				render={({ field, fieldState }) => (
					<GymPhoneField
						id={phoneId}
						value={field.value ?? ""}
						onAccept={field.onChange}
						onBlur={field.onBlur}
						error={fieldState.error?.message}
						testId="gym-form-phone"
					/>
				)}
			/>
			<GymImageUploader
				onCropped={setImageBlob}
				label="Trocar imagem (opcional)"
			/>
			<div className="flex justify-end">
				<Button
					type="submit"
					data-testid="gym-form-submit"
					disabled={isPending}
				>
					{isPending ? "Salvando..." : "Salvar alterações"}
				</Button>
			</div>
		</form>
	)
}

export default function AdminEditarAcademiaPage() {
	const params = useParams<{ id: string }>()
	const id = params?.id
	const query = useGymById(id)

	return (
		<PageContainer
			as="section"
			width="narrow"
			aria-labelledby="editar-academia-title"
		>
			<header className="flex flex-col gap-2">
				<h1
					id="editar-academia-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Editar academia
				</h1>
				<p className="text-sm text-muted-foreground">
					Disponível apenas para administradores.
				</p>
			</header>

			{query.isLoading ? (
				<div className="flex flex-col gap-4" data-testid="gym-edit-loading">
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{query.isError ? (
				<EmptyState
					title="Não foi possível carregar a academia"
					description={query.error?.userMessage ?? "Tente novamente."}
					action={
						<Button variant="outline" onClick={() => query.refetch()}>
							Tentar novamente
						</Button>
					}
				/>
			) : null}

			{query.data ? <EditGymForm gym={query.data} /> : null}
		</PageContainer>
	)
}
