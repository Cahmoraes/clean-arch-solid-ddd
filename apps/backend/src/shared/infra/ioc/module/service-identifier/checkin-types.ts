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
		RejectCheckIn: Symbol.for("RejectCheckInUseCase"),
		FetchCheckIns: Symbol.for("FetchCheckInsUseCase"),
		CheckIn: Symbol.for("CheckInUseCase"),
		CheckInHistory: Symbol.for("CheckInHistoryUseCase"),
		GetCheckInStats: Symbol.for("GetCheckInStatsUseCase"),
	},
	Controllers: {
		CheckIn: Symbol.for("CheckInController"),
		ValidateCheckIn: Symbol.for("ValidateCheckInController"),
		RejectCheckIn: Symbol.for("RejectCheckInController"),
		ListCheckIns: Symbol.for("ListCheckInsController"),
		MyCheckIns: Symbol.for("MyCheckInsController"),
		Metrics: Symbol.for("CheckInMetricsController"),
		GetCheckInStats: Symbol.for("GetCheckInStatsController"),
		GetMyCheckInStats: Symbol.for("GetMyCheckInStatsController"),
	},
} as const
