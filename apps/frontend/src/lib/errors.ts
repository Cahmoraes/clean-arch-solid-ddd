const STATUS_MESSAGES: Record<number, string> = {
	400: "Requisição inválida. Verifique os dados informados.",
	401: "Sua sessão expirou. Faça login novamente.",
	403: "Você não tem permissão para realizar esta ação.",
	404: "Recurso não encontrado.",
	409: "Conflito ao processar a solicitação.",
	422: "Dados inválidos. Revise as informações e tente novamente.",
	429: "Muitas tentativas. Aguarde um instante e tente novamente.",
	500: "Erro interno no servidor. Tente novamente em instantes.",
	502: "Servidor indisponível. Tente novamente em instantes.",
	503: "Servidor indisponível. Tente novamente em instantes.",
	504: "Tempo de resposta excedido. Tente novamente.",
}

const FALLBACK_MESSAGE =
	"Não foi possível concluir a operação. Tente novamente."

export function mapStatusToMessage(status: number): string {
	return STATUS_MESSAGES[status] ?? FALLBACK_MESSAGE
}

export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		public readonly userMessage: string,
		public readonly details?: unknown,
	) {
		super(userMessage)
		this.name = "ApiError"
	}

	static fromStatus(
		status: number,
		code = "api_error",
		details?: unknown,
	): ApiError {
		return new ApiError(status, code, mapStatusToMessage(status), details)
	}
}
