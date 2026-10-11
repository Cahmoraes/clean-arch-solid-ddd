export class MongoUnavailableError extends Error {
	constructor(options?: ErrorOptions) {
		super(
			"MongoDB indisponível: confirme que o serviço está no ar (pnpm docker:up) e que DATABASE_URL_MONGO está correto. O MongoDB precisa rodar em replica set (--replSet) para suportar transações.",
			options,
		)
		this.name = "MongoUnavailableError"
	}
}
