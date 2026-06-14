import { CONTACT_TYPES } from "@/contact/infra/ioc/contact-types.js"
import { type ModuleControllers, resolve } from "./server-build.js"

export function setupContactModule(): ModuleControllers {
	const controllers = [resolve(CONTACT_TYPES.CONTROLLERS.SendContactEmail)]
	return { controllers }
}
