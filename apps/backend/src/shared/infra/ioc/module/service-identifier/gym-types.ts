export const GYM_TYPES = {
	Repositories: {
		Gym: Symbol.for("GymRepository"),
	},
	PG: {
		Gym: Symbol.for("PgGymRepository"),
	},
	UseCases: {
		CreateGym: Symbol.for("CreateGymUseCase"),
		UpdateGym: Symbol.for("UpdateGymUseCase"),
		DeleteGym: Symbol.for("DeleteGymUseCase"),
		SearchGym: Symbol.for("SearchGymUseCase"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymUseCase"),
		FetchAllGyms: Symbol.for("FetchAllGymsUseCase"),
		FetchGymById: Symbol.for("FetchGymByIdUseCase"),
		SetGymImage: Symbol.for("SetGymImageUseCase"),
	},
	Controllers: {
		CreateGym: Symbol.for("CreateGymController"),
		SearchGym: Symbol.for("SearchGymController"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymController"),
		FetchAllGyms: Symbol.for("FetchAllGymsController"),
		FetchGymById: Symbol.for("FetchGymByIdController"),
	},
	Services: {
		ImageProcessor: Symbol.for("ImageProcessor"),
		ImageStorage: Symbol.for("ImageStorage"),
	},
} as const
