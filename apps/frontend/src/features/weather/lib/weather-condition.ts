import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudMoon,
	CloudRain,
	CloudSun,
	CloudUnknown,
	Moon,
	type PixelIcon,
	Snowflake,
	Sun,
	Zap,
} from "@/components/ui/pixel-icons"

export type ConditionCategory =
	| "clear"
	| "partly-cloudy"
	| "cloudy"
	| "fog"
	| "drizzle"
	| "rain"
	| "snow"
	| "thunderstorm"
	| "unknown"

type KnownCategory = Exclude<ConditionCategory, "unknown">

const CATEGORY_CODES: Record<KnownCategory, readonly number[]> = {
	clear: [0, 1],
	"partly-cloudy": [2],
	cloudy: [3],
	fog: [45, 48],
	drizzle: [51, 53, 55, 56, 57],
	rain: [61, 63, 65, 66, 67, 80, 81, 82],
	snow: [71, 73, 75, 77, 85, 86],
	thunderstorm: [95, 96, 97, 99],
}

const CATEGORY_BY_CODE = new Map<number, KnownCategory>(
	(
		Object.entries(CATEGORY_CODES) as [KnownCategory, readonly number[]][]
	).flatMap(([category, codes]) =>
		codes.map((code) => [code, category] as const),
	),
)

const LABELS: Record<ConditionCategory, string> = {
	clear: "Céu limpo",
	"partly-cloudy": "Parcialmente nublado",
	cloudy: "Nublado",
	fog: "Névoa",
	drizzle: "Chuvisco",
	rain: "Chuva",
	snow: "Neve",
	thunderstorm: "Tempestade",
	unknown: "Condição indisponível",
}

const ICONS: Record<ConditionCategory, { day: PixelIcon; night: PixelIcon }> = {
	clear: { day: Sun, night: Moon },
	"partly-cloudy": { day: CloudSun, night: CloudMoon },
	cloudy: { day: Cloud, night: Cloud },
	fog: { day: CloudFog, night: CloudFog },
	drizzle: { day: CloudDrizzle, night: CloudDrizzle },
	rain: { day: CloudRain, night: CloudRain },
	snow: { day: Snowflake, night: Snowflake },
	thunderstorm: { day: Zap, night: Zap },
	unknown: { day: CloudUnknown, night: CloudUnknown },
}

export function resolveCondition(
	code: number,
	isDay: boolean,
): { category: ConditionCategory; label: string; Icon: PixelIcon } {
	const category = CATEGORY_BY_CODE.get(code) ?? "unknown"
	return {
		category,
		label: LABELS[category],
		Icon: ICONS[category][isDay ? "day" : "night"],
	}
}
