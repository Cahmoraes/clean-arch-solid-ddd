"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { type CityInput, citySchema } from "@/features/weather/schemas"

export interface WeatherSearchFormProps {
	onSearch: (city: string) => void
	isPending: boolean
	defaultCity?: string
}

export function WeatherSearchForm({
	onSearch,
	isPending,
	defaultCity,
}: WeatherSearchFormProps) {
	const cityId = useId()
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<CityInput>({
		resolver: zodResolver(citySchema),
		defaultValues: { city: defaultCity ?? "" },
	})

	function onSubmit(values: CityInput) {
		if (isPending) return
		onSearch(values.city)
	}

	return (
		<form
			noValidate
			className="flex items-end gap-2"
			onSubmit={handleSubmit(onSubmit)}
			aria-busy={isPending}
		>
			<FormField
				id={cityId}
				label="Cidade (obrigatório)"
				placeholder="Ex: São Paulo"
				error={errors.city?.message}
				required
				{...register("city")}
			/>
			<Button type="submit" disabled={isPending}>
				{isPending ? "Consultando…" : "Consultar"}
			</Button>
			<div role="status" aria-live="polite" className="sr-only">
				{isPending ? "Consultando temperatura…" : ""}
			</div>
		</form>
	)
}
