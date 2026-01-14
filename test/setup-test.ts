import "reflect-metadata"

import { join } from "node:path"
import { cwd } from "node:process"

import { config } from "dotenv"

// Forcar NODE_ENV=test antes de carregar o .env
process.env.NODE_ENV = "test"

config({
	path: join(cwd(), ".env"),
	override: false, // Nao sobrescrever NODE_ENV definido acima
	quiet: true,
})
