"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import type { PlanAdmin } from "@/features/plans-admin/api"
import { useCreatePlan, useUpdatePlan } from "@/features/plans-admin/api"
import {
	type PlanAdminInput,
	planAdminSchema,
} from "@/features/plans-admin/schemas/plan-admin-schema"
import { ApiError } from "@/lib/errors"

export interface PlanFormDialogProps {
	open: boolean
	plan?: PlanAdmin | null
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

function parseFeatures(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}

function toDefaultValues(plan: PlanAdmin | null | undefined): PlanAdminInput {
	if (!plan) {
		return {
			name: "",
			price: 0,
			billingPeriod: "monthly",
			tagline: "",
			features: [],
			stripePriceId: "",
		}
	}
	return {
		name: plan.name,
		price: plan.priceCents / 100,
		billingPeriod: plan.billingPeriod,
		tagline: plan.tagline,
		features: [...plan.features],
		stripePriceId: plan.stripePriceId,
	}
}

function submitErrorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível salvar o plano. Tente novamente."
}

export function PlanFormDialog({
	open,
	plan,
	onOpenChange,
	onSuccess,
}: PlanFormDialogProps) {
	const nameId = useId()
	const priceId = useId()
	const taglineId = useId()
	const featuresId = useId()
	const stripePriceIdFieldId = useId()
	const billingPeriodId = useId()
	const isEditing = Boolean(plan)

	const createPlan = useCreatePlan()
	const updatePlan = useUpdatePlan()
	const isPending = createPlan.isPending || updatePlan.isPending

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		formState: { errors },
	} = useForm<PlanAdminInput>({
		resolver: zodResolver(planAdminSchema),
		defaultValues: toDefaultValues(plan),
	})
	const [featuresText, setFeaturesText] = useState(
		toDefaultValues(plan).features.join("\n"),
	)

	useEffect(() => {
		const defaults = toDefaultValues(plan)
		reset(defaults)
		setFeaturesText(defaults.features.join("\n"))
	}, [plan, reset])

	async function onSubmit(values: PlanAdminInput) {
		try {
			if (plan) {
				await updatePlan.mutateAsync({ id: plan.id, input: values })
			} else {
				await createPlan.mutateAsync(values)
			}
			toast.success(
				plan ? "Plano atualizado com sucesso!" : "Plano criado com sucesso!",
			)
			onSuccess?.()
			onOpenChange(false)
		} catch (submitError) {
			toast.error(submitErrorMessage(submitError))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? "Editar plano" : "Novo plano"}</DialogTitle>
					<DialogDescription>
						Preencha os dados do plano de assinatura.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					noValidate
					className="flex flex-col gap-4"
					aria-label="Formulário de plano"
				>
					<FormField
						id={nameId}
						label="Nome"
						error={errors.name?.message}
						{...register("name")}
					/>
					<FormField
						id={priceId}
						label="Preço (R$)"
						type="number"
						step="0.01"
						error={errors.price?.message}
						{...register("price", { valueAsNumber: true })}
					/>
					<div className="flex flex-col gap-2">
						<label
							htmlFor={billingPeriodId}
							className="text-sm font-medium text-foreground"
						>
							Periodicidade
						</label>
						<select
							id={billingPeriodId}
							className="flex h-10 w-full rounded-md border border-subtle bg-background px-4 py-2 text-base text-foreground focus-ring-duplo"
							{...register("billingPeriod")}
						>
							<option value="monthly">Mensal</option>
							<option value="yearly">Anual</option>
						</select>
					</div>
					<FormField
						id={taglineId}
						label="Tagline"
						error={errors.tagline?.message}
						{...register("tagline")}
					/>
					<div className="flex flex-col gap-2">
						<label
							htmlFor={featuresId}
							className="text-sm font-medium text-foreground"
						>
							Benefícios (um por linha)
						</label>
						<textarea
							id={featuresId}
							rows={4}
							value={featuresText}
							onChange={(event) => {
								setFeaturesText(event.target.value)
								setValue("features", parseFeatures(event.target.value), {
									shouldValidate: true,
								})
							}}
							className="flex w-full rounded-md border border-subtle bg-background px-4 py-2 text-base text-foreground focus-ring-duplo"
						/>
						{errors.features ? (
							<p role="alert" className="text-sm text-destructive">
								{errors.features.message}
							</p>
						) : null}
					</div>
					<FormField
						id={stripePriceIdFieldId}
						label="Stripe Price ID (opcional)"
						error={errors.stripePriceId?.message}
						{...register("stripePriceId")}
					/>

					<DialogFooter>
						<Button type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending ? "Salvando..." : "Salvar plano"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
