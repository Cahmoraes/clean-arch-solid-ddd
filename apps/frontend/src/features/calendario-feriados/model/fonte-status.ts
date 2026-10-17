export type FonteStatus = "ok" | "carregando" | "erro"

export const MSG_CARREGANDO_NOTAS = "Carregando notas"
export const MSG_CARREGANDO_FERIADOS = "Carregando feriados"
export const MSG_ERRO_NOTAS = "Não foi possível carregar as notas"
export const MSG_ERRO_FERIADOS = "Não foi possível carregar os feriados"
export const TEXTO_TENTAR_DE_NOVO = "Tentar de novo"
export const ARIA_TENTAR_DE_NOVO_NOTAS = "Tentar de novo (notas)"
export const ARIA_TENTAR_DE_NOVO_FERIADOS = "Tentar de novo (feriados)"

/**
 * Dados em cache sempre vencem: pendência ou falha de refetch com dados
 * continua "ok", só a ausência de dados vira carregando ou erro.
 */
export function statusDaFonte(input: {
	isPending: boolean
	isError: boolean
	hasData: boolean
}): FonteStatus {
	if (input.hasData) return "ok"
	if (input.isPending) return "carregando"
	if (input.isError) return "erro"
	return "ok"
}
