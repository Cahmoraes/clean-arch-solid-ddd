import type * as React from "react"
import { Card } from "@/components/ui/card"
import type { WeatherResponse } from "@/features/weather/api/use-weather-query"
import {
	convertTemperature,
	convertWindSpeed,
	formatValue,
	temperatureSuffix,
	type UnitSystem,
	windDirectionLabel,
	windSuffix,
} from "@/features/weather/lib/units"
import { resolveCondition } from "@/features/weather/lib/weather-condition"
import { cn } from "@/lib/cn"

export interface CurrentWeatherDisplayProps {
	city: string
	weather: Pick<
		WeatherResponse,
		"temperature" | "condition" | "humidity" | "wind"
	>
	units: UnitSystem
	actions?: React.ReactNode
}

function StatBox({
	label,
	value,
	className,
}: {
	label: string
	value: string
	className?: string
}) {
	return (
		<div className={cn("rounded-md border border-border p-3", className)}>
			<p className="text-[11px] text-muted-foreground">{label}</p>
			<p className="font-display text-2xl">{value}</p>
		</div>
	)
}

export function CurrentWeatherDisplay({
	city,
	weather,
	units,
	actions,
}: CurrentWeatherDisplayProps) {
	const { temperature, condition, humidity, wind } = weather
	const { Icon, label } = resolveCondition(condition.code, condition.isDay)
	const formatTemperature = (celsius: number) =>
		`${formatValue(convertTemperature(celsius, units))}${temperatureSuffix(units)}`
	const windText = `${convertWindSpeed(wind.speed, units)} ${windSuffix(units)} ${windDirectionLabel(wind.directionDegrees)}`

	return (
		<Card className="flex h-full flex-col gap-6 p-5 sm:p-6">
			<div className="flex items-start justify-between gap-2">
				<p className="text-sm text-muted-foreground">{city}</p>
				{actions}
			</div>
			<div className="grid gap-6 sm:grid-cols-2 sm:items-center">
				<div className="flex items-center gap-4">
					<Icon className="h-16 w-16 shrink-0" />
					<div className="flex min-w-0 flex-col">
						<p className="font-display text-[80px] tracking-[0.04em] leading-none">
							{formatTemperature(temperature.current)}
						</p>
						<p className="font-display text-2xl text-accent">{label}</p>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2.5">
					<StatBox label="Mínima" value={formatTemperature(temperature.min)} />
					<StatBox label="Máxima" value={formatTemperature(temperature.max)} />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
				<StatBox
					label="Sensação"
					value={formatTemperature(temperature.apparent)}
				/>
				<StatBox label="Umidade" value={`${humidity}%`} />
				<StatBox
					label="Vento"
					value={windText}
					className="col-span-2 sm:col-span-1"
				/>
			</div>
		</Card>
	)
}
