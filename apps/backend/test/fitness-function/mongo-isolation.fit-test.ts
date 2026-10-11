import { execFile } from "node:child_process"
import { glob, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { afterEach, describe, expect, it } from "vitest"

// Known failures that exist before this feature and are out of scope here: two failing tests and one
// skipped test in the current fitness suite, and one failing test in test/contract/subscription.contract-test.ts
// (HTTP/OpenAPI contract, unrelated to the repository contracts). This file neither fixes nor hides them.

const execFileAsync = promisify(execFile)
const BACKEND_ROOT = path.resolve(import.meta.dirname, "..", "..")
const RULE_NAME = "no-domain-or-application-to-mongodb-driver"

interface DepcruiseViolation {
	rule: { name: string }
	from: string
	to: string
}

interface Cruise {
	violations: DepcruiseViolation[]
	totalCruised: number
}

function parseCruise(stdout: string): Cruise {
	const output: {
		summary: { violations: DepcruiseViolation[]; totalCruised: number }
	} = JSON.parse(stdout)
	return {
		violations: output.summary.violations.filter(
			(v) => v.rule.name === RULE_NAME,
		),
		totalCruised: output.summary.totalCruised,
	}
}

function hasStdout(error: unknown): error is Error & { stdout: string } {
	return (
		error instanceof Error &&
		"stdout" in error &&
		typeof error.stdout === "string" &&
		error.stdout.length > 0
	)
}

async function cruise(targets: string[]): Promise<Cruise> {
	const args = [
		"depcruise",
		"--validate",
		".dependency-cruiser.js",
		"--output-type",
		"json",
		...targets,
	]
	try {
		const { stdout } = await execFileAsync("npx", args, {
			cwd: BACKEND_ROOT,
			maxBuffer: 256 * 1024 * 1024,
		})
		return parseCruise(stdout)
	} catch (error) {
		// depcruise exits non-zero when it finds error-level violations; the report is still on stdout.
		if (hasStdout(error)) {
			return parseCruise(error.stdout)
		}
		throw error
	}
}

async function mongoViolations(
	targets: string[],
): Promise<DepcruiseViolation[]> {
	return (await cruise(targets)).violations
}

// depcruise 17.4.3 does not support TypeScript 7, so given a directory it finds no .ts files and
// reports "0 modules" (a false green). Explicit file paths are analyzed normally.
async function domainAndApplicationFiles(): Promise<string[]> {
	const files: string[] = []
	for (const layer of ["domain", "application"]) {
		for await (const file of glob(`src/*/${layer}/**/*.ts`, {
			cwd: BACKEND_ROOT,
		})) {
			files.push(file)
		}
	}
	return files.sort()
}

describe("mongodb driver isolation", () => {
	const fixtures: string[] = []

	async function writeFixture(
		relativePath: string,
		source: string,
	): Promise<string> {
		await writeFile(path.join(BACKEND_ROOT, relativePath), source)
		fixtures.push(relativePath)
		return relativePath
	}

	afterEach(async () => {
		await Promise.all(
			fixtures
				.splice(0)
				.map((relativePath) =>
					rm(path.join(BACKEND_ROOT, relativePath), { force: true }),
				),
		)
	})

	it("guard: depcruise analyzes the files it is given (a directory scan can silently cruise 0 modules)", async () => {
		const files = await domainAndApplicationFiles()

		const { totalCruised } = await cruise(files)

		expect(files.length).toBeGreaterThan(0)
		expect(totalCruised).toBeGreaterThan(0)
	}, 180_000)

	it("AC-11: no domain or application file in src imports the mongodb driver", async () => {
		const { violations, totalCruised } = await cruise(
			await domainAndApplicationFiles(),
		)

		expect(totalCruised).toBeGreaterThan(0)
		expect(violations).toEqual([])
	}, 180_000)

	it("AC-11: the sweep reports a domain file importing mongodb", async () => {
		const fixture = await writeFixture(
			"src/gym/domain/mongo-isolation-sweep-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		const { violations } = await cruise(await domainAndApplicationFiles())

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 180_000)

	it("AC-11: a domain file importing mongodb is reported", async () => {
		const fixture = await writeFixture(
			"src/gym/domain/mongo-isolation-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		const violations = await mongoViolations([fixture])

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 60_000)

	it("AC-11: an application file importing only mongodb types is reported", async () => {
		const fixture = await writeFixture(
			"src/gym/application/mongo-isolation-fixture.ts",
			'import type { ClientSession } from "mongodb"\nexport type Session = ClientSession\n',
		)

		const violations = await mongoViolations([fixture])

		expect(violations.map((violation) => violation.from)).toEqual([fixture])
	}, 60_000)

	it("FR-021: an infra file may import mongodb", async () => {
		const fixture = await writeFixture(
			"src/gym/infra/mongo-isolation-fixture.ts",
			'import { MongoClient } from "mongodb"\nexport const driver = MongoClient\n',
		)

		expect(await mongoViolations([fixture])).toEqual([])
	}, 60_000)
})
