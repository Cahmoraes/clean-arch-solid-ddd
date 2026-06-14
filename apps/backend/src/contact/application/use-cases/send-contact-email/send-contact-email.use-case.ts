import { inject, injectable } from "inversify"
import type { MailerGateway } from "@/shared/infra/gateway/mailer-gateway.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

export interface SendContactEmailInput {
	nome: string
	email: string
	mensagem: string
}

@injectable()
export class SendContactEmailUseCase {
	constructor(
		@inject(SHARED_TYPES.Mailer)
		private readonly mailer: MailerGateway,
	) {}

	public async execute(input: SendContactEmailInput): Promise<void> {
		await this.mailer.sendMail({
			to: "contato@volt.com",
			subject: `Contato de ${input.nome} — VOLT`,
			html: `
        <h2>Nova mensagem de contato</h2>
        <p><strong>Nome:</strong> ${input.nome}</p>
        <p><strong>E-mail:</strong> ${input.email}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${input.mensagem}</p>
      `,
			text: `Nome: ${input.nome}\nE-mail: ${input.email}\nMensagem:\n${input.mensagem}`,
		})
	}
}
