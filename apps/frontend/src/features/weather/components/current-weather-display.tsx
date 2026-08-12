import { Card } from "@/components/ui/card"

export interface CurrentWeatherDisplayProps {
	city: string
	temperature: { current: number; min: number; max: number }
}

export function CurrentWeatherDisplay({
	city,
	temperature,
}: CurrentWeatherDisplayProps) {
	return (
		<Card className="flex flex-col gap-5 p-5">
			<p className="text-sm text-muted-foreground">{city}</p>
			<p className="font-mono text-5xl font-semibold leading-none">
				{temperature.current}°C
			</p>
			<div className="grid grid-cols-2 gap-2.5">
				<div className="rounded-[10px] border border-border p-3">
					<p className="text-[11px] text-muted-foreground">Mínima</p>
					<p className="font-mono text-xl font-semibold">{temperature.min}°C</p>
				</div>
				<div className="rounded-[10px] border border-border p-3">
					<p className="text-[11px] text-muted-foreground">Máxima</p>
					<p className="font-mono text-xl font-semibold">{temperature.max}°C</p>
				</div>
			</div>
		</Card>
	)
}
