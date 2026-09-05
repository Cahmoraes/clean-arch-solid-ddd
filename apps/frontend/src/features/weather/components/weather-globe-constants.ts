/**
 * Contrato público leve do globo: constantes de layout e tipo das props.
 *
 * Este módulo NÃO importa `react-globe.gl` nem `three`, por isso pode ser
 * importado estaticamente de qualquer lugar (inclusive da página `/clima`)
 * sem puxar o chunk pesado do globo 3D.
 */

export const GLOBE_SIZE_PX = 240

export const GLOBE_BACKGROUND_STYLE = {
	background:
		"radial-gradient(circle at center, #123a2c 0%, #061410 55%, #020403 100%)",
	boxShadow: "0 0 24px 4px rgba(57, 229, 140, 0.18)",
}

export interface WeatherGlobeProps {
	latitude?: number
	longitude?: number
}
