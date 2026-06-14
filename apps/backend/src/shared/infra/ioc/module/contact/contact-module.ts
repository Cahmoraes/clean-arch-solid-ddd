import { ContainerModule } from "inversify"
import { SendContactEmailUseCase } from "@/contact/application/use-cases/send-contact-email/send-contact-email.use-case.js"
import { SendContactEmailController } from "@/contact/infra/http/send-contact-email.controller.js"
import { CONTACT_TYPES } from "@/contact/infra/ioc/contact-types.js"

export const contactModule = new ContainerModule(({ bind }): void => {
	bind(CONTACT_TYPES.USE_CASES.SendContactEmail).to(SendContactEmailUseCase)
	bind(CONTACT_TYPES.CONTROLLERS.SendContactEmail).to(
		SendContactEmailController,
	)
})
