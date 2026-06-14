export const CONTACT_TYPES = {
	USE_CASES: {
		SendContactEmail: Symbol.for("CONTACT_TYPES.UseCases.SendContactEmail"),
	},
	CONTROLLERS: {
		SendContactEmail: Symbol.for("CONTACT_TYPES.Controllers.SendContactEmail"),
	},
} as const
