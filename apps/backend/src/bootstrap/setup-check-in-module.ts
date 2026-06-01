import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

/**
 * Setup Check-in Module
 * Resolves and returns all check-in-related controllers
 */
export function setupCheckInModule(): ModuleControllers {
	const controllers = [
		resolve(CHECKIN_TYPES.Controllers.CheckIn),
		resolve(CHECKIN_TYPES.Controllers.ValidateCheckIn),
		resolve(CHECKIN_TYPES.Controllers.RejectCheckIn),
		resolve(CHECKIN_TYPES.Controllers.ListCheckIns),
		resolve(CHECKIN_TYPES.Controllers.MyCheckIns),
		resolve(CHECKIN_TYPES.Controllers.Metrics),
		resolve(CHECKIN_TYPES.Controllers.GetCheckInStats),
		resolve(CHECKIN_TYPES.Controllers.GetMyCheckInStats),
	]
	return { controllers }
}
