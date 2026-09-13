export type FeriadoType = "national"

export interface Feriado {
	date: string
	name: string
	type: FeriadoType
	isNational: boolean
}
