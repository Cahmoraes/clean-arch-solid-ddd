import "reflect-metadata"

import { join } from "node:path"
import { cwd } from "node:process"

import { config } from "dotenv"

config({
	path: join(cwd(), ".env"),
	override: true,
	quiet: true,
})
