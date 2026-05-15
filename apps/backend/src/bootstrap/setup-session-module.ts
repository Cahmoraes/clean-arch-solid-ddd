import { AUTH_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

export function setupSessionModule(): ModuleControllers {
	const controllers = [
		resolve(AUTH_TYPES.Controllers.Authenticate),
		resolve(AUTH_TYPES.Controllers.AuthenticateWithGoogle),
		resolve(AUTH_TYPES.Controllers.DevGoogleToken),
		resolve(AUTH_TYPES.Controllers.Logout),
	]
	return { controllers }
}
