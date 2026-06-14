import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import type { SendContactEmailUseCase } from "../../application/use-cases/send-contact-email/send-contact-email.use-case.js"
import { CONTACT_TYPES } from "../ioc/contact-types.js"
import { ContactRoutes } from "./contact-routes.js"

const sendContactEmailSchema = z.object({
	nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
	email: z.string().email(),
	mensagem: z.string().min(1, "Mensagem é obrigatória."),
})

@injectable()
export class SendContactEmailController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CONTACT_TYPES.USE_CASES.SendContactEmail)
		private readonly sendContactEmail: SendContactEmailUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register("post", ContactRoutes.SEND, {
			callback: this.callback,
			rateLimit: { max: 10, timeWindow: 60_000 },
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(
			sendContactEmailSchema,
			req.body,
		)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}
		await this.sendContactEmail.execute(parsedBodyOrError.value)
		return ResponseFactory.OK({
			body: { message: "Mensagem enviada com sucesso." },
		})
	}
}
