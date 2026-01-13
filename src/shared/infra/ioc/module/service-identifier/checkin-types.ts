export const CHECKIN_TYPES = {
	Repositories: {
		CheckIn: Symbol.for("CheckInRepository"),
	},
	PG: {
		CheckIn: Symbol.for("PgCheckInRepository"),
	},
	UseCases: {
		CreateCheckIn: Symbol.for("CreateCheckInUseCase"),
		ValidateCheckIn: Symbol.for("ValidateCheckInUseCase"),
		FetchCheckIns: Symbol.for("FetchCheckInsUseCase"),
		CheckIn: Symbol.for("CheckInUseCase"),
		CheckInHistory: Symbol.for("CheckInHistoryUseCase"),
	},
	Controllers: {
		CheckIn: Symbol.for("CheckInController"),
		ValidateCheckIn: Symbol.for("ValidateCheckInController"),
	},
} as const
