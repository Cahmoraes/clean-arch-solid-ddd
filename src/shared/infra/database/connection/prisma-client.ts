import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { env, isDevelopment } from "@/shared/infra/env"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
export const prismaClient = new PrismaClient({
	adapter,
	log: isDevelopment() ? ["query", "error"] : [],
})
