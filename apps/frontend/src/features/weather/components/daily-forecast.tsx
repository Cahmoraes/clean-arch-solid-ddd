import { Card, CardTitle } from "@/components/ui/card"
import type { WeatherResponse } from "@/features/weather/api/use-weather-query"
import {
	convertTemperature,
	formatValue,
	type UnitSystem,
} from "@/features/weather/lib/units"
import { resolveCondition } from "@/features/weather/lib/weather-condition"

export interface DailyForecastProps {
	daily: WeatherResponse["daily"]
	units: UnitSystem
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const

function weekdayLabel(date: string, index: number): string {
	if (index === 0) return "Hoje"
	const [year, month, day] = date.split("-").map(Number)
	return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
}

function rangeStyle(
	min: number,
	max: number,
	low: number,
	high: number,
): { marginLeft: string; width: string } {
	if (high === low) return { marginLeft: "0%", width: "100%" }
	const span = high - low
	return {
		marginLeft: `${((min - low) / span) * 100}%`,
		width: `${((max - min) / span) * 100}%`,
	}
}

export function DailyForecast({ daily, units }: DailyForecastProps) {
	const low = Math.min(...daily.map((day) => day.min))
	const high = Math.max(...daily.map((day) => day.max))

	return (
		<Card className="gap-4 p-5">
			<CardTitle as="h2">Próximos 7 dias</CardTitle>
			<ul className="flex flex-col gap-3 lg:grid lg:grid-cols-7 lg:gap-2">
				{daily.map((day, index) => {
					const { Icon, label } = resolveCondition(day.code, true)
					return (
						<li
							key={day.date}
							className="flex items-center gap-3 lg:flex-col lg:gap-2 lg:rounded-md lg:border lg:border-border lg:p-3"
						>
							<span className="w-14 font-display text-base">
								{weekdayLabel(day.date, index)}
							</span>
							<Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
							<span className="sr-only">{label}</span>
							<div
								aria-hidden="true"
								className="relative h-1 flex-1 bg-muted lg:w-full lg:flex-none"
							>
								<div
									data-testid="daily-range-fill"
									className="absolute inset-y-0 bg-accent"
									style={rangeStyle(day.min, day.max, low, high)}
								/>
							</div>
							<span className="w-24 text-right font-display text-base lg:w-auto lg:text-center">
								{`${formatValue(convertTemperature(day.min, units))}° / ${formatValue(convertTemperature(day.max, units))}°`}
							</span>
						</li>
					)
				})}
			</ul>
		</Card>
	)
}
