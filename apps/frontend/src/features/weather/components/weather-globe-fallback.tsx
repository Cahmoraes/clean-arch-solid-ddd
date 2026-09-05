/**
 * Fallback estático e decorativo do globo.
 *
 * Vive em módulo próprio (sem `react-globe.gl`/`three`) para que o
 * `WeatherGlobeErrorBoundary` possa renderizá-lo mesmo quando o chunk do globo
 * 3D falha ao carregar.
 */
import {
	GLOBE_BACKGROUND_STYLE,
	GLOBE_SIZE_PX,
} from "./weather-globe-constants"

export function WeatherGlobeFallback() {
	return (
		<div
			aria-hidden="true"
			data-testid="weather-globe-fallback"
			className="mx-auto rounded-full"
			style={{
				...GLOBE_BACKGROUND_STYLE,
				height: GLOBE_SIZE_PX,
				width: GLOBE_SIZE_PX,
			}}
		/>
	)
}
