"use client"

import { useIsFetching } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import {
	useWeatherQuery,
	type WeatherResponse,
} from "@/features/weather/api/use-weather-query"
import { CurrentWeatherDisplay } from "@/features/weather/components/current-weather-display"
import { DailyForecast } from "@/features/weather/components/daily-forecast"
import { HourlyForecast } from "@/features/weather/components/hourly-forecast"
import { UnitToggleButton } from "@/features/weather/components/unit-toggle-button"
import { GLOBE_SIZE_PX } from "@/features/weather/components/weather-globe-constants"
// Import estático de propósito: o boundary não carrega `react-globe.gl`/`three`
// (faz isso via `next/dynamic` interno), então ele também protege contra falha
// no carregamento do chunk do globo.
import { WeatherGlobe } from "@/features/weather/components/weather-globe-error-boundary"
import { WeatherSearchForm } from "@/features/weather/components/weather-search-form"
import {
	convertTemperature,
	formatValue,
	parseUnits,
	type UnitSystem,
} from "@/features/weather/lib/units"

function weatherErrorMessage(code: string): string {
	if (code === "city_not_found") {
		return "Cidade não encontrada. Verifique o nome e tente novamente."
	}
	return "Serviço de meteorologia indisponível no momento. Tente novamente em instantes."
}

function weatherResultAnnouncement(
	city: string | null,
	data: { city: string; temperature: { current: number } } | undefined,
	units: UnitSystem,
): string {
	if (!city || !data) return ""
	const temperature = formatValue(
		convertTemperature(data.temperature.current, units),
	)
	return `Temperatura de ${data.city}: ${temperature} graus`
}

function WeatherCurrent({
	data,
	units,
	onToggleUnits,
}: {
	data: WeatherResponse
	units: UnitSystem
	onToggleUnits: () => void
}) {
	return (
		<CurrentWeatherDisplay
			city={data.city}
			weather={data}
			units={units}
			actions={<UnitToggleButton units={units} onToggle={onToggleUnits} />}
		/>
	)
}

function WeatherForecasts({
	data,
	units,
}: {
	data: WeatherResponse
	units: UnitSystem
}) {
	return (
		<div className="flex min-w-0 flex-col gap-6 lg:col-span-12">
			<HourlyForecast hourly={data.hourly} units={units} />
			<DailyForecast daily={data.daily} units={units} />
			<p className="text-center text-xs text-muted-foreground">
				Dados:{" "}
				<a
					href="https://open-meteo.com/"
					target="_blank"
					rel="noopener noreferrer"
					className="underline"
				>
					Open-Meteo
				</a>{" "}
				(CC BY 4.0)
			</p>
		</div>
	)
}

function WeatherPageContent() {
	const searchParams = useSearchParams()
	const router = useRouter()
	const city = searchParams.get("city")
	const units = parseUnits(searchParams.get("units"))

	const { data, error } = useWeatherQuery(city)
	const isPending = useIsFetching({ queryKey: ["weather"] }) > 0

	function handleSearch(nextCity: string) {
		const params = new URLSearchParams(searchParams.toString())
		params.set("city", nextCity)
		router.replace(`?${params.toString()}`)
	}

	function handleToggleUnits() {
		const params = new URLSearchParams(searchParams.toString())
		if (units === "imperial") params.delete("units")
		else params.set("units", "imperial")
		router.replace(`?${params.toString()}`)
	}

	return (
		<section className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl tracking-tight text-foreground md:text-4xl">
					Consulta de clima
				</h1>
				<p className="text-sm text-muted-foreground">
					Digite o nome de uma cidade para ver a temperatura atual, as próximas
					horas e a previsão da semana.
				</p>
			</header>

			<div className="grid min-w-0 gap-6 lg:grid-cols-12">
				<div className="flex min-w-0 flex-col gap-6 lg:col-span-4">
					<div
						aria-hidden="true"
						data-testid="weather-globe-slot"
						className="mx-auto"
						style={{ height: GLOBE_SIZE_PX, width: GLOBE_SIZE_PX }}
					>
						<WeatherGlobe
							latitude={data?.latitude}
							longitude={data?.longitude}
						/>
					</div>

					<WeatherSearchForm
						onSearch={handleSearch}
						isPending={isPending}
						defaultCity={city ?? undefined}
					/>
				</div>

				<div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
					{!city && <EmptyState title="Digite uma cidade para começar" />}
					{city && error && (
						<p role="alert" className="text-sm text-destructive">
							{weatherErrorMessage(error.code)}
						</p>
					)}
					{city && data && (
						<WeatherCurrent
							data={data}
							units={units}
							onToggleUnits={handleToggleUnits}
						/>
					)}
				</div>

				{city && data && <WeatherForecasts data={data} units={units} />}
			</div>
			<div role="status" aria-live="polite" className="sr-only">
				{weatherResultAnnouncement(city, data, units)}
			</div>
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
