"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { useWeatherQuery } from "@/features/weather/api/use-weather-query"
import { CurrentWeatherDisplay } from "@/features/weather/components/current-weather-display"
import { WeatherSearchForm } from "@/features/weather/components/weather-search-form"

function weatherErrorMessage(code: string): string {
	if (code === "city_not_found") {
		return "Cidade não encontrada. Verifique o nome e tente novamente."
	}
	return "Serviço de meteorologia indisponível no momento. Tente novamente em instantes."
}

function WeatherPageContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const city = searchParams.get("city")

	const { data, error, isFetching } = useWeatherQuery(city)

	function handleSearch(nextCity: string) {
		const params = new URLSearchParams(searchParams.toString())
		params.set("city", nextCity)
		router.replace(`?${params.toString()}`)
	}

	return (
		<section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-16 sm:px-6">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Consulta de clima
				</h1>
				<p className="text-sm text-muted-foreground">
					Digite o nome de uma cidade para ver a temperatura atual.
				</p>
			</header>

			<WeatherSearchForm
				onSearch={handleSearch}
				isPending={isFetching}
				defaultCity={city ?? undefined}
			/>

			{!city && <EmptyState title="Digite uma cidade para começar" />}
			{city && error && (
				<p role="alert" className="text-sm text-destructive">
					{weatherErrorMessage(error.code)}
				</p>
			)}
			{city && data && (
				<CurrentWeatherDisplay
					city={data.city}
					temperature={data.temperature}
				/>
			)}
		</section>
	)
}

export default function WeatherPage() {
	return (
		<Suspense
			fallback={<div data-testid="weather-page-loading" aria-busy="true" />}
		>
			<WeatherPageContent />
		</Suspense>
	)
}
