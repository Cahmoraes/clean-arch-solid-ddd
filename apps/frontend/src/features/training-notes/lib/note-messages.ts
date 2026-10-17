import { ApiError } from "@/lib/errors"

export const ERRO_TEXTO_INVALIDO = "Escreva de 1 a 500 caracteres"
export const AVISO_CONFLITO = "Esse dia já tem nota — edite a atual"
export const ERRO_REDE = "Sem conexão — tente de novo"
export const ERRO_NAO_ENCONTRADA = "Nota não encontrada — recarregue o mês"

export const DESCRICAO_POR_MODO: Record<"criar" | "editar", string> = {
	criar: "Descreva o treino do dia em até 500 caracteres.",
	editar: "Edite o texto da nota ou exclua o treino do dia.",
}

const MESES_LOWER = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
] as const

const DIAS_DA_SEMANA = [
	"domingo",
	"segunda-feira",
	"terça-feira",
	"quarta-feira",
	"quinta-feira",
	"sexta-feira",
	"sábado",
] as const

export function formatarDataCurta(date: string): string {
	const dia = Number(date.slice(8, 10))
	const mes = MESES_LOWER[Number(date.slice(5, 7)) - 1] ?? ""
	return `${dia} de ${mes}`
}

export function diaDaSemana(date: string): string {
	const d = new Date(`${date}T12:00:00`)
	return DIAS_DA_SEMANA[d.getDay()] ?? ""
}

function isNotaInexistente(error: unknown): boolean {
	return error instanceof ApiError && error.status === 404
}

export function mensagemDeFalha(error: unknown): string {
	if (isNotaInexistente(error)) return ERRO_NAO_ENCONTRADA
	return ERRO_REDE
}
