export const SHARED_TYPES = {
	Controllers: {
		Queue: Symbol.for("QueueController"),
	},
	Task: {
		UpdateUserProfileCache: Symbol.for("UpdateUserProfileCacheTask"),
	},
	Server: {
		Fastify: Symbol.for("FastifyServer"),
		RouteGuard: Symbol.for("RouteGuard"),
	},
	Prisma: {
		Client: Symbol.for("PrismaClient"),
		UnitOfWork: Symbol.for("PrismaUnitOfWork"),
	},
	PG: {
		Client: Symbol.for("PgClient"),
	},
	SQLite: {
		Client: Symbol.for("SQLite"),
		UnitOfWork: Symbol.for("SQLiteUnitOfWork"),
	},
	Tokens: {
		Auth: Symbol.for("AuthToken"),
	},
	Cookies: {
		Manager: Symbol.for("CookieManager"),
	},
	Factories: {
		PreHandlerAuthenticate: Symbol.for("PreHandlerAuthenticate"),
	},
	Logger: Symbol.for("Logger"),
	PinoLogger: Symbol.for("PinoLogger"),
	Queue: Symbol.for("Queue"),
	Mailer: Symbol.for("Mailer"),
	Redis: Symbol.for("Redis"),
	UnitOfWork: Symbol.for("UnitOfWork"),
	CronJob: Symbol.for("CronJob"),
	Worker: Symbol.for("Worker"),
} as const
