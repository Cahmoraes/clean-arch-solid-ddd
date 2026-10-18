import { Button } from "@/components/ui/button"
import type { UnitSystem } from "@/features/weather/lib/units"

export interface UnitToggleButtonProps {
	units: UnitSystem
	onToggle: () => void
}

export function UnitToggleButton({ units, onToggle }: UnitToggleButtonProps) {
	const isImperial = units === "imperial"

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			aria-pressed={isImperial}
			aria-label={isImperial ? "Mudar para °C e km/h" : "Mudar para °F e mph"}
			onClick={onToggle}
		>
			{isImperial ? "°C" : "°F"}
		</Button>
	)
}
