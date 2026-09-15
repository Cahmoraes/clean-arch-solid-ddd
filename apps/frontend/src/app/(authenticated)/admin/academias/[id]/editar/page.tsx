"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
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
	type GymDetail,
	type UpdateGymVariables,
	useGymById,
	useUpdateGym,
} from "@/features/gyms/api"
import { GymCnpjField } from "@/features/gyms/components/gym-cnpj-field"
import { GymImageEditOverlay } from "@/features/gyms/components/gym-image-edit-overlay"
import { GymLocationPicker } from "@/features/gyms/components/gym-location-picker"
import { GymPhoneField } from "@/features/gyms/components/gym-phone-field"
import { OperatingHoursField } from "@/features/gyms/components/operating-hours-field"
import {
	updateOperatingHoursFieldValue,
	validateOperatingHoursInput,
} from "@/features/gyms/lib/operating-hours-validation"
import {
	type CreateGymInput,
	createGymSchema,
} from "@/features/gyms/schemas/create-gym-schema"
import type { DayScheduleDTO } from "@/features/gyms/schemas/operating-hours-schema"
import { ApiError } from "@/lib/errors"

function updateGymErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) return "Já existe uma academia com este CNPJ."
		if (error.status === 404) return "Academia não encontrada."
		return error.userMessage
	}
	return "Não foi possível atualizar a academia. Tente novamente."
}

async function submitEditedGym({
	gymId,
	values,
	operatingHours,
	updateGym,
	setOperatingHoursError,
	setOperatingHoursDayErrors,
}: {
	gymId: string
	values: CreateGymInput
	operatingHours: DayScheduleDTO[] | null | undefined
	updateGym: (variables: UpdateGymVariables) => Promise<{ id: string }>
	setOperatingHoursError: (value: string | null) => void
	setOperatingHoursDayErrors: (value: Partial<Record<number, string>>) => void
}): Promise<boolean> {
	const validation = validateOperatingHoursInput(operatingHours)
	if (!validation.success) {
		setOperatingHoursError(validation.error)
		setOperatingHoursDayErrors(validation.dayErrors)
		return false
	}

	setOperatingHoursError(null)
	setOperatingHoursDayErrors({})

	try {
		await updateGym({
			id: gymId,
			input: { ...values, operatingHours: validation.value },
		})
		toast.success("Academia atualizada com sucesso.")
		return true
	} catch (submitError) {
		toast.error(updateGymErrorMessage(submitError))
		return false
	}
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: form composition is intentionally dense
function EditGymForm({ gym }: { gym: GymDetail }) {
	const router = useRouter()
	const titleId = useId()
	const cnpjId = useId()
	const descriptionId = useId()
	const phoneId = useId()
	const { mutateAsync: updateGym, isPending } = useUpdateGym()
	const [operatingHours, setOperatingHours] = useState<
		DayScheduleDTO[] | null | undefined
	>(gym.operatingHours ?? undefined)
	const [operatingHoursError, setOperatingHoursError] = useState<string | null>(
		null,
	)
	const [operatingHoursDayErrors, setOperatingHoursDayErrors] = useState<
		Partial<Record<number, string>>
	>({})

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

	async function onSubmit(values: CreateGymInput) {
		const updated = await submitEditedGym({
			gymId: gym.id,
			values,
			operatingHours,
			updateGym,
			setOperatingHoursError,
			setOperatingHoursDayErrors,
		})
		if (updated) router.replace(`/academias/${gym.id}`)
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			noValidate
			className="flex flex-col gap-4"
			aria-label="Formulário de edição de academia"
		>
			<GymImageEditOverlay
				gymId={gym.id}
				imageKey={gym.imageKey}
				gymTitle={gym.title}
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
			<details className="rounded-md border p-3">
				<summary className="cursor-pointer text-sm font-medium">
					Horário de funcionamento (opcional)
				</summary>
				<div className="pt-3">
					<OperatingHoursField
						value={operatingHours}
						onChange={(next) =>
							updateOperatingHoursFieldValue(
								next,
								setOperatingHours,
								setOperatingHoursError,
								setOperatingHoursDayErrors,
							)
						}
						error={operatingHoursError}
						dayErrors={operatingHoursDayErrors}
					/>
				</div>
			</details>
			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={() => router.push("/academias")}
				>
					Descartar alterações
				</Button>
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
			<div>
				<Link
					href="/academias"
					data-testid="gym-edit-back-link"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="h-4 w-4" />
					Voltar para a busca
				</Link>
			</div>
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
