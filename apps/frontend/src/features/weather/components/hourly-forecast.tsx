import { Card, CardTitle } from "@/components/ui/card"
import type { WeatherResponse } from "@/features/weather/api/use-weather-query"
import {
	convertTemperature,
	formatValue,
	type UnitSystem,
} from "@/features/weather/lib/units"
import { resolveCondition } from "@/features/weather/lib/weather-condition"

export interface HourlyForecastProps {
	hourly: WeatherResponse["hourly"]
	units: UnitSystem
}

export function HourlyForecast({ hourly, units }: HourlyForecastProps) {
	return (
		<Card className="gap-4 p-5">
			<CardTitle as="h2">Próximas horas</CardTitle>
			<section aria-label="Próximas 24 horas">
				<ul className="grid grid-cols-4 gap-2 min-[480px]:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
					{hourly.map((item, index) => {
						const { Icon, label } = resolveCondition(item.code, item.isDay)
						const hour =
							index === 0 ? "Agora" : `${Number(item.time.slice(11, 13))}h`
						return (
							<li
								key={item.time}
								className={`flex min-w-0 flex-col items-center gap-1 rounded-md border p-2 ${
									index === 0 ? "border-primary" : "border-border"
								}`}
							>
								<span className="font-display text-base">{hour}</span>
								<Icon className="h-6 w-6" aria-hidden="true" />
								<span className="sr-only">{label}</span>
								<span className="font-display text-xl">
									{`${formatValue(convertTemperature(item.temperature, units))}°`}
								</span>
							</li>
						)
					})}
				</ul>
			</section>
		</Card>
	)
}
